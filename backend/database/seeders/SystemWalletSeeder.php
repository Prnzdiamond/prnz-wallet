<?php

namespace Database\Seeders;

use App\Enums\Currency;
use App\Enums\SystemWallet;
use App\Enums\WalletType;
use App\Models\Wallet;
use Illuminate\Database\Seeder;

class SystemWalletSeeder extends Seeder
{
    public function run(): void
    {
        foreach (SystemWallet::cases() as $code) {
            foreach (Currency::cases() as $currency) {
                Wallet::query()->firstOrCreate(
                    ['type' => WalletType::System, 'system_code' => $code, 'currency' => $currency],
                );
            }
        }
    }
}
