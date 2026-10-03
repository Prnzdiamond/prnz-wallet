<?php

namespace Database\Factories;

use App\Enums\Currency;
use App\Enums\WalletType;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Wallet>
 */
class WalletFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => WalletType::User,
            'currency' => Currency::NGN,
            'balance' => 0,
        ];
    }

    public function currency(Currency $currency): static
    {
        return $this->state(['currency' => $currency]);
    }
}
