<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $ticketData;
    public string $action;
    public string $notification;

    public function __construct(Ticket $ticket, string $action = 'updated', string $notification = '', ?User $actor = null)
    {
        $this->action = $action;
        $this->notification = $notification ?: "Tiket {$ticket->ticket_number} telah diperbarui.";

        $this->ticketData = [
            'id' => (int) $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
            'action' => $action,
            'actor_name' => $actor ? $actor->name : 'Sistem',
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('ticket.' . $this->ticketData['id']),
            new Channel('dashboard-tickets'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'TicketUpdated';
    }
}
