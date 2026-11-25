<?php

use App\Models\Ticket;
use Illuminate\Support\Facades\Broadcast;


Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});


Broadcast::channel('tickets.{id}', function ($user, $id) {
    if ($user->isAdmin()) {
        return true;
    }
    return Ticket::where('id', $id)->where('user_id', $user->id)->exists();
});


Broadcast::channel('admin-tickets', function ($user) {
    return $user->isAdmin();
});
