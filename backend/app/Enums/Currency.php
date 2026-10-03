<?php

namespace App\Enums;

enum Currency: string
{
    case NGN = 'NGN';
    case USD = 'USD';
    case USDT = 'USDT';

    public function scale(): int
    {
        return match ($this) {
            self::NGN, self::USD => 2,
            self::USDT => 6,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::NGN => 'Nigerian Naira',
            self::USD => 'US Dollar',
            self::USDT => 'Tether USD',
        };
    }
}
