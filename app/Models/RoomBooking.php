<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_number',
        'room_id',
        'user_id',
        'booker_name',
        'booker_unit',
        'booker_phone',
        'title',
        'description',
        'participants_count',
        'booking_date',
        'start_time',
        'end_time',
        'extra_facilities',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'admin_notes',
    ];

    protected $casts = [
        'booking_date' => 'date:Y-m-d',
        'extra_facilities' => 'array',
        'approved_at' => 'datetime',
        'participants_count' => 'integer',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Generate unique booking code: BK-YYYYMMDD-XXXX
     */
    public static function generateBookingNumber(): string
    {
        $datePrefix = 'BK-' . date('Ymd');
        $countToday = self::whereDate('created_at', today())->count();
        return sprintf('%s-%04d', $datePrefix, $countToday + 1);
    }

    /**
     * Cari pemesanan yang bertabrakan waktu
     */
    public static function findConflict(int $roomId, string $date, string $startTime, string $endTime, ?int $excludeBookingId = null): ?self
    {
        $query = self::where('room_id', $roomId)
            ->where('booking_date', $date)
            ->whereIn('status', ['pending', 'approved', 'in_use'])
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where('start_time', '<', $endTime)
                  ->where('end_time', '>', $startTime);
            });

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query->with('room')->first();
    }
}
