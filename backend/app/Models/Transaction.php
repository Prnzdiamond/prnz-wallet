<?php

namespace App\Models;

use App\Enums\Currency;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use DomainException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'reference', 'type', 'status', 'currency', 'amount', 'initiator_id', 'source_wallet_id',
    'destination_wallet_id', 'reverses_transaction_id', 'narration', 'failure_reason',
    'request_hash', 'metadata', 'completed_at',
])]
#[Hidden(['id', 'initiator_id', 'source_wallet_id', 'destination_wallet_id', 'reverses_transaction_id', 'request_hash'])]
class Transaction extends Model
{
    use HasUlids;

    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'status' => TransactionStatus::class,
            'currency' => Currency::class,
            'amount' => 'integer',
            'metadata' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiator_id');
    }

    public function sourceWallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class, 'source_wallet_id');
    }

    public function destinationWallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class, 'destination_wallet_id');
    }

    public function reverses(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reverses_transaction_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }

    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $walletIds = $user->wallets()->select('id');

        $query->where(fn (Builder $q) => $q
            ->whereIn('source_wallet_id', $walletIds)
            ->orWhereIn('destination_wallet_id', $walletIds));
    }

    public function transitionTo(TransactionStatus $next, ?string $failureReason = null): void
    {
        if (! $this->status->canTransitionTo($next)) {
            throw new DomainException("Cannot move transaction from {$this->status->value} to {$next->value}.");
        }

        $this->status = $next;
        $this->failure_reason = $next === TransactionStatus::Failed ? $failureReason : null;
        $this->completed_at = $next === TransactionStatus::Completed ? now() : $this->completed_at;
        $this->save();
    }
}
