<?php

namespace Tests\Feature;

use App\Enums\Currency;
use App\Enums\TransactionStatus;
use App\Models\LedgerEntry;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesFundedUsers;
use Tests\TestCase;

class TransferTest extends TestCase
{
    use CreatesFundedUsers, RefreshDatabase;

    private User $sender;

    private User $recipient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sender = $this->fundedUser(['NGN' => '100000'], 'sender@example.com');
        $this->recipient = $this->fundedUser([], 'recipient@example.com');
    }

    private function transfer(array $overrides = [], ?User $as = null)
    {
        return $this->actingAs($as ?? $this->sender)->postJson('/api/transfers', [
            'recipient_email' => 'recipient@example.com',
            'currency' => 'NGN',
            'amount' => '30000',
            'reference' => 'transfer-ref-01',
            'narration' => 'Rent share',
            ...$overrides,
        ]);
    }

    #[Test]
    public function a_transfer_debits_the_sender_and_credits_the_recipient(): void
    {
        $this->transfer()
            ->assertCreated()
            ->assertJsonPath('data.type', 'transfer')
            ->assertJsonPath('data.direction', 'debit')
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.amount', '30000.00')
            ->assertJsonPath('data.balance_after', '70000.00')
            ->assertJsonPath('data.narration', 'Rent share')
            ->assertJsonPath('data.counterparty.email', 'recipient@example.com');

        $this->assertSame('70000.00', $this->balanceOf($this->sender));
        $this->assertSame('30000.00', $this->balanceOf($this->recipient));

        $transaction = Transaction::query()->where('reference', 'transfer-ref-01')->sole();
        $this->assertEqualsCanonicalizing([-3000000, 3000000], $transaction->entries()->pluck('amount')->all());
    }

    #[Test]
    public function the_recipient_sees_the_transfer_as_a_credit(): void
    {
        $id = $this->transfer()->json('data.id');

        $this->actingAs($this->recipient)->getJson("/api/transactions/{$id}")
            ->assertOk()
            ->assertJsonPath('data.direction', 'credit')
            ->assertJsonPath('data.balance_after', '30000.00')
            ->assertJsonPath('data.counterparty.email', 'sender@example.com');
    }

    #[Test]
    public function an_insufficient_balance_is_recorded_as_a_failed_transfer_and_moves_no_money(): void
    {
        $this->transfer(['amount' => '100000.01'])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'insufficient_funds')
            ->assertJsonPath('data.status', 'failed')
            ->assertJsonPath('data.failure_reason', 'insufficient_funds');

        $this->assertSame('100000.00', $this->balanceOf($this->sender));
        $this->assertSame('0.00', $this->balanceOf($this->recipient));

        $transaction = Transaction::query()->where('reference', 'transfer-ref-01')->sole();
        $this->assertSame(TransactionStatus::Failed, $transaction->status);
        $this->assertSame(0, $transaction->entries()->count());
    }

    #[Test]
    public function a_failed_transfer_is_not_shown_to_the_recipient(): void
    {
        $id = $this->transfer(['amount' => '200000'])->json('data.id');

        $this->actingAs($this->recipient)->getJson("/api/transactions/{$id}")->assertNotFound();
        $this->actingAs($this->recipient)->getJson('/api/transactions')->assertJsonCount(0, 'data');
        $this->actingAs($this->sender)->getJson("/api/transactions/{$id}")->assertOk();
    }

    #[Test]
    public function the_exact_balance_can_be_sent(): void
    {
        $this->transfer(['amount' => '100000.00'])->assertCreated();

        $this->assertSame('0.00', $this->balanceOf($this->sender));
    }

    #[Test]
    public function repeating_a_transfer_does_not_send_twice(): void
    {
        $first = $this->transfer()->assertCreated();
        $second = $this->transfer()->assertOk()->assertHeader('Idempotent-Replayed', 'true');

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame('70000.00', $this->balanceOf($this->sender));
        $this->assertSame('30000.00', $this->balanceOf($this->recipient));
    }

    #[Test]
    public function repeating_a_failed_transfer_returns_the_same_failure(): void
    {
        $first = $this->transfer(['amount' => '200000'])->assertUnprocessable();
        $second = $this->transfer(['amount' => '200000'])->assertUnprocessable()->assertHeader('Idempotent-Replayed', 'true');

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, Transaction::query()->where('reference', 'transfer-ref-01')->count());
    }

    #[Test]
    public function reusing_a_transfer_reference_with_different_details_is_a_conflict(): void
    {
        $this->transfer()->assertCreated();

        $this->transfer(['amount' => '1'])->assertConflict()->assertJsonPath('code', 'reference_conflict');
        $this->transfer(['narration' => 'Changed'])->assertConflict();

        $this->assertSame('70000.00', $this->balanceOf($this->sender));
    }

    #[Test]
    public function a_user_cannot_transfer_to_themselves(): void
    {
        $this->transfer(['recipient_email' => 'SENDER@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['recipient_email' => 'You cannot send money to yourself.']);
    }

    #[Test]
    public function an_unknown_recipient_is_rejected(): void
    {
        $this->transfer(['recipient_email' => 'nobody@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['recipient_email' => 'We could not find a user with that email.']);

        $this->assertSame(0, Transaction::query()->where('reference', 'transfer-ref-01')->count());
    }

    #[Test]
    public function transfers_are_limited_to_the_wallet_of_the_chosen_currency(): void
    {
        $this->transfer(['currency' => 'USD', 'amount' => '1'])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'insufficient_funds');

        $this->assertSame('100000.00', $this->balanceOf($this->sender));
    }

    #[Test]
    public function the_sender_cannot_be_spoofed_from_the_request(): void
    {
        $this->transfer([
            'sender_email' => 'recipient@example.com',
            'recipient_email' => 'sender@example.com',
        ], as: $this->recipient)->assertUnprocessable()->assertJsonPath('code', 'insufficient_funds');

        $this->assertSame('100000.00', $this->balanceOf($this->sender));
    }

    #[Test]
    public function the_amount_must_respect_the_transfer_limit(): void
    {
        $this->transfer(['amount' => '5000000.01'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount']);
    }

    #[Test]
    public function the_narration_is_optional_and_bounded(): void
    {
        $this->transfer(['narration' => null])->assertCreated()->assertJsonPath('data.narration', null);
        $this->transfer(['narration' => str_repeat('a', 141), 'reference' => 'transfer-ref-02'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['narration']);
    }

    #[Test]
    public function the_ledger_stays_balanced_after_a_mix_of_operations(): void
    {
        $this->transfer()->assertCreated();
        $this->transfer(['amount' => '999999', 'reference' => 'transfer-ref-02'])->assertUnprocessable();
        $this->transfer(['amount' => '5000', 'reference' => 'transfer-ref-03'], as: $this->sender)->assertCreated();

        $this->assertSame(0, (int) LedgerEntry::query()->sum('amount'));
        $this->artisan('ledger:reconcile')->assertSuccessful();
        $this->assertSame('65000.00', $this->balanceOf($this->sender));
        $this->assertSame('35000.00', $this->balanceOf($this->recipient, Currency::NGN));
    }

    #[Test]
    public function recipient_lookup_confirms_a_name_before_sending(): void
    {
        $this->actingAs($this->sender)->getJson('/api/recipients?email=Recipient@example.com')
            ->assertOk()
            ->assertJsonPath('data.email', 'recipient@example.com')
            ->assertJsonPath('data.name', $this->recipient->name);

        $this->actingAs($this->sender)->getJson('/api/recipients?email=nobody@example.com')->assertNotFound();
        $this->actingAs($this->sender)->getJson('/api/recipients?email=sender@example.com')->assertUnprocessable();
    }
}
