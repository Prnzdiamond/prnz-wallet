<?php

namespace Tests\Feature;

use App\Enums\Currency;
use App\Enums\SystemWallet;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\WalletType;
use App\Models\LedgerEntry;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LedgerSchemaTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function user_wallet_balance_cannot_go_negative(): void
    {
        $wallet = Wallet::factory()->create(['balance' => 100]);

        $this->expectException(QueryException::class);

        DB::table('wallets')->where('id', $wallet->id)->update(['balance' => -1]);
    }

    #[Test]
    public function system_wallet_cannot_hold_a_cached_balance(): void
    {
        $this->expectException(QueryException::class);

        DB::table('wallets')->insert([
            'public_id' => (string) Str::ulid(),
            'type' => WalletType::System->value,
            'system_code' => 'other',
            'currency' => Currency::NGN->value,
            'balance' => 0,
        ]);
    }

    #[Test]
    public function a_user_has_one_wallet_per_currency(): void
    {
        $user = User::factory()->create();
        Wallet::factory()->for($user)->create();

        $this->expectException(QueryException::class);

        Wallet::factory()->for($user)->create();
    }

    #[Test]
    public function balanced_entries_are_accepted(): void
    {
        [$transaction, $from, $to] = $this->transfer(500);

        $this->entries($transaction, $from, $to, 500);
        DB::statement('SET CONSTRAINTS ALL IMMEDIATE');

        $this->assertSame(0, (int) LedgerEntry::query()->where('transaction_id', $transaction->id)->sum('amount'));
    }

    #[Test]
    public function unbalanced_entries_are_rejected(): void
    {
        [$transaction, $from, $to] = $this->transfer(500);

        LedgerEntry::query()->create(['transaction_id' => $transaction->id, 'wallet_id' => $from->id, 'amount' => -500, 'balance_after' => 0]);
        LedgerEntry::query()->create(['transaction_id' => $transaction->id, 'wallet_id' => $to->id, 'amount' => 400, 'balance_after' => 400]);

        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('do not sum to zero');

        DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
    }

    #[Test]
    public function ledger_entries_cannot_be_updated(): void
    {
        [$transaction, $from, $to] = $this->transfer(500);
        $this->entries($transaction, $from, $to, 500);

        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('ledger_entries is append-only');

        DB::table('ledger_entries')->where('transaction_id', $transaction->id)->update(['amount' => 1]);
    }

    #[Test]
    public function ledger_entries_cannot_be_deleted(): void
    {
        [$transaction, $from, $to] = $this->transfer(500);
        $this->entries($transaction, $from, $to, 500);

        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('ledger_entries is append-only');

        DB::table('ledger_entries')->where('transaction_id', $transaction->id)->delete();
    }

    #[Test]
    public function transaction_status_can_change_but_financial_fields_cannot(): void
    {
        [$transaction] = $this->transfer(500);

        $transaction->transitionTo(TransactionStatus::Completed);
        $this->assertSame(TransactionStatus::Completed, $transaction->fresh()->status);

        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('financial fields are immutable');

        DB::table('transactions')->where('id', $transaction->id)->update(['amount' => 1]);
    }

    #[Test]
    public function transactions_cannot_be_deleted(): void
    {
        [$transaction] = $this->transfer(500);

        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('transactions is append-only');

        DB::table('transactions')->where('id', $transaction->id)->delete();
    }

    #[Test]
    public function a_reference_is_unique_per_initiator(): void
    {
        [$transaction, $from, $to] = $this->transfer(500, 'REF-1');

        $this->transfer(500, 'REF-1', initiator: $to->user);
        $this->assertSame(2, Transaction::query()->where('reference', 'REF-1')->count());

        $this->expectException(QueryException::class);

        $this->transfer(500, 'REF-1', initiator: $transaction->initiator, from: $from, to: $to);
    }

    #[Test]
    public function a_failed_transaction_must_carry_a_reason(): void
    {
        [$transaction] = $this->transfer(500);

        $this->expectException(QueryException::class);

        DB::table('transactions')->where('id', $transaction->id)->update(['status' => 'failed']);
    }

    #[Test]
    public function system_wallets_are_seeded_for_every_currency(): void
    {
        foreach (Currency::cases() as $currency) {
            $this->assertTrue(Wallet::query()->system(SystemWallet::FundingClearing, $currency)->exists());
        }
    }

    /**
     * @return array{Transaction, Wallet, Wallet}
     */
    private function transfer(int $amount, ?string $reference = null, ?User $initiator = null, ?Wallet $from = null, ?Wallet $to = null): array
    {
        $from ??= Wallet::factory()->create(['balance' => $amount]);
        $to ??= Wallet::factory()->create();
        $initiator ??= $from->user;

        $transaction = Transaction::query()->create([
            'reference' => $reference ?? (string) Str::uuid(),
            'type' => TransactionType::Transfer,
            'status' => TransactionStatus::Pending,
            'currency' => Currency::NGN,
            'amount' => $amount,
            'initiator_id' => $initiator->id,
            'source_wallet_id' => $from->id,
            'destination_wallet_id' => $to->id,
            'request_hash' => hash('sha256', (string) $amount),
        ]);

        return [$transaction, $from, $to];
    }

    private function entries(Transaction $transaction, Wallet $from, Wallet $to, int $amount): void
    {
        LedgerEntry::query()->create(['transaction_id' => $transaction->id, 'wallet_id' => $from->id, 'amount' => -$amount, 'balance_after' => 0]);
        LedgerEntry::query()->create(['transaction_id' => $transaction->id, 'wallet_id' => $to->id, 'amount' => $amount, 'balance_after' => $amount]);
    }
}
