@echo off
title Helpdesk Lite Launcher
echo ======================================================================
echo                HELPDESK LITE - LOCAL SERVER LAUNCHER
echo ======================================================================
echo   Aplikasi Web   : http://127.0.0.1:8001 (Port 8001)
echo   Reverb Socket  : Port 8082
echo   (Bebas konflik dengan Helpdesk RSAM di Port 8000 & 8080/8081)
echo ======================================================================
echo.

:: Hapus sisa file public\hot jika ada agar tidak memicu ERR_CONNECTION_REFUSED
if exist public\hot del /f /q public\hot

start "Helpdesk Lite - Web Server (Port 8001)" cmd /k "title Helpdesk Lite Web (8001) && php artisan serve --host=127.0.0.1 --port=8001"
start "Helpdesk Lite - Reverb WebSocket (Port 8082)" cmd /k "title Helpdesk Lite Reverb (8082) && php artisan reverb:start --host=127.0.0.1 --port=8082"

echo [OK] Layanan Web dan Reverb berhasil dijalankan di 127.0.0.1!
echo Silakan buka browser di: http://127.0.0.1:8001
echo Tekan tombol apa saja untuk menutup launcher ini.
pause > nul