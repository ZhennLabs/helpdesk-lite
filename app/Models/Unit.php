<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    protected $fillable = [
        'rsam_unit_id',
        'name',
        'description',
        'is_active',
        'source',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function subUnits()
    {
        return $this->hasMany(SubUnit::class, 'unit_id')->orderBy('name', 'asc');
    }
}