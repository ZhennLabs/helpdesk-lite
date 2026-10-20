<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketUrgency extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'level',
        'color',
        'sla_hours',
        'description',
        'is_active',
        'order_index',
    ];

    protected $casts = [
        'level' => 'integer',
        'sla_hours' => 'integer',
        'is_active' => 'boolean',
        'order_index' => 'integer',
    ];

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'urgency_id');
    }
}