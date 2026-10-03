<?php

namespace App\Actions;

use App\Enums\Currency;
use App\Enums\WalletType;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RegisterUser
{
    public function __invoke(string $name, string $email, string $password): User
    {
        return DB::transaction(function () use ($name, $email, $password) {
            $user = User::query()->create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
            ]);

            foreach (Currency::cases() as $currency) {
                $user->wallets()->create([
                    'type' => WalletType::User,
                    'currency' => $currency,
                    'balance' => 0,
                ]);
            }

            return $user;
        });
    }
}
