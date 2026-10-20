<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Jadwal penarikan email masuk otomatis setiap 1 menit
Schedule::command('helpdesk:fetch-emails')->everyMinute();

// Jadwal pembersihan dan optimasi storage otomatis setiap hari pukul 02:00 dini hari
Schedule::command('helpdesk:cleanup --days=180 --logs-days=30')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/cleanup.log'));

// Jadwal pembersihan token reset password expired
Schedule::command('auth:clear-resets')->daily();

// Jadwal pengingat masa aktif kontrak dokumen library (H-7) setiap hari pukul 08:00
Schedule::command('library:remind-contracts --days=7')
    ->dailyAt('08:00')
    ->withoutOverlapping();

Artisan::command('helpdesk:clean-verif', function () {
    $tickets = \App\Models\Ticket::where('subject', 'like', '%Verifikasi%')
        ->orWhere('subject', 'like', '%Verify%')
        ->get();

    $count = $tickets->count();
    foreach ($tickets as $t) {
        \App\Models\TicketMessage::where('ticket_id', $t->id)->delete();
        \App\Models\ActivityLog::where('ticket_id', $t->id)->delete();
        $t->delete();
    }
    $this->info("Berhasil menghapus {$count} tiket verifikasi email.");
});

Artisan::command('helpdesk:test-email {to}', function ($to) {
    try {
        \Illuminate\Support\Facades\Mail::raw('Halo! Ini email uji coba dari Helpdesk RSAM via Brevo HTTP API.', function ($m) use ($to) {
            $m->to($to)->subject('Uji Coba Pengiriman Email Helpdesk RSAM');
        });
        $this->info("Email berhasil terkirim ke: {$to}");
    } catch (\Throwable $e) {
        $this->error("Gagal kirim email: " . $e->getMessage());
    }
});

Artisan::command('helpdesk:list-users', function () {
    foreach (\App\Models\User::all(['id', 'name', 'email', 'email_verified_at', 'is_approved']) as $u) {
        $this->line("{$u->id} | {$u->email} | verified: " . ($u->email_verified_at ? $u->email_verified_at->toDateTimeString() : 'NO') . " | approved: {$u->is_approved}");
    }
});

Artisan::command('helpdesk:get-verif-url {id}', function ($id) {
    $u = \App\Models\User::find($id);
    if (!$u) {
        $this->error("User tidak ditemukan.");
        return;
    }
    $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
        'verification.verify',
        \Illuminate\Support\Carbon::now()->addMinutes(60),
        [
            'id' => $u->getKey(),
            'hash' => sha1($u->getEmailForVerification()),
        ]
    );
    $this->line("URL: {$url}");
});
