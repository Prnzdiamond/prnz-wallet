<?php

namespace Tests\Feature;

use App\Actions\TransferFunds;
use App\Enums\Currency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesFundedUsers;
use Tests\TestCase;

class TransactionHistoryTest extends TestCase
{
    use CreatesFundedUsers, RefreshDatabase;

    private function send(User $from, User $to, int $amount): string
    {
        return app(TransferFunds::class)($from, $to, Currency::NGN, $amount, (string) Str::uuid())->transaction->public_id;
    }

    #[Test]
    public function history_lists_the_users_transactions_newest_first_with_full_details(): void
    {
        $ada = $this->fundedUser(['NGN' => '1000']);
        $tunde = $this->fundedUser();
        $this->send($ada, $tunde, 25000);

        $this->actingAs($ada)->getJson('/api/transactions')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.type', 'transfer')
            ->assertJsonPath('data.0.direction', 'debit')
            ->assertJsonPath('data.1.type', 'funding')
            ->assertJsonStructure(['data' => [[
                'id', 'reference', 'type', 'direction', 'status', 'failure_reason', 'currency',
                'amount', 'narration', 'counterparty', 'balance_after', 'created_at', 'completed_at',
            ]], 'links', 'meta']);
    }

    #[Test]
    public function a_user_never_sees_transactions_between_other_users(): void
    {
        $ada = $this->fundedUser(['NGN' => '1000']);
        $tunde = $this->fundedUser();
        $outsider = $this->fundedUser();
        $id = $this->send($ada, $tunde, 100);

        $this->actingAs($outsider)->getJson('/api/transactions')->assertJsonCount(0, 'data');
        $this->actingAs($outsider)->getJson("/api/transactions/{$id}")
            ->assertNotFound()
            ->assertJsonPath('code', 'not_found');
    }

    #[Test]
    public function an_unknown_transaction_id_is_not_found(): void
    {
        $this->actingAs($this->fundedUser())->getJson('/api/transactions/does-not-exist')->assertNotFound();
    }

    #[Test]
    public function history_can_be_filtered_and_paginated(): void
    {
        $ada = $this->fundedUser(['NGN' => '1000', 'USD' => '10']);
        $tunde = $this->fundedUser();
        foreach (range(1, 3) as $_) {
            $this->send($ada, $tunde, 100);
        }

        $this->actingAs($ada)->getJson('/api/transactions?type=funding')->assertJsonCount(2, 'data');
        $this->actingAs($ada)->getJson('/api/transactions?currency=USD')->assertJsonCount(1, 'data');

        $page = $this->actingAs($ada)->getJson('/api/transactions?per_page=2')->assertJsonCount(2, 'data');
        $next = $page->json('meta.next_cursor');
        $this->assertNotNull($next);

        $this->actingAs($ada)->getJson("/api/transactions?per_page=2&cursor={$next}")->assertJsonCount(2, 'data');
        $this->actingAs($ada)->getJson('/api/transactions?type=bogus')->assertUnprocessable();
    }
}
