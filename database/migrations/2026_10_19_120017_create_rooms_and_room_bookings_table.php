<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->integer('capacity')->default(20);
            $table->string('location');
            $table->json('facilities')->nullable();
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('color')->default('#0D9488');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('room_bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_number')->unique();
            $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('booker_name');
            $table->string('booker_unit');
            $table->string('booker_phone')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('participants_count')->default(1);
            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->json('extra_facilities')->nullable();
            $table->string('status')->default('pending'); // pending, approved, in_use, completed, rejected, cancelled
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            $table->index(['room_id', 'booking_date']);
            $table->index(['booking_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('room_bookings');
        Schema::dropIfExists('rooms');
    }
};
