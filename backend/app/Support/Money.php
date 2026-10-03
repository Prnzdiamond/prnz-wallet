<?php

namespace App\Support;

use App\Enums\Currency;
use InvalidArgumentException;

final class Money
{
    public static function pattern(Currency $currency): string
    {
        return '/^(0|[1-9]\d{0,11})(\.\d{1,'.$currency->scale().'})?$/';
    }

    public static function toMinor(string $amount, Currency $currency): int
    {
        if (! preg_match(self::pattern($currency), $amount)) {
            throw new InvalidArgumentException("Invalid {$currency->value} amount.");
        }

        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '');

        return (int) ($whole.str_pad($fraction, $currency->scale(), '0'));
    }

    public static function fromMinor(int $minor, Currency $currency): string
    {
        $scale = $currency->scale();
        $sign = $minor < 0 ? '-' : '';
        $digits = str_pad((string) abs($minor), $scale + 1, '0', STR_PAD_LEFT);

        return $sign.substr($digits, 0, -$scale).'.'.substr($digits, -$scale);
    }
}
