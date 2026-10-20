<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RsamApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    // halaman form login
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
            'canResetPassword' => false,
        ]);
    }

    // proses login
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim($request->email));
        $password = $request->password;
        $remember = $request->boolean('remember');

        // cek admin lokal dulu
        $localAdmin = User::where('email', $email)->where('role', 'admin')->first();

        if ($localAdmin) {
            if (Auth::attempt(['email' => $email, 'password' => $password], $remember)) {
                $request->session()->regenerate();
                return redirect()->intended(route('admin.dashboard'));
            }

            throw ValidationException::withMessages([
                'password' => 'Kata sandi akun administrator tidak sesuai.',
            ]);
        }

        // kalau user biasa, verifikasi ke api helpdesk rsam
        $rsamAuth = RsamApiService::verifyCredentials($email, $password);

        if ($rsamAuth['success'] && !empty($rsamAuth['user'])) {
            // sync data akun user lokal
            $user = RsamApiService::syncOrCreateUser($rsamAuth['user']);

            Auth::login($user, $remember);
            $request->session()->regenerate();

            return redirect()->intended(route('dashboard'));
        }

        throw ValidationException::withMessages([
            'email' => $rsamAuth['message'] ?: 'Email atau kata sandi tidak cocok dengan akun pengguna Helpdesk RSAM.',
        ]);
    }

    // proses logout
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
