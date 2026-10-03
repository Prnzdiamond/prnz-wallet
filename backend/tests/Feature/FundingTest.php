<?php

namespace Tests\Feature;

use App\Enums\Currency;
use App\Enums\SystemWallet;
use App\Models\LedgerEntry;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesFundedUsers;
use Tests\TestCase;

class FundingTest extends TestCase
{
    use CreatesFundedUsers, RefreshDatabase;

    #[Test]
    public function funding_credits_the_wallet_and_records_a_balanced_transaction(): void
    {
        $user = $this->fundedUser();

        $response = $this->actingAs($user)->postJson('/api/wallets/fund', [
            'currency' => 'NGN',
            'amount' => '1500.50',
            'reference' => 'fund-ref-0001',
        ]);

        $response->assertCreated()
            ->assertHeader('Idempotent-Replayed', 'false')
            ->assertJsonPath('data.type', 'funding')
            ->assertJsonPath('data.direction', 'credit')
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.amount', '1500.50')
            ->assertJsonPath('data.balance_after', '1500.50')
            ->assertJsonPath('data.reference', 'fund-ref-0001');

        $this->assertSame('1500.50', $this->balanceOf($user));

        $transaction = Transaction::query()->where('reference', 'fund-ref-0001')->sole();
        $clearing = Wallet::query()->system(SystemWallet::FundingClearing, Currency::NGN)->sole();

        $this->assertSame(0, (int) $transaction->entries()->sum('amount'));
        $this->assertSame(-150050, (int) LedgerEntry::query()->where('wallet_id', $clearing->id)->sum('amount'));
        $this->assertNull($clearing->fresh()->balance);
    }

    #[Test]
    public function each_currency_is_funded_independently_at_its_own_precision(): void
    {
        $user = $this->fundedUser();

        $this->actingAs($user)->postJson('/api/wallets/fund', ['currency' => 'USDT', 'amount' => '10.123456', 'reference' => 'fund-usdt-01'])->assertCreated();
        $this->actingAs($user)->postJson('/api/wallets/fund', ['currency' => 'USD', 'amount' => '25', 'reference' => 'fund-usd-001'])->assertCreated();

        $this->assertSame('10.123456', $this->balanceOf($user, Currency::USDT));
        $this->assertSame('25.00', $this->balanceOf($user, Currency::USD));
        $this->assertSame('0.00', $this->balanceOf($user, Currency::NGN));
    }

    public static function invalidFunding(): array
    {
        return [
            'zero' => [['currency' => 'NGN', 'amount' => '0'], 'amount'],
            'negative' => [['currency' => 'NGN', 'amount' => '-100'], 'amount'],
            'too many decimals' => [['currency' => 'NGN', 'amount' => '10.001'], 'amount'],
            'json number instead of string' => [['currency' => 'NGN', 'amount' => 100], 'amount'],
            'not a number' => [['currency' => 'NGN', 'amount' => 'abc'], 'amount'],
            'above the limit' => [['currency' => 'NGN', 'amount' => '10000000.01'], 'amount'],
            'unsupported currency' => [['currency' => 'EUR', 'amount' => '100'], 'currency'],
            'missing amount' => [['currency' => 'NGN'], 'amount'],
            'missing reference' => [['currency' => 'NGN', 'amount' => '100', 'reference' => null], 'reference'],
            'unsafe reference' => [['currency' => 'NGN', 'amount' => '100', 'reference' => 'ref with spaces'], 'reference'],
        ];
    }

    #[Test]
    #[DataProvider('invalidFunding')]
    public function invalid_funding_is_rejected_and_changes_nothing(array $payload, string $field): void
    {
        $user = $this->fundedUser();

        $this->actingAs($user)
            ->postJson('/api/wallets/fund', [...['reference' => 'fund-ref-0001'], ...$payload])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$field]);

        $this->assertSame('0.00', $this->balanceOf($user));
        $this->assertSame(0, Transaction::query()->count());
    }

    #[Test]
    public function repeating_a_funding_request_does_not_credit_twice(): void
    {
        $user = $this->fundedUser();
        $payload = ['currency' => 'NGN', 'amount' => '5000', 'reference' => 'fund-ref-0001'];

        $first = $this->actingAs($user)->postJson('/api/wallets/fund', $payload)->assertCreated();
        $second = $this->actingAs($user)->postJson('/api/wallets/fund', $payload)
            ->assertOk()
            ->assertHeader('Idempotent-Replayed', 'true');

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame('5000.00', $this->balanceOf($user));
        $this->assertSame(1, Transaction::query()->count());
    }

    #[Test]
    public function reusing_a_reference_for_a_different_request_is_a_conflict(): void
    {
        $user = $this->fundedUser();

        $this->actingAs($user)->postJson('/api/wallets/fund', ['currency' => 'NGN', 'amount' => '5000', 'reference' => 'fund-ref-0001'])->assertCreated();

        $this->actingAs($user)->postJson('/api/wallets/fund', ['currency' => 'NGN', 'amount' => '9000', 'reference' => 'fund-ref-0001'])
            ->assertConflict()
            ->assertJsonPath('code', 'reference_conflict');

        $this->assertSame('5000.00', $this->balanceOf($user));
    }

    #[Test]
    public function different_users_may_use_the_same_reference(): void
    {
        $ada = $this->fundedUser();
        $tunde = $this->fundedUser();
        $payload = ['currency' => 'NGN', 'amount' => '100', 'reference' => 'shared-ref-01'];

        $this->actingAs($ada)->postJson('/api/wallets/fund', $payload)->assertCreated();
        $this->actingAs($tunde)->postJson('/api/wallets/fund', $payload)->assertCreated();

        $this->assertSame('100.00', $this->balanceOf($ada));
        $this->assertSame('100.00', $this->balanceOf($tunde));
    }

    #[Test]
    public function the_client_cannot_choose_which_wallet_is_credited(): void
    {
        $ada = $this->fundedUser();
        $tunde = $this->fundedUser();
        $tundeWallet = $tunde->wallets()->where('currency', 'NGN')->value('public_id');

        $this->actingAs($ada)->postJson('/api/wallets/fund', [
            'currency' => 'NGN',
            'amount' => '100',
            'reference' => 'fund-ref-0001',
            'wallet_id' => $tundeWallet,
            'user_id' => $tunde->public_id,
        ])->assertCreated();

        $this->assertSame('100.00', $this->balanceOf($ada));
        $this->assertSame('0.00', $this->balanceOf($tunde));
    }

    #[Test]
    public function wallets_endpoint_lists_only_the_users_own_balances_as_strings(): void
    {
        $user = $this->fundedUser(['NGN' => '100000', 'USDT' => '1.5']);
        $this->fundedUser(['NGN' => '999']);

        $this->actingAs($user)->getJson('/api/wallets')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.currency', 'NGN')
            ->assertJsonPath('data.0.balance', '100000.00')
            ->assertJsonPath('data.2.currency', 'USDT')
            ->assertJsonPath('data.2.balance', '1.500000')
            ->assertJsonMissingPath('data.0.user_id');
    }
}
