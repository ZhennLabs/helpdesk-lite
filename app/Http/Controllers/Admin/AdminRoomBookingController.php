<?php

namespace App\Http\Controllers\Admin;

use App\Events\RoomBookingUpdated;
use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomBooking;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class AdminRoomBookingController extends Controller
{
    
    public function index(Request $request): Response
    {
        $selectedDate = $request->input('date', Carbon::today()->format('Y-m-d'));
        $today = Carbon::today()->format('Y-m-d');

        
        $statsRow = RoomBooking::selectRaw("
            sum(case when booking_date = ? then 1 else 0 end) as today_total,
            sum(case when status = 'pending' then 1 else 0 end) as pending,
            sum(case when status = 'in_use' then 1 else 0 end) as in_use,
            sum(case when status = 'approved' then 1 else 0 end) as approved
        ", [$today])->first();

        $stats = [
            'today_total' => (int) ($statsRow->today_total ?? 0),
            'pending' => (int) ($statsRow->pending ?? 0),
            'in_use' => (int) ($statsRow->in_use ?? 0),
            'approved' => (int) ($statsRow->approved ?? 0),
            'total_rooms' => Room::where('is_active', true)->count(),
        ];

        $query = RoomBooking::with(['room', 'user', 'approvedBy'])->latest('booking_date')->latest('start_time');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        if ($request->filled('date')) {
            $query->whereDate('booking_date', $request->date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('booking_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('booker_name', 'like', "%{$search}%")
                  ->orWhere('booker_unit', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $bookings = $query->get()->map(fn ($b) => [
            'id' => $b->id,
            'booking_number' => $b->booking_number,
            'room' => $b->room ? [
                'id' => $b->room->id,
                'name' => $b->room->name,
                'code' => $b->room->code,
                'location' => $b->room->location,
                'capacity' => $b->room->capacity,
                'color' => $b->room->color,
                'image_url' => $b->room->image_url,
            ] : null,
            'title' => $b->title,
            'description' => $b->description,
            'booker_name' => $b->booker_name,
            'booker_unit' => $b->booker_unit,
            'booker_phone' => $b->booker_phone,
            'participants_count' => $b->participants_count,
            'booking_date' => $b->booking_date->format('Y-m-d'),
            'booking_date_formatted' => $b->booking_date->translatedFormat('d M Y'),
            'start_time' => substr($b->start_time, 0, 5),
            'end_time' => substr($b->end_time, 0, 5),
            'extra_facilities' => is_array($b->extra_facilities) ? $b->extra_facilities : [],
            'status' => $b->status,
            'approved_by' => $b->approvedBy ? [
                'name' => $b->approvedBy->name,
            ] : null,
            'approved_at' => $b->approved_at ? $b->approved_at->translatedFormat('d M Y, H:i') : null,
            'rejection_reason' => $b->rejection_reason,
            'admin_notes' => $b->admin_notes,
            'created_at_human' => $b->created_at->diffForHumans(),
        ]);

        $rooms = Room::where('is_active', true)->orderBy('name')->get();

        $selectedDayBookings = RoomBooking::with('room')
            ->where('booking_date', $selectedDate)
            ->whereIn('status', ['pending', 'approved', 'in_use', 'completed'])
            ->orderBy('start_time')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'booking_number' => $b->booking_number,
                'room_id' => $b->room_id,
                'room_name' => $b->room?->name,
                'room_color' => $b->room?->color ?: '#0D9488',
                'title' => $b->title,
                'description' => $b->description,
                'booker_name' => $b->booker_name,
                'booker_unit' => $b->booker_unit,
                'booker_phone' => $b->booker_phone,
                'participants_count' => $b->participants_count,
                'booking_date' => $b->booking_date->format('Y-m-d'),
                'day' => (int) $b->booking_date->format('j'),
                'start_time' => substr($b->start_time, 0, 5),
                'end_time' => substr($b->end_time, 0, 5),
                'status' => $b->status,
                'extra_facilities' => is_array($b->extra_facilities) ? $b->extra_facilities : [],
            ]);

        $selectedCarbon = Carbon::parse($selectedDate);
        $monthBookings = RoomBooking::with('room')
            ->whereYear('booking_date', $selectedCarbon->year)
            ->whereMonth('booking_date', $selectedCarbon->month)
            ->whereIn('status', ['pending', 'approved', 'in_use', 'completed'])
            ->orderBy('booking_date')
            ->orderBy('start_time')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'booking_number' => $b->booking_number,
                'room_id' => $b->room_id,
                'room_name' => $b->room?->name,
                'room_color' => $b->room?->color ?: '#0D9488',
                'title' => $b->title,
                'description' => $b->description,
                'booker_name' => $b->booker_name,
                'booker_unit' => $b->booker_unit,
                'booker_phone' => $b->booker_phone,
                'participants_count' => $b->participants_count,
                'booking_date' => $b->booking_date->format('Y-m-d'),
                'day' => (int) $b->booking_date->format('j'),
                'start_time' => substr($b->start_time, 0, 5),
                'end_time' => substr($b->end_time, 0, 5),
                'status' => $b->status,
                'extra_facilities' => is_array($b->extra_facilities) ? $b->extra_facilities : [],
            ]);

        $units = Cache::remember('active_units_list', 60, function () {
            $list = Unit::where('is_active', true)->orderBy('name')->pluck('name')->toArray();
            return !empty($list) ? $list : [
                'Rawat Inap', 'Rawat Jalan', 'IGD', 'ICU', 'Laboratorium', 
                'Radiologi', 'Farmasi', 'Keuangan', 'SDM & Diklat', 'Komite Medik', 
                'Keperawatan', 'Umum & RT'
            ];
        });

        
        $usersList = User::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'unit', 'sub_unit']);

        return Inertia::render('RoomBookings/Admin/Index', [
            'bookings' => $bookings,
            'stats' => $stats,
            'rooms' => $rooms,
            'timeline_bookings' => $selectedDayBookings,
            'month_bookings' => $monthBookings,
            'units' => $units,
            'users_list' => $usersList,
            'selected_date' => $selectedDate,
            'filters' => $request->only(['status', 'room_id', 'date', 'search']),
        ]);
    }

    
    public function updateStatus(Request $request, RoomBooking $booking): RedirectResponse
    {
        $request->validate([
            'status' => 'required|in:approved,rejected,in_use,completed,cancelled',
            'rejection_reason' => 'nullable|string|max:500',
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $status = $request->status;

        
        if ($status === 'approved') {
            $conflict = RoomBooking::findConflict(
                $booking->room_id,
                $booking->booking_date->format('Y-m-d'),
                $booking->start_time,
                $booking->end_time,
                $booking->id
            );

            if ($conflict) {
                $jam = substr($conflict->start_time, 0, 5) . ' - ' . substr($conflict->end_time, 0, 5);
                return back()->with('error', "Gagal menyetujui: Bentrok dengan booking lain '{$conflict->title}' ({$jam}) yang sudah disetujui.");
            }
        }

        $updateData = [
            'status' => $status,
            'admin_notes' => $request->admin_notes,
        ];

        if ($status === 'approved') {
            $updateData['approved_by'] = Auth::id();
            $updateData['approved_at'] = now();
            $updateData['rejection_reason'] = null;
        } elseif ($status === 'rejected') {
            $updateData['rejection_reason'] = $request->rejection_reason ?: 'Tidak memenuhi kriteria / jadwal bentrok';
        }

        $booking->update($updateData);
        $booking->load('room');

        broadcast(new RoomBookingUpdated(
            $booking,
            'status_changed',
            "Status Peminjaman Ruangan '{$booking->room?->name}' diubah menjadi: " . strtoupper($status),
            Auth::user()
        ))->toOthers();

        return back()->with('success', "Status booking {$booking->booking_number} berhasil diperbarui.");
    }

    
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'booking_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'title' => 'required|string|max:255',
            'booker_name' => 'required|string|max:150',
            'booker_unit' => 'required|string|max:100',
            'booker_phone' => 'nullable|string|max:30',
            'participants_count' => 'nullable|integer',
            'description' => 'nullable|string|max:1000',
            'extra_facilities' => 'nullable|array',
            'status' => 'required|in:approved,pending',
        ]);

        $status = $request->status;

        
        if ($status === 'approved') {
            $conflict = RoomBooking::findConflict(
                (int) $request->room_id,
                $request->booking_date,
                $request->start_time,
                $request->end_time
            );

            if ($conflict) {
                $jam = substr($conflict->start_time, 0, 5) . ' - ' . substr($conflict->end_time, 0, 5);
                return back()->with('error', "Jadwal bentrok dengan kegiatan '{$conflict->title}' ({$jam}).");
            }
        }

        $targetUser = User::where('name', trim($request->booker_name))->first();

        $booking = RoomBooking::create([
            'booking_number' => RoomBooking::generateBookingNumber(),
            'room_id' => $request->room_id,
            'user_id' => $targetUser ? $targetUser->id : Auth::id(),
            'booker_name' => $request->booker_name,
            'booker_unit' => $request->booker_unit,
            'booker_phone' => $request->booker_phone,
            'title' => $request->title,
            'description' => $request->description,
            'participants_count' => $request->participants_count ?: 1,
            'booking_date' => $request->booking_date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'extra_facilities' => $request->extra_facilities ?: [],
            'status' => $status,
            'approved_by' => $status === 'approved' ? Auth::id() : null,
            'approved_at' => $status === 'approved' ? now() : null,
        ]);

        $booking->load('room');

        broadcast(new RoomBookingUpdated(
            $booking,
            'created',
            "Booking Ruangan Baru (Admin): {$booking->room?->name} ({$booking->title})",
            Auth::user()
        ))->toOthers();

        return redirect()->route('admin.room-bookings.index', ['date' => $booking->booking_date->format('Y-m-d')])
            ->with('success', "Booking ruangan '{$booking->room?->name}' berhasil dibuat.");
    }

    
    public function destroy(RoomBooking $booking): RedirectResponse
    {
        $number = $booking->booking_number;
        $roomName = $booking->room?->name;

        $booking->delete();

        return back()->with('success', "Data booking {$number} ({$roomName}) berhasil dihapus.");
    }
}
