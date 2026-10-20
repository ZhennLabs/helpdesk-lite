<?php

namespace App\Events;

use App\Models\RoomBooking;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoomBookingUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $bookingData;
    public string $action;
    public string $notification;

    public function __construct(RoomBooking $booking, string $action = 'created', string $notification = '', ?User $actor = null)
    {
        $this->action = $action;
        $this->notification = $notification ?: "Pemesanan ruangan {$booking->booking_number} ({$booking->title}) telah diperbarui.";

        $this->bookingData = [
            'id' => (int) $booking->id,
            'booking_number' => $booking->booking_number,
            'title' => $booking->title,
            'room_name' => $booking->room?->name,
            'booking_date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
            'start_time' => substr($booking->start_time, 0, 5),
            'end_time' => substr($booking->end_time, 0, 5),
            'status' => $booking->status,
            'booker_name' => $booking->booker_name,
            'booker_unit' => $booking->booker_unit,
            'action' => $action,
            'actor_name' => $actor ? $actor->name : 'Sistem',
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room-bookings'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'RoomBookingUpdated';
    }
}
