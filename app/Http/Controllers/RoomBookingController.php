<?php

namespace App\Http\Controllers;

use App\Events\RoomBookingUpdated;
use App\Models\Room;
use App\Models\RoomBooking;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class RoomBookingController extends Controller
{
    
    public function index(Request $request): Response
    {
        $selectedDate = $request->input('date', Carbon::today()->format('Y-m-d'));

        
        $rooms = Room::where('is_active', true)
            ->with([
                'bookings' => function ($q) use ($selectedDate) {
                    $q->where('booking_date', $selectedDate)
                      ->whereIn('status', ['pending', 'approved', 'in_use', 'completed'])
                      ->orderBy('start_time');
                }
            ])
            ->orderBy('name')
            ->get()
            ->map(function ($r) use ($selectedDate) {
                $dayBookings = $r->bookings->map(fn ($b) => [
                    'id' => $b->id,
                    'booking_number' => $b->booking_number,
                    'room_id' => $b->room_id,
                    'title' => $b->title,
                    'description' => $b->description,
                    'start_time' => substr($b->start_time, 0, 5),
                    'end_time' => substr($b->end_time, 0, 5),
                    'booker_name' => $b->booker_name,
                    'booker_unit' => $b->booker_unit,
                    'booker_phone' => $b->booker_phone,
                    'status' => $b->status,
                    'participants_count' => $b->participants_count,
                    'booking_date' => $b->booking_date->format('Y-m-d'),
                    'day' => (int) $b->booking_date->format('j'),
                    'extra_facilities' => is_array($b->extra_facilities) ? $b->extra_facilities : [],
                ]);

                return [
                    'id' => $r->id,
                    'name' => $r->name,
                    'code' => $r->code,
                    'capacity' => $r->capacity,
                    'location' => $r->location,
                    'facilities' => is_array($r->facilities) ? $r->facilities : [],
                    'description' => $r->description,
                    'image_url' => $r->image_url,
                    'color' => $r->color,
                    'day_bookings' => $dayBookings,
                    'is_free_today' => $dayBookings->isEmpty(),
                ];
            });

        
        $myBookings = RoomBooking::with('room')
            ->where('user_id', Auth::id())
            ->latest('booking_date')
            ->latest('start_time')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'booking_number' => $b->booking_number,
                'room' => $b->room ? [
                    'id' => $b->room->id,
                    'name' => $b->room->name,
                    'location' => $b->room->location,
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
                'rejection_reason' => $b->rejection_reason,
                'admin_notes' => $b->admin_notes,
                'created_at_human' => $b->created_at->diffForHumans(),
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

        return Inertia::render('RoomBookings/User/Index', [
            'rooms' => $rooms,
            'my_bookings' => $myBookings,
            'month_bookings' => $monthBookings,
            'units' => $units,
            'selected_date' => $selectedDate,
        ]);
    }

    
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'room_id' => ['required', Rule::exists('rooms', 'id')->where('is_active', true)],
            'booking_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'title' => 'required|string|max:255',
            'booker_name' => 'required|string|max:150',
            'booker_unit' => 'required|string|max:100',
            'booker_phone' => 'nullable|string|max:30',
            'participants_count' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:1000',
            'extra_facilities' => 'nullable|array',
        ]);

        
        // kunci baris ruangan biar ga kejadian double booking
        $booking = DB::transaction(function () use ($request) {
            Room::where('id', $request->room_id)->lockForUpdate()->first();

            $conflict = RoomBooking::findConflict(
                (int) $request->room_id,
                $request->booking_date,
                $request->start_time,
                $request->end_time
            );

            if ($conflict) {
                return $conflict;
            }

            return RoomBooking::create([
                'booking_number' => RoomBooking::generateBookingNumber(),
                'room_id' => $request->room_id,
                'user_id' => Auth::id(),
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
                'status' => 'pending',
            ]);
        });

        if ($booking->wasRecentlyCreated === false) {
            $jam = substr($booking->start_time, 0, 5) . ' - ' . substr($booking->end_time, 0, 5);
            return back()->with('error', "Jadwal bentrok dengan kegiatan '{$booking->title}' ({$jam}). Silakan pilih jam atau ruangan lain.");
        }

        $booking->load('room');

        broadcast(new RoomBookingUpdated(
            $booking,
            'created',
            "Pengajuan Peminjaman Baru: {$booking->room?->name} oleh {$booking->booker_name} ({$booking->booker_unit})",
            Auth::user()
        ))->toOthers();

        return redirect()->route('room-bookings.index', ['date' => $booking->booking_date->format('Y-m-d')])
            ->with('success', "Pengajuan peminjaman ruangan '{$booking->room?->name}' berhasil dikirim dan menunggu konfirmasi admin.");
    }

    
    public function cancel(RoomBooking $booking): RedirectResponse
    {
        
        if ($booking->user_id !== Auth::id()) {
            return back()->with('error', 'Anda tidak memiliki hak untuk membatalkan pengajuan ini.');
        }

        if ($booking->status !== 'pending') {
            return back()->with('error', 'Hanya pengajuan dengan status Menunggu (Pending) yang dapat dibatalkan.');
        }

        $booking->update([
            'status' => 'cancelled',
        ]);

        broadcast(new RoomBookingUpdated(
            $booking,
            'cancelled',
            "Peminjaman Ruangan Dibatalkan: {$booking->booking_number} oleh {$booking->booker_name}",
            Auth::user()
        ))->toOthers();

        return back()->with('success', 'Pengajuan peminjaman ruangan berhasil dibatalkan.');
    }

    
    public function checkAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'date' => 'required|date',
            'start_time' => 'required',
            'end_time' => 'required',
            'exclude_booking_id' => 'nullable|integer',
        ]);

        $conflict = RoomBooking::findConflict(
            (int) $request->room_id,
            $request->date,
            $request->start_time,
            $request->end_time,
            $request->exclude_booking_id ? (int) $request->exclude_booking_id : null
        );

        if ($conflict) {
            return response()->json([
                'available' => false,
                'conflict' => [
                    'id' => $conflict->id,
                    'title' => $conflict->title,
                    'booker_name' => $conflict->booker_name,
                    'start_time' => substr($conflict->start_time, 0, 5),
                    'end_time' => substr($conflict->end_time, 0, 5),
                    'status' => $conflict->status,
                ],
            ]);
        }

        return response()->json([
            'available' => true,
        ]);
    }
}
