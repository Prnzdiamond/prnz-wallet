<?php

namespace App\Http\Resources;

use App\Enums\TransactionType;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Transaction */
class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $outgoing = $this->sourceWallet->user_id === $request->user()->id;
        $counterparty = $outgoing ? $this->destinationWallet : $this->sourceWallet;
        $ownWallet = $outgoing ? $this->sourceWallet : $this->destinationWallet;

        return [
            'id' => $this->public_id,
            'reference' => $this->reference,
            'type' => $this->type->value,
            'direction' => $outgoing ? 'debit' : 'credit',
            'status' => $this->status->value,
            'failure_reason' => $this->failure_reason,
            'currency' => $this->currency->value,
            'amount' => Money::fromMinor($this->amount, $this->currency),
            'narration' => $this->narration,
            'counterparty' => $this->counterparty($counterparty),
            'balance_after' => $this->balanceAfter($ownWallet),
            'created_at' => $this->created_at->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
        ];
    }

    private function counterparty(Wallet $wallet): ?array
    {
        if ($this->type === TransactionType::Funding || ! $wallet->user instanceof User) {
            return null;
        }

        return [
            'name' => $wallet->user->name,
            'email' => $wallet->user->email,
        ];
    }

    private function balanceAfter(Wallet $wallet): ?string
    {
        $entry = $this->relationLoaded('entries')
            ? $this->entries->firstWhere('wallet_id', $wallet->id)
            : null;

        return $entry ? Money::fromMinor($entry->balance_after, $this->currency) : null;
    }
}
