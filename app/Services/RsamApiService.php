<?php

namespace App\Services;

use App\Models\SubUnit;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RsamApiService
{
    // url helpdesk rsam dari env
    protected static function getBaseUrl(): string
    {
        return rtrim(env('HELPDESK_RSAM_API_URL', 'http://127.0.0.1:8000/api/external'), '/');
    }

    // api key rsam dari env
    protected static function getApiKey(): string
    {
        return env('HELPDESK_RSAM_API_KEY', 'rsam-helpdesk-api-secret-key-2026');
    }

    // verifikasi login ke server rsam utama
    public static function verifyCredentials(string $email, string $password): array
    {
        try {
            $url = self::getBaseUrl() . '/auth/verify';
            $response = Http::timeout(6)
                ->withHeaders([
                    'X-API-KEY' => self::getApiKey(),
                    'Accept' => 'application/json',
                ])
                ->post($url, [
                    'email' => $email,
                    'password' => $password,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'user' => $data['user'] ?? null,
                    'message' => $data['message'] ?? 'Autentikasi berhasil',
                ];
            }

            $errorData = $response->json();
            return [
                'success' => false,
                'message' => $errorData['message'] ?? 'Email atau kata sandi tidak valid pada sistem Helpdesk RSAM.',
            ];
        } catch (\Throwable $e) {
            Log::error('RSAM API Verify Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Gagal terhubung ke server autentikasi helpdesk-rsam: ' . $e->getMessage(),
            ];
        }
    }

    // sync akun user dari rsam ke db lokal (role selalu user)
    public static function syncOrCreateUser(array $remoteUser): User
    {
        $email = strtolower(trim($remoteUser['email']));
        $existing = User::where('email', $email)->first();

        $role = ($existing && $existing->role === 'admin') ? 'admin' : 'user';

        $userData = [
            'rsam_user_id' => $remoteUser['id'] ?? null,
            'name' => $remoteUser['name'] ?? 'User',
            'unit' => $remoteUser['unit'] ?? null,
            'sub_unit' => $remoteUser['sub_unit'] ?? null,
            'role' => $role,
            'avatar_url' => $remoteUser['avatar_url'] ?? null,
            'is_active' => true,
        ];

        // simpan password hash dari RSAM biar user bisa login di kedua web dengan password yang sama
        if (!empty($remoteUser['password'])) {
            $userData['password'] = $remoteUser['password'];
        }

        return User::updateOrCreate(['email' => $email], $userData);
    }

    // tarik daftar user dari rsam
    public static function fetchRemoteUsers(array $params = []): array
    {
        try {
            $url = self::getBaseUrl() . '/users';
            $response = Http::timeout(8)
                ->withHeaders([
                    'X-API-KEY' => self::getApiKey(),
                    'Accept' => 'application/json',
                ])
                ->get($url, $params);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'data' => []];
        } catch (\Throwable $e) {
            Log::error('RSAM API Fetch Users Error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage(), 'data' => []];
        }
    }

    // tarik unit & sub unit dari rsam
    public static function fetchRemoteUnits(): array
    {
        try {
            $url = self::getBaseUrl() . '/units';
            $response = Http::timeout(8)
                ->withHeaders([
                    'X-API-KEY' => self::getApiKey(),
                    'Accept' => 'application/json',
                ])
                ->get($url);

            if ($response->successful()) {
                return $response->json();
            }

            return ['success' => false, 'data' => []];
        } catch (\Throwable $e) {
            Log::error('RSAM API Fetch Units Error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage(), 'data' => []];
        }
    }

    // simpan sync unit ke db lokal
    public static function syncRemoteUnits(): array
    {
        $remote = self::fetchRemoteUnits();
        $unitsData = $remote['data'] ?? [];

        $syncedUnitsCount = 0;
        $syncedSubUnitsCount = 0;

        foreach ($unitsData as $rUnit) {
            $unit = Unit::updateOrCreate(
                ['name' => trim($rUnit['name'])],
                [
                    'rsam_unit_id' => $rUnit['id'] ?? null,
                    'source' => 'rsam',
                    'is_active' => true,
                ]
            );
            $syncedUnitsCount++;

            if (!empty($rUnit['sub_units']) && is_array($rUnit['sub_units'])) {
                foreach ($rUnit['sub_units'] as $rSub) {
                    SubUnit::updateOrCreate(
                        [
                            'unit_id' => $unit->id,
                            'name' => trim($rSub['name']),
                        ],
                        [
                            'rsam_sub_unit_id' => $rSub['id'] ?? null,
                            'source' => 'rsam',
                            'is_active' => true,
                        ]
                    );
                    $syncedSubUnitsCount++;
                }
            }
        }

        return [
            'success' => true,
            'units_count' => $syncedUnitsCount,
            'sub_units_count' => $syncedSubUnitsCount,
        ];
    }
}
