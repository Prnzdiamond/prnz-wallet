<?php

namespace App\Rules;

use App\Enums\Currency;
use App\Support\Money;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

class Amount implements DataAwareRule, ValidationRule
{
    private array $data = [];

    public function __construct(private string $limit) {}

    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $currency = Currency::tryFrom((string) ($this->data['currency'] ?? ''));

        if (! $currency) {
            return;
        }

        if (! is_string($value) || ! preg_match(Money::pattern($currency), $value)) {
            $fail("Enter a valid amount with at most {$currency->scale()} decimal places.");

            return;
        }

        $minor = Money::toMinor($value, $currency);
        $max = config("wallet.limits.{$this->limit}.{$currency->value}");

        if ($minor <= 0) {
            $fail('The amount must be greater than zero.');
        } elseif ($minor > Money::toMinor($max, $currency)) {
            $fail("The amount cannot exceed {$max} {$currency->value}.");
        }
    }
}
