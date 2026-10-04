<?php

namespace App\Support;

final class Mask
{
    public static function email(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2) + [1 => ''];

        return mb_substr($local, 0, 1).'***@'.$domain;
    }
}
