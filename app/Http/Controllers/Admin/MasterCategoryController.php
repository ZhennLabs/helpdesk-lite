<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TicketCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterCategoryController extends Controller
{

    public function index(): Response
    {
        $categories = TicketCategory::withCount('tickets')
            ->orderBy('order_index', 'asc')
            ->get();

        return Inertia::render('Admin/Master/Categories', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:ticket_categories,name',
            'description' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:50',
            'order_index' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        TicketCategory::create([
            'name' => $request->name,
            'description' => $request->description,
            'icon' => $request->icon ?: 'ph:folder-bold',
            'order_index' => $request->order_index ?: 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', 'Kategori tiket baru berhasil ditambahkan.');
    }

    public function update(Request $request, TicketCategory $category): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:ticket_categories,name,' . $category->id,
            'description' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:50',
            'order_index' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        $category->update([
            'name' => $request->name,
            'description' => $request->description,
            'icon' => $request->icon ?: 'ph:folder-bold',
            'order_index' => $request->order_index ?: 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', 'Kategori tiket berhasil diperbarui.');
    }

    public function destroy(TicketCategory $category): RedirectResponse
    {
        if ($category->tickets()->count() > 0) {

            $category->update(['is_active' => !$category->is_active]);
            $status = $category->is_active ? 'diaktifkan' : 'dinonaktifkan';
            return redirect()->back()->with('success', "Kategori telah memiliki relasi tiket, status berhasil {$status}.");
        }

        $category->delete();
        return redirect()->back()->with('success', 'Kategori tiket berhasil dihapus.');
    }
}