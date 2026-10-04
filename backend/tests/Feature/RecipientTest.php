<?php

namespace Tests\Feature;

use App\Actions\TransferFunds;
use App\Enums\Currency;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesFundedUsers;
use Tests\TestCase;

class RecipientTest extends TestCase
{
    use CreatesFundedUsers, RefreshDatabase;

    private function send(User $from, User $to, int $amount = 100): void
    {
        app(TransferFunds::class)($from, $to, Currency::NGN, $amount, (string) Str::uuid());
    }

    #[Test]
    public function every_account_gets_a_unique_ten_digit_account_number(): void
    {
        $users = collect(range(1, 5))->map(fn () => $this->fundedUser());

        $users->each(fn (User $user) => $this->assertMatchesRegularExpression('/^[1-9]\d{9}$/', $user->account_number));
        $this->assertCount(5, $users->pluck('account_number')->unique());
    }

    #[Test]
    public function the_database_rejects_a_malformed_account_number(): void
    {
        $this->expectException(QueryException::class);

        DB::table('users')->where('id', $this->fundedUser()->id)->update(['account_number' => '0123456789']);
    }

    #[Test]
    public function the_database_rejects_a_duplicate_account_number(): void
    {
        $taken = $this->fundedUser()->account_number;

        $this->expectException(QueryException::class);

        DB::table('users')->where('id', $this->fundedUser()->id)->update(['account_number' => $taken]);
    }

    #[Test]
    public function the_profile_includes_the_account_number(): void
    {
        $user = $this->fundedUser();

        $this->actingAs($user)->getJson('/api/auth/me')->assertJsonPath('data.account_number', $user->account_number);
    }

    #[Test]
    public function a_recipient_can_be_resolved_by_account_number_or_email_with_a_masked_email(): void
    {
        $sender = $this->fundedUser();
        $tunde = $this->fundedUser(email: 'tunde@example.com');

        foreach ([$tunde->account_number, 'TUNDE@example.com'] as $identifier) {
            $this->actingAs($sender)->getJson('/api/recipients?identifier='.urlencode($identifier))
                ->assertOk()
                ->assertExactJson(['data' => [
                    'name' => $tunde->name,
                    'account_number' => $tunde->account_number,
                    'email_masked' => 't***@example.com',
                ]]);
        }
    }

    #[Test]
    public function resolving_an_unknown_or_own_account_is_rejected(): void
    {
        $sender = $this->fundedUser();

        $this->actingAs($sender)->getJson('/api/recipients?identifier=1234567890')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['identifier' => 'We could not find an account with those details.']);

        $this->actingAs($sender)->getJson('/api/recipients?identifier='.$sender->account_number)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['identifier' => 'You cannot send money to yourself.']);

        $this->actingAs($sender)->getJson('/api/recipients?identifier=not-an-identifier')->assertUnprocessable();
    }

    #[Test]
    public function money_can_be_sent_by_account_number(): void
    {
        $sender = $this->fundedUser(['NGN' => '1000']);
        $tunde = $this->fundedUser();

        $this->actingAs($sender)->postJson('/api/transfers', [
            'recipient' => $tunde->account_number,
            'currency' => 'NGN',
            'amount' => '250',
            'reference' => 'by-account-01',
        ])->assertCreated()->assertJsonPath('data.counterparty.account_number', $tunde->account_number);

        $this->assertSame('250.00', $this->balanceOf($tunde));
    }

    #[Test]
    public function the_same_transfer_by_email_and_by_account_number_is_one_logical_request(): void
    {
        $sender = $this->fundedUser(['NGN' => '1000']);
        $tunde = $this->fundedUser(email: 'tunde@example.com');
        $payload = ['currency' => 'NGN', 'amount' => '250', 'reference' => 'same-ref-001'];

        $this->actingAs($sender)->postJson('/api/transfers', [...$payload, 'recipient' => 'tunde@example.com'])->assertCreated();
        $this->actingAs($sender)->postJson('/api/transfers', [...$payload, 'recipient' => $tunde->account_number])->assertOk();

        $this->assertSame('750.00', $this->balanceOf($sender));
    }

    #[Test]
    public function recent_recipients_are_distinct_people_you_paid_newest_first(): void
    {
        $me = $this->fundedUser(['NGN' => '10000']);
        [$ada, $tunde, $bola] = [$this->fundedUser(), $this->fundedUser(), $this->fundedUser()];

        $this->send($me, $ada);
        $this->send($me, $tunde);
        $this->send($me, $ada);
        $this->send($bola, $me);
        $this->travel(1)->seconds();
        $this->send($me, $tunde);

        $this->actingAs($me)->getJson('/api/recipients/recent')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.account_number', $tunde->account_number)
            ->assertJsonPath('data.1.account_number', $ada->account_number)
            ->assertJsonStructure(['data' => [['name', 'account_number', 'email_masked', 'last_sent_at']]]);
    }

    #[Test]
    public function recent_recipients_exclude_failed_transfers_and_are_capped_at_five(): void
    {
        $me = $this->fundedUser(['NGN' => '100']);
        $broke = $this->fundedUser();
        $this->send($me, $broke, 999999);

        $this->actingAs($me)->getJson('/api/recipients/recent')->assertJsonCount(0, 'data');

        foreach (range(1, 6) as $_) {
            $this->send($me, $this->fundedUser(), 1);
        }

        $this->actingAs($me)->getJson('/api/recipients/recent')->assertJsonCount(5, 'data');
    }
}
