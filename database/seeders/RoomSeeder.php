<?php

namespace Database\Seeders;

use App\Models\Room;
use App\Models\RoomBooking;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roomsData = [
            [
                'name' => 'Ruang Rapat Utama (Auditorium Lt. 2)',
                'code' => 'R-UTAMA-01',
                'capacity' => 60,
                'location' => 'Gedung Utama Lantai 2',
                'facilities' => [
                    'Proyektor Laser HD',
                    'Sound System & 4 Mic Wireless',
                    'AC Sentral',
                    'Smart TV 75 Inch',
                    'Video Conference Zoom',
                    'Podium Pidato',
                    'Whiteboard Glass',
                ],
                'description' => 'Ruang pertemuan formal dengan kapasitas besar, cocok untuk rapat direksi, rapat koordinasi seluruh unit, dan evaluasi bulanan rumah sakit.',
                'color' => '#0D9488',
                'image_url' => 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80',
                'is_active' => true,
            ],
            [
                'name' => 'Aula Serbaguna RS Antam Medika',
                'code' => 'AULA-01',
                'capacity' => 150,
                'location' => 'Gedung B Lantai 4',
                'facilities' => [
                    'Panggung Utama',
                    'Dual Proyektor Layar Lebar',
                    'Sound System Panggung & Mixer',
                    'Mic Wireless & Clip-on',
                    'AC 6 Unit',
                    'Kursi Banquet 150',
                    'Area Meja Konsumsi',
                ],
                'description' => 'Aula berkapasitas besar untuk workshop, seminar kesehatan, sosialisasi akreditasi RS, apel pertemuan akbar, dan peringatan hari besar.',
                'color' => '#2563EB',
                'image_url' => 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1000&q=80',
                'is_active' => true,
            ],
            [
                'name' => 'Ruang Komite Medik & Mutu',
                'code' => 'R-MEDIK-02',
                'capacity' => 25,
                'location' => 'Gedung Utama Lantai 3',
                'facilities' => [
                    'Smart TV 65 Inch',
                    'Proyektor Mini Portable',
                    'Soundbar & Mic Meja',
                    'AC Split 2 PK',
                    'Whiteboard',
                    'Meja Konferensi U-Shape',
                ],
                'description' => 'Ruangan rapat komprehensif khusus sidang etik, audit medik, pertemuan Komite Keperawatan, dan telaah mutu klinis.',
                'color' => '#7C3AED',
                'image_url' => 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80',
                'is_active' => true,
            ],
            [
                'name' => 'Ruang Diskusi & Pelatihan Diklat',
                'code' => 'R-DIKLAT-03',
                'capacity' => 35,
                'location' => 'Gedung Penunjang Lantai 1',
                'facilities' => [
                    'Proyektor HD',
                    'Layar Tripod',
                    'Sound Portable',
                    'AC Split',
                    'Whiteboard Double Side',
                    'Meja Kursi Fleksibel Training',
                ],
                'description' => 'Ruang interaktif untuk pelatihan internal staf, sosialisasi SPO baru rumah sakit, orientasi pegawai baru, dan simulasi BHD.',
                'color' => '#D97706',
                'image_url' => 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=80',
                'is_active' => true,
            ],
            [
                'name' => 'Ruang Telemedicine & Konsultasi VIP',
                'code' => 'R-TELE-04',
                'capacity' => 12,
                'location' => 'Gedung Rawat Jalan Lantai 2',
                'facilities' => [
                    'Webcam 4K PTZ',
                    'Dedicated Fiber Optic',
                    'Mic Echo-Cancelling',
                    'Smart TV Dual Monitor',
                    'AC Split 1.5 PK',
                    'Sofa & Meja Diskusi',
                ],
                'description' => 'Ruang eksklusif untuk konsultasi spesialis jarak jauh, koordinasi rujukan antar rumah sakit, dan rapat daring intensif.',
                'color' => '#059669',
                'image_url' => 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1000&q=80',
                'is_active' => true,
            ],
        ];

        $createdRooms = [];
        foreach ($roomsData as $data) {
            $createdRooms[] = Room::updateOrCreate(
                ['code' => $data['code']],
                $data
            );
        }

        $adminUser = User::where('role', 'admin')->first();
        $normalUser = User::where('role', 'user')->first();
        $today = Carbon::today()->format('Y-m-d');
        $tomorrow = Carbon::tomorrow()->format('Y-m-d');

        // Contoh booking awal yang realistis
        $bookings = [
            [
                'booking_number' => 'BK-' . date('Ymd') . '-0001',
                'room_id' => $createdRooms[0]->id, // Ruang Rapat Utama
                'user_id' => $normalUser?->id,
                'booker_name' => 'Ns. Dewi Sartika, S.Kep',
                'booker_unit' => 'Bidang Pelayanan Keperawatan',
                'booker_phone' => '081234567890',
                'title' => 'Rapat Koordinasi Mutu Asuhan Keperawatan Rawat Inap',
                'description' => 'Membahas evaluasi catatan asuhan keperawatan dan kepatuhan identifikasi pasien.',
                'participants_count' => 30,
                'booking_date' => $today,
                'start_time' => '09:00',
                'end_time' => '11:30',
                'extra_facilities' => ['Proyektor Layar', 'Sound System', 'Air Mineral'],
                'status' => 'approved',
                'approved_by' => $adminUser?->id,
                'approved_at' => now()->subHours(2),
            ],
            [
                'booking_number' => 'BK-' . date('Ymd') . '-0002',
                'room_id' => $createdRooms[2]->id, // Ruang Komite Medik
                'user_id' => $adminUser?->id,
                'booker_name' => 'dr. Bambang Irawan, Sp.B',
                'booker_unit' => 'Komite Medik',
                'booker_phone' => '081398765432',
                'title' => 'Audit Maternal Perinatal & Telaah Kasus Klinis Bedah',
                'description' => 'Sidang komite medik rutin pembahasan audit klinis periode triwulan III.',
                'participants_count' => 15,
                'booking_date' => $today,
                'start_time' => '13:00',
                'end_time' => '15:00',
                'extra_facilities' => ['Smart TV', 'Mic Meja'],
                'status' => 'in_use',
                'approved_by' => $adminUser?->id,
                'approved_at' => now()->subDay(),
            ],
            [
                'booking_number' => 'BK-' . date('Ymd') . '-0003',
                'room_id' => $createdRooms[1]->id, // Aula Serbaguna
                'user_id' => $normalUser?->id,
                'booker_name' => 'Ahmad Fauzi, S.Kom',
                'booker_unit' => 'Bagian Diklat & SDM',
                'booker_phone' => '081122334455',
                'title' => 'Sosialisasi Standar Akreditasi KARS Edisi Terbaru',
                'description' => 'Workshop seluruh kepala ruangan dan penanggung jawab pokja akreditasi rumah sakit.',
                'participants_count' => 100,
                'booking_date' => $tomorrow,
                'start_time' => '08:30',
                'end_time' => '14:00',
                'extra_facilities' => ['Panggung Utama', 'Dual Proyektor', 'Sound System Panggung', 'Konsumsi Snack Box'],
                'status' => 'pending',
            ],
        ];

        foreach ($bookings as $b) {
            RoomBooking::updateOrCreate(
                ['booking_number' => $b['booking_number']],
                $b
            );
        }
    }
}
