<?php

namespace App\Http\Middleware;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'appName' => config('app.name', 'Helpdesk Lite'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'unit' => $user->unit,
                    'sub_unit' => $user->sub_unit,
                    'role' => $user->role,
                    'avatar_url' => $user->avatar_url,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'status' => fn () => $request->session()->get('status'),
            ],
            
            'slaAlerts' => function () use ($user) {
                if (!$user || $user->role !== 'admin') {
                    return [
                        'urgent_count' => 0,
                        'overdue_count' => 0,
                        'near_count' => 0,
                        'tickets' => [],
                    ];
                }

                return Cache::remember('admin_sla_alerts_summary', 60, function () {
                    $activeTickets = Ticket::whereIn('status', ['open', 'in_progress'])
                        ->select(['id', 'ticket_number', 'subject', 'reporter_name', 'reporter_unit', 'status', 'urgency_id', 'created_at', 'updated_at', 'resolved_at'])
                        ->with('urgency:id,name,color,level,sla_hours')
                        ->latest('updated_at')
                        ->get();

                    $urgentList = [];
                    foreach ($activeTickets as $t) {
                        $sla = $t->getSlaInfo();
                        if ($sla['is_near_deadline'] || $sla['is_overdue']) {
                            $urgentList[] = [
                                'id' => $t->id,
                                'ticket_number' => $t->ticket_number,
                                'subject' => $t->subject,
                                'reporter_name' => $t->reporter_name,
                                'reporter_unit' => $t->reporter_unit ?: '-',
                                'status' => $t->status,
                                'sla' => $sla,
                            ];
                        }
                    }

                    usort($urgentList, fn ($a, $b) => $a['sla']['remaining_minutes'] <=> $b['sla']['remaining_minutes']);

                    return [
                        'urgent_count' => count($urgentList),
                        'overdue_count' => count(array_filter($urgentList, fn ($x) => $x['sla']['is_overdue'])),
                        'near_count' => count(array_filter($urgentList, fn ($x) => $x['sla']['is_near_deadline'])),
                        'tickets' => array_slice($urgentList, 0, 10),
                    ];
                });
            },
        ];
    }
}
