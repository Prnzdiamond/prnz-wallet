<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('type', 16);
            $table->string('system_code', 32)->nullable();
            $table->string('currency', 8);
            $table->bigInteger('balance')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'currency']);
            $table->unique(['system_code', 'currency']);
        });

        DB::statement("ALTER TABLE wallets ADD CONSTRAINT wallets_currency_check CHECK (currency IN ('NGN', 'USD', 'USDT'))");
        DB::statement(<<<'SQL'
            ALTER TABLE wallets ADD CONSTRAINT wallets_owner_check CHECK (
                (type = 'user' AND user_id IS NOT NULL AND system_code IS NULL AND balance IS NOT NULL AND balance >= 0)
                OR (type = 'system' AND user_id IS NULL AND system_code IS NOT NULL AND balance IS NULL)
            )
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
