<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('reference', 100);
            $table->string('type', 16);
            $table->string('status', 16);
            $table->string('currency', 8);
            $table->bigInteger('amount');
            $table->foreignId('initiator_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('source_wallet_id')->constrained('wallets')->restrictOnDelete();
            $table->foreignId('destination_wallet_id')->constrained('wallets')->restrictOnDelete();
            $table->foreignId('reverses_transaction_id')->nullable()->unique()->constrained('transactions')->restrictOnDelete();
            $table->string('narration', 255)->nullable();
            $table->string('failure_reason', 64)->nullable();
            $table->char('request_hash', 64);
            $table->jsonb('metadata')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['initiator_id', 'reference']);
            $table->index(['source_wallet_id', 'created_at']);
            $table->index(['destination_wallet_id', 'created_at']);
        });

        DB::statement('ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check CHECK (amount > 0)');
        DB::statement('ALTER TABLE transactions ADD CONSTRAINT transactions_wallets_check CHECK (source_wallet_id <> destination_wallet_id)');
        DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_currency_check CHECK (currency IN ('NGN', 'USD', 'USDT'))");
        DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('funding', 'transfer', 'reversal'))");
        DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('pending', 'completed', 'failed', 'reversed'))");
        DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_failure_check CHECK ((status = 'failed') = (failure_reason IS NOT NULL))");
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
