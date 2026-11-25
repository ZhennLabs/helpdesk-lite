<?php

namespace App\Http\Controllers;

use App\Events\TicketMessageSent;
use App\Events\TicketUpdated;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketMessage;
use App\Models\TicketUrgency;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class TicketController extends Controller
{
    // dashboard tiket user
    public function index(Request $request): Response
    {
        $user = Auth::user();

        $query = Ticket::where('user_id', $user->id)
            ->with([
                'category:id,name,icon,description',
                'urgency:id,name,color,level,sla_hours',
                'assignedTo:id,name,avatar_url',
                'resolvedBy:id,name,avatar_url',
                'messages' => function ($q) {
                    $q->with('user:id,name,role,avatar_url')->orderBy('created_at', 'asc');
                },
            ])
            ->latest('updated_at');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('urgency_id')) {
            $query->where('urgency_id', $request->urgency_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
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

        // hitung statistik tiket user sekaligus dalam 1 query biar enteng
        $statsRow = Ticket::where('user_id', $user->id)
            ->selectRaw("
                count(*) as total,
                sum(case when status = 'open' then 1 else 0 end) as open_count,
                sum(case when status = 'in_progress' then 1 else 0 end) as in_progress_count,
                sum(case when status in ('resolved', 'closed') then 1 else 0 end) as resolved_count
            ")->first();

        $stats = [
            'total' => (int) ($statsRow->total ?? 0),
            'open' => (int) ($statsRow->open_count ?? 0),
            'in_progress' => (int) ($statsRow->in_progress_count ?? 0),
            'resolved' => (int) ($statsRow->resolved_count ?? 0),
        ];

        // master data di-cache singkat sebagai array murni agar aman diserialisasi
        $categories = Cache::remember('active_ticket_categories_v3', 60, fn () => 
            TicketCategory::where('is_active', true)->orderBy('order_index')->get(['id', 'name', 'icon', 'description'])->toArray()
        );
        $urgencies = Cache::remember('active_ticket_urgencies_v3', 60, fn () => 
            TicketUrgency::where('is_active', true)->orderBy('order_index')->get(['id', 'name', 'color', 'level', 'sla_hours', 'description'])->toArray()
        );
        $units = Cache::remember('active_units_tree_v3', 60, fn () => 
            Unit::with(['subUnits' => fn ($q) => $q->where('is_active', true)->orderBy('name', 'asc')])
                ->where('is_active', true)->orderBy('name', 'asc')->get(['id', 'name', 'source'])->toArray()
        );

        return Inertia::render('Helpdesk/User/Dashboard', [
            'tickets' => $tickets->values()->all(),
            'stats' => $stats,
            'categories' => is_array($categories) ? $categories : [],
            'urgencies' => is_array($urgencies) ? $urgencies : [],
            'units' => is_array($units) ? $units : [],
            'filters' => $request->only(['status', 'category_id', 'urgency_id', 'search']),
        ]);
    }

    // buat tiket baru
    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $request->validate([
            'subject' => 'required|string|max:255',
            'category_id' => 'required|exists:ticket_categories,id',
            'urgency_id' => 'required|exists:ticket_urgencies,id',
            'unit' => 'nullable|string|max:100',
            'sub_unit' => 'nullable|string|max:100',
            'description' => 'required|string',
            'attachments.*' => 'nullable|file|mimes:jpeg,jpg,png,gif,webp,pdf,doc,docx,xls,xlsx,zip|max:10240',
        ]);

        $attachments = [];
        if ($request->hasFile('attachments')) {
            // blokir ekstensi bahaya biar aman dari script nakal
            $blockedExtensions = ['php', 'phtml', 'exe', 'sh', 'bat', 'cmd', 'js', 'vbs', 'html', 'htm'];

            foreach ($request->file('attachments') as $file) {
                $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
                if (in_array($ext, $blockedExtensions, true)) {
                    continue;
                }

                $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
                $cleanName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $originalName);
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

        $reporterUnit = $request->filled('unit') ? trim($request->unit) : ($user->unit ?: '-');
        $reporterSubUnit = $request->filled('sub_unit') ? trim($request->sub_unit) : ($user->sub_unit ?: '-');

        $ticket = Ticket::create([
            'ticket_number' => Ticket::generateTicketNumber(),
            'user_id' => $user->id,
            'reporter_name' => $user->name,
            'reporter_email' => $user->email,
            'reporter_unit' => $reporterUnit,
            'reporter_sub_unit' => $reporterSubUnit,
            'category_id' => $request->category_id,
            'urgency_id' => $request->urgency_id,
            'subject' => $request->subject,
            'description' => $request->description,
            'attachments' => !empty($attachments) ? $attachments : null,
            'status' => 'open',
        ]);

        $initialMsg = TicketMessage::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'message' => $request->description,
            'attachments' => !empty($attachments) ? $attachments : null,
        ]);

        // bersihin cache sla admin biar update
        Cache::forget('admin_sla_alerts_summary');

        broadcast(new TicketUpdated($ticket, 'created', "Tiket baru diajukan: {$ticket->ticket_number} - {$ticket->subject}", $user));
        broadcast(new TicketMessageSent($ticket, $initialMsg));

        return redirect()->back()->with('success', 'Tiket ' . $ticket->ticket_number . ' berhasil dibuat!');
    }

    // balas percakapan tiket
    public function reply(Request $request, Ticket $ticket): RedirectResponse
    {
        $user = Auth::user();

        // proteksi: cuma pemilik tiket atau admin yang boleh balas
        if ($ticket->user_id !== $user->id && !$user->isAdmin()) {
            abort(403, 'Akses tidak diizinkan');
        }

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
            'user_id' => $user->id,
            'message' => $request->message,
            'attachments' => !empty($attachments) ? $attachments : null,
        ]);

        $ticket->touch();

        broadcast(new TicketMessageSent($ticket, $msg));
        broadcast(new TicketUpdated(
            $ticket,
            'new_message',
            "Tanggapan baru pada tiket {$ticket->ticket_number} dari " . $user->name,
            $user
        ));

        return redirect()->back()->with('success', 'Pesan tanggapan berhasil dikirim.');
    }
}

