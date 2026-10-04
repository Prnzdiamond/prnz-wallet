<?php

namespace App\Actions;

use App\Enums\Currency;
use App\Enums\WalletType;
use App\Models\User;
use App\Support\AccountNumber;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RegisterUser
{
    private const ACCOUNT_NUMBER_ATTEMPTS = 5;

    public function __invoke(string $name, string $email, string $password): User
    {
        return DB::transaction(function () use ($name, $email, $password) {
            $user = $this->createWithUniqueAccountNumber($name, $email, $password);

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

    private function createWithUniqueAccountNumber(string $name, string $email, string $password): User
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                return DB::transaction(fn () => User::query()->create([
                    'name' => $name,
                    'email' => $email,
                    'password' => $password,
                    'account_number' => AccountNumber::generate(),
                ]));
            } catch (UniqueConstraintViolationException $e) {
                if ($attempt >= self::ACCOUNT_NUMBER_ATTEMPTS || ! Str::contains($e->getMessage(), 'account_number')) {
                    throw $e;
                }
            }
        }
    }
}
