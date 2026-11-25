<?php

use App\Http\Controllers\Admin\AdminRoomBookingController;
use App\Http\Controllers\Admin\AdminTicketController;
use App\Http\Controllers\Admin\MasterCategoryController;
use App\Http\Controllers\Admin\MasterRoomController;
use App\Http\Controllers\Admin\MasterUnitController;
use App\Http\Controllers\Admin\MasterUrgencyController;
use App\Http\Controllers\Admin\MasterUserController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\RoomBookingController;
use App\Http\Controllers\TicketController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;


Route::get('/', function () {
    if (Auth::check()) {
        return Auth::user()->isAdmin() 
            ? redirect()->route('admin.dashboard') 
            : redirect()->route('dashboard');
    }
    return redirect()->route('login');
});


Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'create'])->name('login');
    Route::post('/login', [LoginController::class, 'store'])->middleware('throttle:5,1');
});


Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');


Route::middleware(['auth', 'role:user'])->group(function () {
    Route::get('/dashboard', [TicketController::class, 'index'])->name('dashboard');
    Route::post('/tickets', [TicketController::class, 'store'])->name('tickets.store')->middleware('throttle:30,1');
    Route::post('/tickets/{ticket}/reply', [TicketController::class, 'reply'])->name('tickets.reply')->middleware('throttle:30,1');

    
    Route::get('/room-bookings', [RoomBookingController::class, 'index'])->name('room-bookings.index');
    Route::post('/room-bookings', [RoomBookingController::class, 'store'])->name('room-bookings.store')->middleware('throttle:30,1');
    Route::post('/room-bookings/{booking}/cancel', [RoomBookingController::class, 'cancel'])->name('room-bookings.cancel')->middleware('throttle:30,1');
    Route::get('/api/room-bookings/check-availability', [RoomBookingController::class, 'checkAvailability'])->name('room-bookings.check-availability')->middleware('throttle:60,1');
});


Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [AdminTicketController::class, 'index'])->name('dashboard');
    Route::get('/logs', [AdminTicketController::class, 'logs'])->name('logs');
    Route::get('/logs/export', [AdminTicketController::class, 'exportLogs'])->name('logs.export');
    Route::post('/tickets/{ticket}/status', [AdminTicketController::class, 'updateStatus'])->name('tickets.updateStatus');
    Route::post('/tickets/{ticket}/reply', [AdminTicketController::class, 'reply'])->name('tickets.reply');

    
    Route::get('/room-bookings', [AdminRoomBookingController::class, 'index'])->name('room-bookings.index');
    Route::post('/room-bookings', [AdminRoomBookingController::class, 'store'])->name('room-bookings.store');
    Route::post('/room-bookings/{booking}/status', [AdminRoomBookingController::class, 'updateStatus'])->name('room-bookings.status');
    Route::delete('/room-bookings/{booking}', [AdminRoomBookingController::class, 'destroy'])->name('room-bookings.destroy');

    
    Route::get('/master/rooms', [MasterRoomController::class, 'index'])->name('master.rooms.index');
    Route::post('/master/rooms', [MasterRoomController::class, 'store'])->name('master.rooms.store');
    Route::match(['put', 'patch'], '/master/rooms/{room}', [MasterRoomController::class, 'update'])->name('master.rooms.update');
    Route::delete('/master/rooms/{room}', [MasterRoomController::class, 'destroy'])->name('master.rooms.destroy');

    
    Route::get('/master/categories', [MasterCategoryController::class, 'index'])->name('master.categories.index');
    Route::post('/master/categories', [MasterCategoryController::class, 'store'])->name('master.categories.store');
    Route::match(['put', 'patch'], '/master/categories/{category}', [MasterCategoryController::class, 'update'])->name('master.categories.update');
    Route::delete('/master/categories/{category}', [MasterCategoryController::class, 'destroy'])->name('master.categories.destroy');

    Route::get('/master/urgencies', [MasterUrgencyController::class, 'index'])->name('master.urgencies.index');
    Route::post('/master/urgencies', [MasterUrgencyController::class, 'store'])->name('master.urgencies.store');
    Route::match(['put', 'patch'], '/master/urgencies/{urgency}', [MasterUrgencyController::class, 'update'])->name('master.urgencies.update');
    Route::delete('/master/urgencies/{urgency}', [MasterUrgencyController::class, 'destroy'])->name('master.urgencies.destroy');

    
    Route::get('/master/units', [MasterUnitController::class, 'index'])->name('master.units.index');
    Route::post('/master/units', [MasterUnitController::class, 'store'])->name('master.units.store');
    Route::match(['put', 'patch'], '/master/units/{unit}', [MasterUnitController::class, 'update'])->name('master.units.update');
    Route::delete('/master/units/{unit}', [MasterUnitController::class, 'destroy'])->name('master.units.destroy');

    Route::post('/master/units/{unit}/sub-units', [MasterUnitController::class, 'storeSubUnit'])->name('master.units.sub-units.store');
    Route::match(['put', 'patch'], '/master/sub-units/{subUnit}', [MasterUnitController::class, 'updateSubUnit'])->name('master.sub-units.update');
    Route::delete('/master/sub-units/{subUnit}', [MasterUnitController::class, 'destroySubUnit'])->name('master.sub-units.destroy');
    Route::post('/master/units/sync-rsam', [MasterUnitController::class, 'syncFromRsam'])->name('master.units.sync')->middleware('throttle:10,1');

    
    Route::get('/master/users', [MasterUserController::class, 'index'])->name('master.users.index');
    Route::post('/master/users', [MasterUserController::class, 'store'])->name('master.users.store');
    Route::match(['put', 'patch'], '/master/users/{user}', [MasterUserController::class, 'update'])->name('master.users.update');
    Route::delete('/master/users/{user}', [MasterUserController::class, 'destroy'])->name('master.users.destroy');
    Route::post('/master/users/sync-rsam', [MasterUserController::class, 'syncFromRsam'])->name('master.users.sync')->middleware('throttle:10,1');
});
