<?php

use App\Models\Ticket;
use Illuminate\Support\Facades\Broadcast;

// channel broadcast notif user pribadi
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// cuma pemilik tiket atau admin yang bisa dengar update tiket ini
Broadcast::channel('tickets.{id}', function ($user, $id) {
    if ($user->isAdmin()) {
        return true;
    }
    return Ticket::where('id', $id)->where('user_id', $user->id)->exists();
});

// cuma admin yang bisa dengar channel admin
Broadcast::channel('admin-tickets', function ($user) {
    return $user->isAdmin();
});
