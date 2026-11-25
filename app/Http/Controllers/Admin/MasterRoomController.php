<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterRoomController extends Controller
{
    /**
     * Tampilan daftar master ruangan
     */
    public function index(): Response
    {
        $rooms = Room::withCount([
            'bookings as active_bookings_count' => function ($q) {
                $q->whereIn('status', ['pending', 'approved', 'in_use']);
            },
            'bookings as total_bookings_count'
        ])
        ->orderBy('name')
        ->get()
        ->map(fn ($r) => [
            'id' => $r->id,
            'name' => $r->name,
            'code' => $r->code,
            'capacity' => $r->capacity,
            'location' => $r->location,
            'facilities' => is_array($r->facilities) ? $r->facilities : [],
            'description' => $r->description,
            'image_url' => $r->image_url,
            'color' => $r->color,
            'is_active' => (bool) $r->is_active,
            'active_bookings_count' => $r->active_bookings_count,
            'total_bookings_count' => $r->total_bookings_count,
            'created_at' => $r->created_at->translatedFormat('d M Y'),
        ]);

        return Inertia::render('Admin/Master/Rooms', [
            'rooms' => $rooms,
        ]);
    }

    /**
     * Simpan ruangan baru
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:rooms,code',
            'capacity' => 'required|integer|min:1',
            'location' => 'required|string|max:150',
            'facilities' => 'nullable|array',
            'description' => 'nullable|string|max:1000',
            'image_url' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        $facilities = $request->facilities ?: [];
        if (is_string($facilities)) {
            $facilities = array_filter(array_map('trim', explode(',', $facilities)));
        }

        Room::create([
            'name' => $request->name,
            'code' => $request->code ?: ('R-' . strtoupper(substr(uniqid(), -5))),
            'capacity' => (int) $request->capacity,
            'location' => $request->location,
            'facilities' => $facilities,
            'description' => $request->description,
            'image_url' => $request->image_url ?: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80',
            'color' => $request->color ?: '#0D9488',
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', "Ruangan '{$request->name}' berhasil ditambahkan ke master data.");
    }

    /**
     * Perbarui data ruangan
     */
    public function update(Request $request, Room $room): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:rooms,code,' . $room->id,
            'capacity' => 'required|integer|min:1',
            'location' => 'required|string|max:150',
            'facilities' => 'nullable|array',
            'description' => 'nullable|string|max:1000',
            'image_url' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        $facilities = $request->facilities ?: [];
        if (is_string($facilities)) {
            $facilities = array_filter(array_map('trim', explode(',', $facilities)));
        }

        $room->update([
            'name' => $request->name,
            'code' => $request->code ?: $room->code,
            'capacity' => (int) $request->capacity,
            'location' => $request->location,
            'facilities' => $facilities,
            'description' => $request->description,
            'image_url' => $request->image_url ?: $room->image_url,
            'color' => $request->color ?: $room->color,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', "Data ruangan '{$room->name}' berhasil diperbarui.");
    }

    /**
     * Hapus ruangan
     */
    public function destroy(Room $room): RedirectResponse
    {
        $hasActiveBookings = $room->bookings()
            ->whereIn('status', ['pending', 'approved', 'in_use'])
            ->exists();

        if ($hasActiveBookings) {
            return back()->with('error', "Ruangan '{$room->name}' tidak dapat dihapus karena masih memiliki jadwal booking aktif. Anda dapat menonaktifkan ruangan ini.");
        }

        $roomName = $room->name;
        $room->delete();

        return back()->with('success', "Ruangan '{$roomName}' telah dihapus dari sistem.");
    }
}
