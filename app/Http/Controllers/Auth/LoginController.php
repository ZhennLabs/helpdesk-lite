<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RsamApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
            'canResetPassword' => false,
        ]);
    }

    
    // cek akun lokal dulu sebelum fallback ke api rsam
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim($request->email));
        $password = $request->password;
        $remember = $request->boolean('remember');
        // batasi percobaan login biar ga kena brute force
        $throttleKey = 'login:' . sha1($email . '|' . $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            Log::warning('Security Incident: Login rate limit exceeded', [
                'email' => $email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            throw ValidationException::withMessages([
                'email' => "Terlalu banyak percobaan login. Silakan coba lagi dalam {$seconds} detik.",
            ]);
        }

        
        if (Auth::attempt(['email' => $email, 'password' => $password], $remember)) {
            $user = Auth::user();
            if (!$user->is_active) {
                Auth::logout();
                RateLimiter::hit($throttleKey, 60);
                Log::warning('Security Incident: Deactivated user login attempt', [
                    'email' => $email,
                    'ip' => $request->ip(),
                ]);
                throw ValidationException::withMessages([
                    'email' => 'Akun Anda sedang dinonaktifkan. Hubungi administrator.',
                ]);
            }
            RateLimiter::clear($throttleKey);
            $request->session()->regenerate();
            return redirect()->intended($user->isAdmin() ? route('admin.dashboard') : route('dashboard'));
        }

        
        
        $rsamAuth = RsamApiService::verifyCredentials($email, $password);

        if ($rsamAuth['success'] && !empty($rsamAuth['user'])) {
            
            $user = RsamApiService::syncOrCreateUser($rsamAuth['user']);

            if (!$user->is_active) {
                RateLimiter::hit($throttleKey, 60);
                Log::warning('Security Incident: Deactivated user RSAM fallback login attempt', [
                    'email' => $email,
                    'ip' => $request->ip(),
                ]);
                throw ValidationException::withMessages([
                    'email' => 'Akun Anda sedang dinonaktifkan. Hubungi administrator.',
                ]);
            }

            RateLimiter::clear($throttleKey);
            Auth::login($user, $remember);
            $request->session()->regenerate();

            return redirect()->intended($user->isAdmin() ? route('admin.dashboard') : route('dashboard'));
        }

        RateLimiter::hit($throttleKey, 60);
        Log::warning('Security Incident: Failed login attempt', [
            'email' => $email,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        throw ValidationException::withMessages([
            'email' => $rsamAuth['message'] ?: 'Email atau kata sandi tidak cocok dengan akun Helpdesk RSAM.',
        ]);
    }

    
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
