<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->index(['status', 'updated_at'], 'tickets_status_updated_idx');
            $table->index(['user_id', 'created_at'], 'tickets_user_created_idx');
        });

        Schema::table('ticket_messages', function (Blueprint $table) {
            $table->index(['ticket_id', 'created_at'], 'ticket_messages_ticket_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('tickets_status_updated_idx');
            $table->dropIndex('tickets_user_created_idx');
        });

        Schema::table('ticket_messages', function (Blueprint $table) {
            $table->dropIndex('ticket_messages_ticket_created_idx');
        });
    }
};
