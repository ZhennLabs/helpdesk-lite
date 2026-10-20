<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'user_id',
        'reporter_name',
        'reporter_email',
        'reporter_unit',
        'reporter_sub_unit',
        'category_id',
        'urgency_id',
        'subject',
        'description',
        'attachments',
        'status',
        'assigned_to',
        'resolved_by',
        'resolved_at',
        'closed_at',
    ];

    protected $casts = [
        'attachments' => 'array',
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function category()
    {
        return $this->belongsTo(TicketCategory::class, 'category_id');
    }

    public function urgency()
    {
        return $this->belongsTo(TicketUrgency::class, 'urgency_id');
    }

    public function messages()
    {
        return $this->hasMany(TicketMessage::class, 'ticket_id')->orderBy('created_at', 'asc');
    }

    /**
     * Generate unique ticket number TCK-YYYYMM-XXX
     */
    public static function generateTicketNumber(): string
    {
        $prefix = 'TCK-' . date('Ym') . '-';
        $latest = static::where('ticket_number', 'like', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();

        if (!$latest) {
            return $prefix . '001';
        }

        $seq = (int) substr($latest->ticket_number, strlen($prefix));
        return $prefix . str_pad($seq + 1, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Hitung kalkulasi waktu & status SLA tiket secara dinamis
     */
    public function getSlaInfo(): array
    {
        $slaHours = (int) ($this->urgency?->sla_hours ?: 24);
        $createdAt = $this->created_at ?: now();
        $deadline = $createdAt->copy()->addHours($slaHours);
        $now = now();

        $isActive = in_array($this->status, ['open', 'in_progress']);

        if (!$isActive) {
            // Tiket sudah selesai (resolved / closed)
            $completedAt = $this->resolved_at ?: $this->closed_at ?: $this->updated_at ?: $now;
            $isMet = $completedAt <= $deadline;
            $diffMinutes = abs($completedAt->diffInMinutes($deadline));
            $diffHours = round($diffMinutes / 60, 1);

            return [
                'target_hours' => $slaHours,
                'deadline_at' => $deadline->translatedFormat('d M Y, H:i'),
                'deadline_timestamp' => $deadline->timestamp,
                'is_active' => false,
                'status' => $isMet ? 'met' : 'breached',
                'status_label' => $isMet ? 'Sesuai SLA' : "Terlambat +{$diffHours}j",
                'remaining_minutes' => 0,
                'is_near_deadline' => false,
                'is_overdue' => !$isMet,
                'badge_color' => $isMet ? 'emerald' : 'rose',
            ];
        }

        // Tiket masih aktif (open atau in_progress)
        $diffMinutes = (int) $now->diffInMinutes($deadline, false);
        $isOverdue = $diffMinutes < 0;

        // Mendekati batas waktu jika sisa waktu <= 25% dari total jam SLA atau <= 120 menit
        $thresholdMinutes = min(180, max(30, (int) ($slaHours * 60 * 0.25)));
        $isNearDeadline = !$isOverdue && ($diffMinutes <= $thresholdMinutes);

        if ($isOverdue) {
            $overdueMins = abs($diffMinutes);
            $hours = floor($overdueMins / 60);
            $mins = $overdueMins % 60;
            $timeText = $hours > 0 ? "{$hours}j {$mins}m" : "{$mins}m";

            return [
                'target_hours' => $slaHours,
                'deadline_at' => $deadline->translatedFormat('d M Y, H:i'),
                'deadline_timestamp' => $deadline->timestamp,
                'is_active' => true,
                'status' => 'overdue',
                'status_label' => "Terlewati +{$timeText}",
                'remaining_minutes' => $diffMinutes,
                'is_near_deadline' => false,
                'is_overdue' => true,
                'badge_color' => 'rose',
            ];
        }

        $hours = floor($diffMinutes / 60);
        $mins = $diffMinutes % 60;
        $remainingText = $hours > 0 ? "{$hours}j {$mins}m" : "{$mins}m";

        return [
            'target_hours' => $slaHours,
            'deadline_at' => $deadline->translatedFormat('d M Y, H:i'),
            'deadline_timestamp' => $deadline->timestamp,
            'is_active' => true,
            'status' => $isNearDeadline ? 'near_deadline' : 'on_track',
            'status_label' => $isNearDeadline ? "Segera: Sisa {$remainingText}" : "Sisa {$remainingText}",
            'remaining_minutes' => $diffMinutes,
            'is_near_deadline' => $isNearDeadline,
            'is_overdue' => false,
            'badge_color' => $isNearDeadline ? 'amber' : 'emerald',
        ];
    }
}