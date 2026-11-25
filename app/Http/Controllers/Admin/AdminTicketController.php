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

class AdminTicketController extends Controller
{
    // dashboard kelola tiket admin
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
        ])->latest('updated_at');

        if ($request->filled('status')) {
            if ($request->status === 'resolved') {
                $query->whereIn('status', ['resolved', 'closed']);
            } elseif ($request->status === 'history') {
                // riwayat semua tiket
            } elseif ($request->status === 'sla_urgent') {
                $query->whereIn('status', ['open', 'in_progress']);
            } elseif (in_array($request->status, ['open', 'in_progress', 'closed'])) {
                $query->where('status', $request->status);
            } else {
                $query->whereIn('status', ['open', 'in_progress']);
            }
        } else {
            // default antrean aktif
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
            $search = $request->search;
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

        // hitung statistik antrean admin dalam 1 query ringkas
        $statsRow = Ticket::selectRaw("
            count(*) as total,
            sum(case when status = 'open' then 1 else 0 end) as open_count,
            sum(case when status = 'in_progress' then 1 else 0 end) as in_progress_count,
            sum(case when status in ('resolved', 'closed') then 1 else 0 end) as resolved_count
        ")->first();

        $activeTicketsForSla = Ticket::whereIn('status', ['open', 'in_progress'])
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

        // master data di-cache singkat sebagai array murni
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

        return Inertia::render('Helpdesk/Admin/Dashboard', [
            'tickets' => $tickets->values()->all(),
            'stats' => $stats,
            'categories' => is_array($categories) ? $categories : [],
            'urgencies' => is_array($urgencies) ? $urgencies : [],
            'units' => is_array($units) ? $units : [],
            'admins' => is_array($admins) ? $admins : [],
            'filters' => $request->only(['status', 'category_id', 'urgency_id', 'unit', 'search']),
        ]);
    }

    // log & riwayat tiket
    public function logs(Request $request): Response
    {
        $query = Ticket::with([
            'category:id,name,icon',
            'urgency:id,name,color,level',
            'assignedTo:id,name',
            'resolvedBy:id,name',
        ])->latest('created_at');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
                  ->orWhere('reporter_name', 'like', "%{$search}%")
                  ->orWhere('reporter_unit', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate(25)->through(fn ($t) => [
            'id' => $t->id,
            'ticket_number' => $t->ticket_number,
            'subject' => $t->subject,
            'reporter' => $t->reporter_name . ' (' . ($t->reporter_unit ?: '-') . ')',
            'category' => $t->category?->name,
            'urgency' => $t->urgency?->name,
            'status' => $t->status,
            'assigned_to' => $t->assignedTo?->name ?: '-',
            'resolved_by' => $t->resolvedBy?->name ?: '-',
            'created_at' => $t->created_at->translatedFormat('d M Y, H:i'),
            'resolved_at' => $t->resolved_at?->translatedFormat('d M Y, H:i') ?: '-',
        ]);

        return Inertia::render('Helpdesk/Admin/Logs', [
            'logs' => $logs,
            'filters' => $request->only(['status', 'category_id', 'date_from', 'date_to', 'search']),
        ]);
    }

    // perbarui status tiket
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

        // bersihin cache sla summary
        Cache::forget('admin_sla_alerts_summary');

        broadcast(new TicketUpdated(
            $ticket,
            'status_changed',
            "Status tiket {$ticket->ticket_number} diubah menjadi: " . strtoupper($newStatus),
            Auth::user()
        ));

        return redirect()->back()->with('success', "Status tiket {$ticket->ticket_number} berhasil diperbarui.");
    }

    // balas tiket dari admin
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

