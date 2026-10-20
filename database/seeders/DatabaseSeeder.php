<?php

namespace Database\Seeders;

use App\Models\TicketCategory;
use App\Models\TicketUrgency;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Default Admin lokal
        User::updateOrCreate(
            ['email' => 'admin@helpdesk.local'],
            [
                'name' => 'Administrator Helpdesk',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'unit' => 'Management / IT',
                'sub_unit' => 'Pusat Kontrol',
                'avatar_url' => 'https://ui-avatars.com/api/?name=Admin+Helpdesk&background=0D9488&color=fff&bold=true',
                'is_active' => true,
            ]
        );

        // 2. Master Kategori Tiket
        $categories = [
            [
                'name' => 'Hardware & Perangkat Keras',
                'description' => 'Kendala fisik pada PC, Laptop, Monitor, Keyboard, Printer, Scanner, dll.',
                'icon' => 'ph:desktop-tower-bold',
                'is_active' => true,
                'order_index' => 1,
            ],
            [
                'name' => 'Software & Aplikasi',
                'description' => 'Masalah sistem operasi, software produktivitas, aplikasi internal, atau error sistem.',
                'icon' => 'ph:app-window-bold',
                'is_active' => true,
                'order_index' => 2,
            ],
            [
                'name' => 'Jaringan & Konektivitas',
                'description' => 'Gangguan sambungan LAN, Wi-Fi, Internet lambat, akses server atau sharing drive.',
                'icon' => 'ph:wifi-high-bold',
                'is_active' => true,
                'order_index' => 3,
            ],
            [
                'name' => 'Akun & Hak Akses',
                'description' => 'Permintaan reset password, pembuatan akun baru, pembukaan hak akses menu atau database.',
                'icon' => 'ph:key-bold',
                'is_active' => true,
                'order_index' => 4,
            ],
            [
                'name' => 'Fasilitas & Operasional Umum',
                'description' => 'Kendala sarana pendukung ruangan, kelistrikan peralatan kantor, dsb.',
                'icon' => 'ph:buildings-bold',
                'is_active' => true,
                'order_index' => 5,
            ],
            [
                'name' => 'Lain-lain',
                'description' => 'Kendala atau pertanyaan operasional lainnya di luar kategori utama.',
                'icon' => 'ph:dots-three-circle-bold',
                'is_active' => true,
                'order_index' => 6,
            ],
        ];

        foreach ($categories as $cat) {
            TicketCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }

        // 3. Master Urgensi / Prioritas Tiket
        $urgencies = [
            [
                'name' => 'Rendah',
                'level' => 1,
                'color' => 'emerald',
                'sla_hours' => 72,
                'description' => 'Kendala minor, tidak menghambat alur kerja utama. Ditangani secara reguler.',
                'is_active' => true,
                'order_index' => 1,
            ],
            [
                'name' => 'Sedang',
                'level' => 2,
                'color' => 'blue',
                'sla_hours' => 24,
                'description' => 'Kendala mempengaruhi beberapa aktivitas operasional, namun masih terdapat alternatif.',
                'is_active' => true,
                'order_index' => 2,
            ],
            [
                'name' => 'Tinggi',
                'level' => 3,
                'color' => 'amber',
                'sla_hours' => 8,
                'description' => 'Kendala serius yang berdampak besar pada produktivitas unit kerja langsung.',
                'is_active' => true,
                'order_index' => 3,
            ],
            [
                'name' => 'Kritis / Darurat',
                'level' => 4,
                'color' => 'rose',
                'sla_hours' => 2,
                'description' => 'Keadaan darurat / downtime kritis yang menghentikan seluruh layanan operasional.',
                'is_active' => true,
                'order_index' => 4,
            ],
        ];

        foreach ($urgencies as $urg) {
            TicketUrgency::updateOrCreate(['name' => $urg['name']], $urg);
        }
    }
}