<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RsamApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class MasterUserController extends Controller
{
    /**
     * Tampilkan halaman Master Pengguna:
     * - Daftar Admin (bisa tambah / edit / hapus)
     * - Daftar User (read-only, bersumber dari API RSAM)
     */
    public function index(Request $request): Response
    {
        $admins = User::where('role', 'admin')
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'email', 'unit', 'sub_unit', 'role', 'avatar_url', 'is_active', 'created_at']);

        $userQuery = User::where('role', 'user')
            ->withCount('tickets')
            ->orderBy('name', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $userQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('unit', 'like', "%{$search}%")
                  ->orWhere('sub_unit', 'like', "%{$search}%");
            });
        }

        $regularUsers = $userQuery->get(['id', 'name', 'email', 'unit', 'sub_unit', 'role', 'avatar_url', 'is_active', 'created_at']);

        return Inertia::render('Admin/Master/Users', [
            'admins' => $admins,
            'regularUsers' => $regularUsers,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Tambah akun Administrator baru (Khusus Role Admin lokal)
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'unit' => 'nullable|string|max:100',
            'sub_unit' => 'nullable|string|max:100',
        ]);

        User::create([
            'name' => $request->name,
            'email' => strtolower(trim($request->email)),
            'password' => Hash::make($request->password),
            'role' => 'admin', // Selalu admin
            'unit' => $request->unit ?: 'Management / IT',
            'sub_unit' => $request->sub_unit ?: 'Helpdesk Admin',
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Akun Administrator baru berhasil ditambahkan.');
    }

    /**
     * Update akun Administrator
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        if ($user->role !== 'admin') {
            abort(403, 'Hanya akun administrator yang dapat dikelola secara lokal.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'unit' => 'nullable|string|max:100',
            'sub_unit' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $updateData = [
            'name' => $request->name,
            'email' => strtolower(trim($request->email)),
            'unit' => $request->unit,
            'sub_unit' => $request->sub_unit,
            'is_active' => $request->boolean('is_active', true),
        ];

        if ($request->filled('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        return redirect()->back()->with('success', 'Data administrator berhasil diperbarui.');
    }

    /**
     * Hapus akun Administrator
     */
    public function destroy(User $user): RedirectResponse
    {
        if ($user->role !== 'admin') {
            abort(403, 'Hanya akun administrator yang dapat dihapus dari sistem lokal.');
        }

        if ($user->id === Auth::id()) {
            return redirect()->back()->with('error', 'Anda tidak dapat menghapus akun admin yang sedang Anda gunakan.');
        }

        $user->delete();
        return redirect()->back()->with('success', 'Akun administrator berhasil dihapus.');
    }

    /**
     * Sinkronisasi penarikan daftar user dari API Helpdesk RSAM
     */
    public function syncFromRsam(): RedirectResponse
    {
        $remote = RsamApiService::fetchRemoteUsers(['limit' => 200]);

        if (!empty($remote['data']) && is_array($remote['data'])) {
            $count = 0;
            foreach ($remote['data'] as $rUser) {
                RsamApiService::syncOrCreateUser($rUser);
                $count++;
            }
            return redirect()->back()->with('success', "Berhasil menyinkronkan {$count} akun pegawai dari Helpdesk RSAM.");
        }

        return redirect()->back()->with('error', 'Gagal menyinkronkan data pengguna dari server Helpdesk RSAM.');
    }
}
