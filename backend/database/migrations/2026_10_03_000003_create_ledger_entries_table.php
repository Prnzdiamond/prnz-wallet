<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->restrictOnDelete();
            $table->foreignId('wallet_id')->constrained()->restrictOnDelete();
            $table->bigInteger('amount');
            $table->bigInteger('balance_after')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['transaction_id', 'wallet_id']);
            $table->index(['wallet_id', 'id']);
        });

        DB::statement('ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_amount_check CHECK (amount <> 0)');

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION reject_mutation() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER ledger_entries_no_update_delete
                BEFORE UPDATE OR DELETE ON ledger_entries
                FOR EACH ROW EXECUTE FUNCTION reject_mutation();

            CREATE OR REPLACE FUNCTION ledger_entries_balanced() RETURNS trigger AS $$
            BEGIN
                IF (SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE transaction_id = NEW.transaction_id) <> 0 THEN
                    RAISE EXCEPTION 'ledger entries for transaction % do not sum to zero', NEW.transaction_id;
                END IF;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;

            CREATE CONSTRAINT TRIGGER ledger_entries_zero_sum
                AFTER INSERT ON ledger_entries
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION ledger_entries_balanced();

            CREATE OR REPLACE FUNCTION transactions_guard_immutable() RETURNS trigger AS $$
            BEGIN
                IF (NEW.public_id, NEW.reference, NEW.type, NEW.currency, NEW.amount, NEW.initiator_id,
                    NEW.source_wallet_id, NEW.destination_wallet_id, NEW.reverses_transaction_id, NEW.request_hash)
                   IS DISTINCT FROM
                   (OLD.public_id, OLD.reference, OLD.type, OLD.currency, OLD.amount, OLD.initiator_id,
                    OLD.source_wallet_id, OLD.destination_wallet_id, OLD.reverses_transaction_id, OLD.request_hash) THEN
                    RAISE EXCEPTION 'transaction financial fields are immutable';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER transactions_immutable_fields
                BEFORE UPDATE ON transactions
                FOR EACH ROW EXECUTE FUNCTION transactions_guard_immutable();

            CREATE TRIGGER transactions_no_delete
                BEFORE DELETE ON transactions
                FOR EACH ROW EXECUTE FUNCTION reject_mutation();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS transactions_no_delete ON transactions;
            DROP TRIGGER IF EXISTS transactions_immutable_fields ON transactions;
            DROP FUNCTION IF EXISTS transactions_guard_immutable();
        SQL);
        Schema::dropIfExists('ledger_entries');
        DB::unprepared(<<<'SQL'
            DROP FUNCTION IF EXISTS ledger_entries_balanced();
            DROP FUNCTION IF EXISTS reject_mutation();
        SQL);
    }
};
