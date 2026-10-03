<?php

namespace App\Actions;

use App\Enums\Currency;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Ledger\Ledger;
use App\Ledger\PostedTransaction;
use App\Models\Transaction;
use App\Models\User;
use InvalidArgumentException;

class TransferFunds
{
    public const INSUFFICIENT_FUNDS = 'insufficient_funds';

    public function __construct(private Ledger $ledger) {}

    public function __invoke(
        User $sender,
        User $recipient,
        Currency $currency,
        int $amount,
        string $reference,
        ?string $narration = null,
        array $metadata = [],
    ): PostedTransaction {
        if ($sender->is($recipient)) {
            throw new InvalidArgumentException('Cannot transfer to yourself.');
        }

        $request = [
            'type' => TransactionType::Transfer->value,
            'currency' => $currency->value,
            'amount' => $amount,
            'recipient' => $recipient->public_id,
            'narration' => $narration,
        ];

        return $this->ledger->idempotent($sender, $reference, $request, function () use ($sender, $recipient, $currency, $amount, $reference, $narration, $request, $metadata) {
            $sourceId = $sender->wallets()->where('currency', $currency)->value('id');
            $destinationId = $recipient->wallets()->where('currency', $currency)->value('id');

            $wallets = $this->ledger->lock([$sourceId, $destinationId]);
            $source = $wallets->get($sourceId);
            $destination = $wallets->get($destinationId);

            $sufficient = $source->balance >= $amount;

            $transaction = Transaction::query()->create([
                'reference' => $reference,
                'type' => TransactionType::Transfer,
                'status' => $sufficient ? TransactionStatus::Completed : TransactionStatus::Failed,
                'failure_reason' => $sufficient ? null : self::INSUFFICIENT_FUNDS,
                'currency' => $currency,
                'amount' => $amount,
                'initiator_id' => $sender->id,
                'source_wallet_id' => $source->id,
                'destination_wallet_id' => $destination->id,
                'narration' => $narration,
                'request_hash' => $this->ledger->hash($request),
                'metadata' => $metadata ?: null,
                'completed_at' => $sufficient ? now() : null,
            ]);

            if ($sufficient) {
                $this->ledger->post($transaction, [
                    [$source, -$amount],
                    [$destination, $amount],
                ]);
            }

            return $transaction;
        });
    }
}
