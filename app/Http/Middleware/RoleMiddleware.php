<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();
        if (!$user) return redirect()->route('login');
        if (!$user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            return redirect()->route('login')->with('error', 'Akun Anda sedang dinonaktifkan.');
        }
        if (!in_array($user->role, $roles, true)) {
            return $user->role === 'admin' ? redirect()->route('admin.dashboard') : redirect()->route('dashboard');
        }
        return $next($request);
    }
}
