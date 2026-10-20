<?php

namespace App\Console\Commands;

use App\Services\RsamApiService;
use Illuminate\Console\Command;

class SyncRsamUsers extends Command
{
    protected $signature = 'users:sync-rsam';
    protected $description = 'Sinkronkan seluruh akun pengguna dari Helpdesk RSAM API';

    public function handle(): int
    {
        $this->info('Mengambil data pengguna dari Helpdesk RSAM API...');
        $remote = RsamApiService::fetchRemoteUsers(['limit' => 500]);

        if (empty($remote['data'])) {
            $this->error('Gagal mengambil data dari API atau data kosong.');
            return 1;
        }

        $count = 0;
        foreach ($remote['data'] as $rUser) {
            $synced = RsamApiService::syncOrCreateUser($rUser);
            $this->line(" - [Synced] {$synced->name} ({$synced->email}) [Unit: {$synced->unit}]");
            $count++;
        }

        $this->info("Berhasil menyinkronkan {$count} akun pengguna dari Helpdesk RSAM.");
        return 0;
    }
}