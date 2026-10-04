<?php

namespace App\Models;

use App\Support\AccountNumber;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'account_number'])]
#[Hidden(['id', 'password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUlids, Notifiable;

    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function wallets(): HasMany
    {
        return $this->hasMany(Wallet::class);
    }

    public static function findByIdentifier(string $identifier): ?self
    {
        $identifier = strtolower(trim($identifier));

        return match (true) {
            AccountNumber::isValid($identifier) => static::query()->where('account_number', $identifier)->first(),
            filter_var($identifier, FILTER_VALIDATE_EMAIL) !== false => static::query()->where('email', $identifier)->first(),
            default => null,
        };
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
