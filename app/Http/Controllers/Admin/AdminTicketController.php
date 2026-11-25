<?php

namespace App\Http\Controllers\Admin;

use App\Events\TicketMessageSent;
use App\Events\TicketUpdated;
use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketMessage;
use App\Models\TicketUrgency;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\SimpleExcel\SimpleExcelWriter;

class AdminTicketController extends Controller
{

    public function index(Request $request): Response
    {
        $query = Ticket::with([
            'category:id,name,icon,description',
            'urgency:id,name,color,level,sla_hours',
            'assignedTo:id,name,avatar_url',
            'resolvedBy:id,name,avatar_url',
            'messages' => function ($q) {
                $q->with('user:id,name,role,avatar_url')->orderBy('created_at', 'asc');
            },
        ])->latest('created_at');

        if ($request->filled('status')) {
            if ($request->status === 'resolved') {
                $query->whereIn('status', ['resolved', 'closed']);
            } elseif ($request->status === 'history') {

            } elseif ($request->status === 'sla_urgent') {
                $query->whereIn('status', ['open', 'in_progress']);
            } elseif (in_array($request->status, ['open', 'in_progress', 'closed'])) {
                $query->where('status', $request->status);
            } else {
                $query->whereIn('status', ['open', 'in_progress']);
            }
        } else {

            $query->whereIn('status', ['open', 'in_progress']);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('urgency_id')) {
            $query->where('urgency_id', $request->urgency_id);
        }

        if ($request->filled('unit')) {
            $query->where('reporter_unit', $request->unit);
        }

        if ($request->filled('search')) {
            $search = addcslashes($request->search, '%_\\');
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
                  ->orWhere('reporter_name', 'like', "%{$search}%")
                  ->orWhere('reporter_unit', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $tickets = $query->get()->map(function ($t) {
            $lastMsg = $t->messages->last();
            return [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'subject' => $t->subject,
                'description' => $t->description,
                'status' => $t->status,
                'category' => $t->category ? [
                    'id' => $t->category->id,
                    'name' => $t->category->name,
                    'icon' => $t->category->icon,
                ] : null,
                'urgency' => $t->urgency ? [
                    'id' => $t->urgency->id,
                    'name' => $t->urgency->name,
                    'color' => $t->urgency->color,
                    'level' => $t->urgency->level,
                    'sla_hours' => $t->urgency->sla_hours,
                ] : null,
                'sla' => $t->getSlaInfo(),
                'assigned_to' => $t->assignedTo ? [
                    'id' => $t->assignedTo->id,
                    'name' => $t->assignedTo->name,
                    'avatar_url' => $t->assignedTo->avatar_url,
                ] : null,
                'resolved_by' => $t->resolvedBy ? [
                    'id' => $t->resolvedBy->id,
                    'name' => $t->resolvedBy->name,
                    'avatar_url' => $t->resolvedBy->avatar_url,
                ] : null,
                'reporter' => [
                    'name' => $t->reporter_name,
                    'email' => $t->reporter_email,
                    'unit' => $t->reporter_unit ?: '-',
                    'sub_unit' => $t->reporter_sub_unit ?: '-',
                ],
                'attachments' => is_array($t->attachments) ? $t->attachments : [],
                'created_at' => $t->created_at->translatedFormat('d M Y, H:i'),
                'created_at_human' => $t->created_at->diffForHumans(),
                'updated_at_human' => $t->updated_at->diffForHumans(),
                'resolved_at' => $t->resolved_at?->translatedFormat('d M Y, H:i'),
                'last_message' => $lastMsg ? [
                    'message' => $lastMsg->message,
                    'sender' => $lastMsg->user ? $lastMsg->user->name : 'System',
                    'time' => $lastMsg->created_at->diffForHumans(),
                ] : null,
                'messages' => $t->messages->map(fn ($m) => [
                    'id' => $m->id,
                    'user_id' => $m->user_id,
                    'user_name' => $m->user ? $m->user->name : 'Petugas',
                    'user_role' => $m->user ? $m->user->role : 'admin',
                    'avatar_url' => $m->user ? $m->user->avatar_url : null,
                    'message' => $m->message,
                    'attachments' => is_array($m->attachments) ? $m->attachments : [],
                    'time' => $m->created_at->translatedFormat('d M Y, H:i'),
                    'is_me' => $m->user_id === Auth::id(),
                ]),
            ];
        });

        if ($request->status === 'sla_urgent') {
            $tickets = $tickets->filter(function ($t) {
                return !empty($t['sla']['is_near_deadline']) || !empty($t['sla']['is_overdue']);
            })->values();
        }

        $statsRow = Ticket::selectRaw("
            count(*) as total,
            sum(case when status = 'open' then 1 else 0 end) as open_count,
            sum(case when status = 'in_progress' then 1 else 0 end) as in_progress_count,
            sum(case when status in ('resolved', 'closed') then 1 else 0 end) as resolved_count
        ")->first();

        $activeTicketsForSla = Ticket::whereIn('status', ['open', 'in_progress'])
            ->select(['id', 'status', 'urgency_id', 'created_at', 'resolved_at'])
            ->with('urgency:id,name,color,level,sla_hours')
            ->get();

        $slaUrgentCount = 0;
        foreach ($activeTicketsForSla as $at) {
            $sla = $at->getSlaInfo();
            if ($sla['is_near_deadline'] || $sla['is_overdue']) {
                $slaUrgentCount++;
            }
        }

        $stats = [
            'total' => (int) ($statsRow->total ?? 0),
            'open' => (int) ($statsRow->open_count ?? 0),
            'in_progress' => (int) ($statsRow->in_progress_count ?? 0),
            'resolved' => (int) ($statsRow->resolved_count ?? 0),
            'sla_urgent' => $slaUrgentCount,
        ];

        $categories = Cache::remember('active_ticket_categories_v3', 60, fn () =>
            TicketCategory::where('is_active', true)->orderBy('order_index')->get(['id', 'name', 'icon'])->toArray()
        );
        $urgencies = Cache::remember('active_ticket_urgencies_v3', 60, fn () =>
            TicketUrgency::where('is_active', true)->orderBy('order_index')->get(['id', 'name', 'color', 'level', 'sla_hours'])->toArray()
        );
        $units = Cache::remember('all_ticket_units_v3', 60, fn () =>
            Ticket::distinct()->whereNotNull('reporter_unit')->where('reporter_unit', '!=', '')->orderBy('reporter_unit')->pluck('reporter_unit')->toArray()
        );
        $admins = Cache::remember('active_admins_list_v3', 60, fn () =>
            User::where('role', 'admin')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'avatar_url'])->toArray()
        );

        // data grafik bulanan & distribusi kategori
        $selectedYear = (int) ($request->input('year') ?: now()->year);
        $yearTickets = Ticket::whereYear('created_at', $selectedYear)
            ->get(['id', 'status', 'created_at', 'resolved_at']);

        $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $monthlyChart = [];
        for ($m = 1; $m <= 12; $m++) {
            $masuk = $yearTickets->filter(fn ($t) => $t->created_at && (int) $t->created_at->month === $m)->count();
            $selesai = $yearTickets->filter(function ($t) use ($m) {
                if (!in_array($t->status, ['resolved', 'closed'], true)) {
                    return false;
                }
                $refDate = $t->resolved_at ?: $t->created_at;
                return $refDate && (int) $refDate->month === $m;
            })->count();

            $monthlyChart[] = [
                'month' => $monthNames[$m - 1],
                'masuk' => $masuk,
                'selesai' => $selesai,
            ];
        }

        $categoryDistribution = TicketCategory::where('is_active', true)
            ->withCount('tickets')
            ->orderByDesc('tickets_count')
            ->get(['id', 'name'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'count' => (int) $c->tickets_count,
            ])
            ->values()
            ->all();

        $availableYears = Ticket::selectRaw('YEAR(created_at) as yr')
            ->distinct()
            ->pluck('yr')
            ->filter()
            ->map(fn ($y) => (int) $y)
            ->push((int) now()->year)
            ->unique()
            ->sortDesc()
            ->values()
            ->all();

        return Inertia::render('Helpdesk/Admin/Dashboard', [
            'tickets' => $tickets->values()->all(),
            'stats' => $stats,
            'categories' => is_array($categories) ? $categories : [],
            'urgencies' => is_array($urgencies) ? $urgencies : [],
            'units' => is_array($units) ? $units : [],
            'admins' => is_array($admins) ? $admins : [],
            'monthly_chart' => $monthlyChart,
            'category_distribution' => $categoryDistribution,
            'available_years' => $availableYears,
            'selected_year' => $selectedYear,
            'filters' => $request->only(['status', 'category_id', 'urgency_id', 'unit', 'search', 'year']),
        ]);
    }

    // siapkan data log aktivitas dan statistiknya
    private function buildLogsData(): array
    {
        $messages = TicketMessage::with([
            'ticket:id,ticket_number,subject,reporter_unit,reporter_sub_unit,category_id',
            'ticket.category:id,name',
            'user:id,name,role,avatar_url',
        ])->latest('created_at')->take(500)->get();

        $todayCount = 0;
        $statusCount = 0;
        $assignCount = 0;
        $messageCount = 0;

        $logs = $messages->map(function ($msg) use (&$todayCount, &$statusCount, &$assignCount, &$messageCount) {
            $text = (string) $msg->message;
            $lower = strtolower($text);

            if (str_starts_with($text, '[Update Status:')) {
                $type = 'status';
                $typeLabel = 'Pembaruan Status';
                $statusCount++;
            } elseif (str_contains($lower, 'ditugaskan') || str_contains($lower, 'penugasan')) {
                $type = 'assign';
                $typeLabel = 'Penugasan Petugas';
                $assignCount++;
            } else {
                $type = 'message';
                $typeLabel = 'Tanggapan Pesan';
                $messageCount++;
            }

            if ($msg->created_at?->isToday()) {
                $todayCount++;
            }

            return [
                'id' => $msg->id,
                'type' => $type,
                'type_label' => $typeLabel,
                'message' => $text,
                'attachments' => $msg->attachments ?? [],
                'created_at' => $msg->created_at?->translatedFormat('d M Y, H:i') ?? '-',
                'created_date' => $msg->created_at?->format('Y-m-d') ?? '',
                'created_at_human' => $msg->created_at?->diffForHumans() ?? '-',
                'timestamp' => $msg->created_at?->timestamp ?? 0,
                'ticket_number' => $msg->ticket?->ticket_number ?? '-',
                'ticket_subject' => $msg->ticket?->subject ?? '-',
                'ticket_unit' => $msg->ticket?->reporter_unit ?? '-',
                'ticket_sub_unit' => $msg->ticket?->reporter_sub_unit ?? '-',
                'category' => $msg->ticket?->category ? ['name' => $msg->ticket->category->name] : null,
                'user' => $msg->user ? [
                    'name' => $msg->user->name,
                    'role' => $msg->user->role,
                    'avatar_url' => $msg->user->avatar_url,
                ] : null,
            ];
        })->values();

        return [
            'logs' => $logs,
            'stats' => [
                'total' => $logs->count(),
                'today' => $todayCount,
                'status_changes' => $statusCount,
                'assignments' => $assignCount,
                'messages' => $messageCount,
            ],
        ];
    }

    public function logs(Request $request): Response
    {
        $data = $this->buildLogsData();

        return Inertia::render('Admin/Logs', [
            'logs' => $data['logs'],
            'stats' => $data['stats'],
            'filters' => $request->only(['type']),
        ]);
    }

    public function exportLogs(Request $request)
    {
        $logs = $this->buildLogsData()['logs'];

        $filtered = $logs->filter(function ($row) use ($request) {
            if ($request->filled('type') && $request->type !== 'all' && $row['type'] !== $request->type) {
                return false;
            }
            if ($request->filled('unit') && $row['ticket_unit'] !== $request->unit) {
                return false;
            }
            if ($request->filled('category') && ($row['category']['name'] ?? '') !== $request->category) {
                return false;
            }
            if ($request->filled('role') && ($row['user']['role'] ?? '') !== $request->role) {
                return false;
            }
            if ($request->filled('date_from') && $row['created_date'] < $request->date_from) {
                return false;
            }
            if ($request->filled('date_to') && $row['created_date'] > $request->date_to) {
                return false;
            }
            return true;
        });

        $writer = SimpleExcelWriter::streamDownload('log-aktivitas-' . now()->format('Y-m-d') . '.xlsx');

        foreach ($filtered as $row) {
            $writer->addRow([
                'Waktu' => $row['created_at'],
                'No. Tiket' => $row['ticket_number'],
                'Subjek Tiket' => $row['ticket_subject'],
                'Kategori' => $row['category']['name'] ?? '-',
                'Pelaku' => $row['user']['name'] ?? 'Sistem',
                'Peran' => ($row['user']['role'] ?? '') === 'admin' ? 'Admin' : 'Pengguna',
                'Tipe Log' => $row['type_label'],
                'Unit Kerja' => $row['ticket_unit'],
                'Sub Unit' => $row['ticket_sub_unit'],
                'Isi Catatan' => $row['message'],
            ]);
        }

        return $writer->toBrowser();
    }

    public function updateStatus(Request $request, Ticket $ticket): RedirectResponse
    {
        $request->validate([
            'status' => 'required|in:open,in_progress,resolved,closed',
            'assigned_to' => 'nullable|exists:users,id',
            'admin_note' => 'nullable|string',
        ]);

        $oldStatus = $ticket->status;
        $newStatus = $request->status;

        $updateData = ['status' => $newStatus];

        if ($request->has('assigned_to')) {
            $updateData['assigned_to'] = $request->assigned_to;
        }

        if ($newStatus === 'resolved' && !$ticket->resolved_at) {
            $updateData['resolved_at'] = now();
            $updateData['resolved_by'] = Auth::id();
        }

        if ($newStatus === 'closed' && !$ticket->closed_at) {
            $updateData['closed_at'] = now();
        }

        $ticket->update($updateData);

        if ($request->filled('admin_note')) {
            TicketMessage::create([
                'ticket_id' => $ticket->id,
                'user_id' => Auth::id(),
                'message' => '[Update Status: ' . strtoupper($newStatus) . '] ' . $request->admin_note,
                'is_internal' => false,
            ]);
        }

        Cache::forget('admin_sla_alerts_summary');

        broadcast(new TicketUpdated(
            $ticket,
            'status_changed',
            "Status tiket {$ticket->ticket_number} diubah menjadi: " . strtoupper($newStatus),
            Auth::user()
        ));

        return redirect()->back()->with('success', "Status tiket {$ticket->ticket_number} berhasil diperbarui.");
    }

    public function reply(Request $request, Ticket $ticket): RedirectResponse
    {
        $request->validate([
            'message' => 'required|string',
            'attachments.*' => 'nullable|file|mimes:jpeg,jpg,png,gif,webp,pdf,doc,docx,xls,xlsx,zip|max:10240',
        ]);

        $attachments = [];
        if ($request->hasFile('attachments')) {
            $blockedExtensions = ['php', 'phtml', 'exe', 'sh', 'bat', 'cmd', 'js', 'vbs', 'html', 'htm'];

            foreach ($request->file('attachments') as $file) {
                $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
                if (in_array($ext, $blockedExtensions, true)) {
                    continue;
                }

                $cleanName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
                $cleanName = trim(preg_replace('/_+/', '_', $cleanName), '_');
                $filename = time() . '_' . substr(uniqid(), -4) . '_' . ($cleanName ?: 'lampiran') . '.' . $ext;

                $file->storeAs('attachments', $filename, 'public');
                $attachments[] = [
                    'name' => $file->getClientOriginalName(),
                    'url' => '/storage/attachments/' . $filename,
                    'size' => $file->getSize(),
                    'type' => $ext,
                ];
            }
        }

        $msg = TicketMessage::create([
            'ticket_id' => $ticket->id,
            'user_id' => Auth::id(),
            'message' => $request->message,
            'attachments' => !empty($attachments) ? $attachments : null,
        ]);

        if ($ticket->status === 'open') {
            $ticket->update(['status' => 'in_progress']);
        } else {
            $ticket->touch();
        }

        broadcast(new TicketMessageSent($ticket, $msg));
        broadcast(new TicketUpdated(
            $ticket,
            'admin_reply',
            "Petugas membalas tiket {$ticket->ticket_number}",
            Auth::user()
        ));

        return redirect()->back()->with('success', 'Balasan berhasil dikirim.');
    }
}

