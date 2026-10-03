<?php

namespace Database\Seeders;

use App\Actions\FundWallet;
use App\Actions\RegisterUser;
use App\Enums\Currency;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUserSeeder extends Seeder
{
    public const PASSWORD = 'Password123';

    public function run(RegisterUser $register, FundWallet $fund): void
    {
        $users = [
            ['Ada Okafor', 'ada@demo.test', [Currency::NGN->value => 25000000, Currency::USD->value => 50000, Currency::USDT->value => 250000000]],
            ['Tunde Bello', 'tunde@demo.test', [Currency::NGN->value => 5000000]],
        ];

        foreach ($users as [$name, $email, $balances]) {
            if (User::query()->where('email', $email)->exists()) {
                continue;
            }

            $user = $register($name, $email, self::PASSWORD);

            foreach ($balances as $currency => $amount) {
                $fund($user, Currency::from($currency), $amount, "seed-{$user->public_id}-{$currency}");
            }
        }
    }
}
