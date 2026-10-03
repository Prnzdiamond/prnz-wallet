<?php

namespace App\Models;

use App\Enums\Currency;
use App\Enums\SystemWallet;
use App\Enums\WalletType;
use Database\Factories\WalletFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'type', 'system_code', 'currency', 'balance'])]
#[Hidden(['id', 'user_id'])]
class Wallet extends Model
{
    /** @use HasFactory<WalletFactory> */
    use HasFactory, HasUlids;

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
            'type' => WalletType::class,
            'system_code' => SystemWallet::class,
            'currency' => Currency::class,
            'balance' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }

    public function scopeSystem(Builder $query, SystemWallet $code, Currency $currency): void
    {
        $query->where('type', WalletType::System)->where('system_code', $code)->where('currency', $currency);
    }

    public function isSystem(): bool
    {
        return $this->type === WalletType::System;
    }
}
