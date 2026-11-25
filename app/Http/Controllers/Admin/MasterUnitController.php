<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubUnit;
use App\Models\Unit;
use App\Services\RsamApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterUnitController extends Controller
{

    public function index(Request $request): Response
    {
        $query = Unit::with(['subUnits' => function ($q) {
            $q->orderBy('name', 'asc');
        }])->orderBy('name', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('subUnits', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('source') && in_array($request->source, ['rsam', 'local'])) {
            $query->where('source', $request->source);
        }

        $units = $query->get();

        return Inertia::render('Admin/Master/Units', [
            'units' => $units,
            'filters' => $request->only(['search', 'source']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:units,name',
            'description' => 'nullable|string|max:255',
            'sub_units' => 'nullable|array',
            'sub_units.*' => 'nullable|string|max:100',
        ]);

        $unit = Unit::create([
            'name' => trim($request->name),
            'description' => $request->description,
            'is_active' => true,
            'source' => 'local',
        ]);

        if (!empty($request->sub_units) && is_array($request->sub_units)) {
            foreach ($request->sub_units as $subName) {
                $cleanSub = trim((string) $subName);
                if (!empty($cleanSub)) {
                    SubUnit::create([
                        'unit_id' => $unit->id,
                        'name' => $cleanSub,
                        'source' => 'local',
                        'is_active' => true,
                    ]);
                }
            }
        }

        return redirect()->back()->with('success', "Unit '{$unit->name}' berhasil ditambahkan ke database.");
    }

    public function update(Request $request, Unit $unit): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:units,name,' . $unit->id,
            'description' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $unit->update([
            'name' => trim($request->name),
            'description' => $request->description,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', "Unit '{$unit->name}' berhasil diperbarui.");
    }

    public function destroy(Unit $unit): RedirectResponse
    {
        $name = $unit->name;
        $unit->delete();
        return redirect()->back()->with('success', "Unit '{$name}' dan sub-unit terkait berhasil dihapus.");
    }

    public function storeSubUnit(Request $request, Unit $unit): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
        ]);

        SubUnit::create([
            'unit_id' => $unit->id,
            'name' => trim($request->name),
            'description' => $request->description,
            'is_active' => true,
            'source' => 'local',
        ]);

        return redirect()->back()->with('success', "Sub Unit baru berhasil ditambahkan pada {$unit->name}.");
    }

    public function updateSubUnit(Request $request, SubUnit $subUnit): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $subUnit->update([
            'name' => trim($request->name),
            'description' => $request->description,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', "Sub Unit '{$subUnit->name}' berhasil diperbarui.");
    }

    public function destroySubUnit(SubUnit $subUnit): RedirectResponse
    {
        $name = $subUnit->name;
        $subUnit->delete();
        return redirect()->back()->with('success', "Sub Unit '{$name}' berhasil dihapus.");
    }

    public function syncFromRsam(): RedirectResponse
    {
        $res = RsamApiService::syncRemoteUnits();

        if ($res['success']) {
            return redirect()->back()->with('success', "Sinkronisasi berhasil! {$res['units_count']} Unit dan {$res['sub_units_count']} Sub Unit berhasil ditarik dari Helpdesk RSAM.");
        }

        return redirect()->back()->with('error', 'Gagal menyinkronkan data unit dari server Helpdesk RSAM.');
    }
}