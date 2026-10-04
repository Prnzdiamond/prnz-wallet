<?php

namespace App\Support;

final class AccountNumber
{
    public static function generate(): string
    {
        return (string) random_int(1_000_000_000, 9_999_999_999);
    }

    public static function isValid(string $value): bool
    {
        return (bool) preg_match('/^[1-9]\d{9}$/', $value);
    }
}
