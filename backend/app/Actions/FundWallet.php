<?php

namespace App\Actions;

use App\Enums\Currency;
use App\Enums\SystemWallet;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Ledger\Ledger;
use App\Ledger\PostedTransaction;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;

class FundWallet
{
    public function __construct(private Ledger $ledger) {}

    public function __invoke(User $user, Currency $currency, int $amount, string $reference, array $metadata = []): PostedTransaction
    {
        $request = [
            'type' => TransactionType::Funding->value,
            'currency' => $currency->value,
            'amount' => $amount,
        ];

        return $this->ledger->idempotent($user, $reference, $request, function () use ($user, $currency, $amount, $reference, $request, $metadata) {
            $clearing = Wallet::query()->system(SystemWallet::FundingClearing, $currency)->firstOrFail();
            $walletId = $user->wallets()->where('currency', $currency)->value('id');
            $wallet = $this->ledger->lock([$walletId])->first();

            $transaction = Transaction::query()->create([
                'reference' => $reference,
                'type' => TransactionType::Funding,
                'status' => TransactionStatus::Completed,
                'currency' => $currency,
                'amount' => $amount,
                'initiator_id' => $user->id,
                'source_wallet_id' => $clearing->id,
                'destination_wallet_id' => $wallet->id,
                'request_hash' => $this->ledger->hash($request),
                'metadata' => ['channel' => 'simulated', ...$metadata],
                'completed_at' => now(),
            ]);

            $this->ledger->post($transaction, [
                [$clearing, -$amount],
                [$wallet, $amount],
            ]);

            return $transaction;
        });
    }
}
