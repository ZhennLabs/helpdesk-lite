<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TicketUrgency;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterUrgencyController extends Controller
{
    /**
     * Tampilkan daftar master urgensi / prioritas tiket
     */
    public function index(): Response
    {
        $urgencies = TicketUrgency::withCount('tickets')
            ->orderBy('level', 'asc')
            ->get();

        return Inertia::render('Admin/Master/Urgencies', [
            'urgencies' => $urgencies,
        ]);
    }

    /**
     * Tambah master urgensi baru
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:ticket_urgencies,name',
            'level' => 'required|integer|min:1|max:10',
            'color' => 'required|string|in:emerald,blue,amber,rose,purple,indigo',
            'sla_hours' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:255',
            'order_index' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        TicketUrgency::create([
            'name' => $request->name,
            'level' => $request->level,
            'color' => $request->color,
            'sla_hours' => $request->sla_hours,
            'description' => $request->description,
            'order_index' => $request->order_index ?: 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', 'Master urgensi / prioritas tiket berhasil ditambahkan.');
    }

    /**
     * Update master urgensi
     */
    public function update(Request $request, TicketUrgency $urgency): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:ticket_urgencies,name,' . $urgency->id,
            'level' => 'required|integer|min:1|max:10',
            'color' => 'required|string|in:emerald,blue,amber,rose,purple,indigo',
            'sla_hours' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:255',
            'order_index' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        $urgency->update([
            'name' => $request->name,
            'level' => $request->level,
            'color' => $request->color,
            'sla_hours' => $request->sla_hours,
            'description' => $request->description,
            'order_index' => $request->order_index ?: 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', 'Master urgensi / prioritas tiket berhasil diperbarui.');
    }

    /**
     * Hapus atau nonaktifkan master urgensi
     */
    public function destroy(TicketUrgency $urgency): RedirectResponse
    {
        if ($urgency->tickets()->count() > 0) {
            $urgency->update(['is_active' => !$urgency->is_active]);
            $status = $urgency->is_active ? 'diaktifkan' : 'dinonaktifkan';
            return redirect()->back()->with('success', "Urgensi telah memiliki relasi tiket, status berhasil {$status}.");
        }

        $urgency->delete();
        return redirect()->back()->with('success', 'Master urgensi berhasil dihapus.');
    }
}