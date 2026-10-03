<?php

namespace Tests\Concerns;

use App\Actions\FundWallet;
use App\Actions\RegisterUser;
use App\Enums\Currency;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Str;

trait CreatesFundedUsers
{
    /**
     * @param  array<string, string>  $balances  currency code => decimal amount
     */
    protected function fundedUser(array $balances = [], ?string $email = null): User
    {
        $user = app(RegisterUser::class)(
            'User '.Str::random(5),
            $email ?? Str::lower(Str::random(10)).'@example.com',
            'password123',
        );

        foreach ($balances as $code => $amount) {
            $currency = Currency::from($code);
            app(FundWallet::class)($user, $currency, Money::toMinor($amount, $currency), (string) Str::uuid());
        }

        return $user;
    }

    protected function balanceOf(User $user, Currency $currency = Currency::NGN): string
    {
        $wallet = $user->wallets()->where('currency', $currency)->firstOrFail();

        return Money::fromMinor($wallet->balance, $currency);
    }
}
