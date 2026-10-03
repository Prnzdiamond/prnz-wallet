<?php

namespace App\Ledger;

use App\Exceptions\ReferenceConflictException;
use App\Models\LedgerEntry;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Closure;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use LogicException;

class Ledger
{
    /**
     * @param  Closure(): Transaction  $post
     */
    public function idempotent(User $initiator, string $reference, array $request, Closure $post): PostedTransaction
    {
        $hash = $this->hash($request);

        if ($existing = $this->find($initiator, $reference)) {
            return $this->replay($existing, $hash);
        }

        try {
            $transaction = DB::transaction(function () use ($post) {
                DB::statement("SET LOCAL lock_timeout = '".config('wallet.lock_timeout')."'");

                return $post();
            }, attempts: 3);
        } catch (UniqueConstraintViolationException $e) {
            $existing = $this->find($initiator, $reference) ?? throw $e;

            return $this->replay($existing, $hash);
        }

        return new PostedTransaction($transaction, replayed: false);
    }

    public function hash(array $request): string
    {
        ksort($request);

        return hash('sha256', json_encode($request, JSON_THROW_ON_ERROR));
    }

    /**
     * @param  list<int>  $walletIds
     * @return Collection<int, Wallet>
     */
    public function lock(array $walletIds): Collection
    {
        return Wallet::query()
            ->whereKey($walletIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
    }

    /**
     * @param  array<int, array{Wallet, int}>  $movements  wallet and signed amount
     */
    public function post(Transaction $transaction, array $movements): void
    {
        if (array_sum(array_column($movements, 1)) !== 0) {
            throw new LogicException('Ledger movements must sum to zero.');
        }

        foreach ($movements as [$wallet, $amount]) {
            if (! $wallet->isSystem()) {
                $wallet->balance += $amount;
                $wallet->save();
            }

            LedgerEntry::query()->create([
                'transaction_id' => $transaction->id,
                'wallet_id' => $wallet->id,
                'amount' => $amount,
                'balance_after' => $wallet->isSystem() ? null : $wallet->balance,
            ]);
        }
    }

    private function find(User $initiator, string $reference): ?Transaction
    {
        return Transaction::query()
            ->where('initiator_id', $initiator->id)
            ->where('reference', $reference)
            ->first();
    }

    private function replay(Transaction $existing, string $hash): PostedTransaction
    {
        if (! hash_equals($existing->request_hash, $hash)) {
            throw new ReferenceConflictException($existing->reference);
        }

        return new PostedTransaction($existing, replayed: true);
    }
}
