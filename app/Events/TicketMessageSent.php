<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;
    public int $ticketId;

    public function __construct(Ticket $ticket, TicketMessage $ticketMessage)
    {
        $this->ticketId = (int) $ticket->id;
        $ticketMessage->load('user');

        $this->message = [
            'id' => (int) $ticketMessage->id,
            'ticket_id' => (int) $ticket->id,
            'user_id' => (int) $ticketMessage->user_id,
            'user_name' => $ticketMessage->user ? $ticketMessage->user->name : 'Pengguna',
            'user_role' => $ticketMessage->user ? $ticketMessage->user->role : 'user',
            'avatar_url' => $ticketMessage->user ? $ticketMessage->user->avatar_url : null,
            'message' => $ticketMessage->message,
            'attachments' => is_array($ticketMessage->attachments) ? $ticketMessage->attachments : [],
            'time' => $ticketMessage->created_at->translatedFormat('d M Y, H:i'),
            'created_at_human' => $ticketMessage->created_at->diffForHumans(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('ticket.' . $this->ticketId),
            new Channel('dashboard-tickets'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'TicketMessageSent';
    }
}
