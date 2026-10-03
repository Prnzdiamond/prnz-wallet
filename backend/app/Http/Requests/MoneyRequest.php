<?php

namespace App\Http\Requests;

use App\Enums\Currency;
use App\Rules\Amount;
use App\Support\Money;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class MoneyRequest extends FormRequest
{
    abstract protected function limit(): string;

    public function rules(): array
    {
        return [
            'currency' => ['required', 'string', Rule::enum(Currency::class)],
            'amount' => ['required', new Amount($this->limit())],
            'reference' => ['required', 'string', 'min:8', 'max:100', 'regex:/^[A-Za-z0-9_-]+$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'reference.regex' => 'The reference may only contain letters, numbers, dashes and underscores.',
        ];
    }

    public function currency(): Currency
    {
        return Currency::from($this->validated('currency'));
    }

    public function amountInMinorUnits(): int
    {
        return Money::toMinor($this->validated('amount'), $this->currency());
    }

    public function clientMetadata(): array
    {
        return array_filter([
            'ip' => $this->ip(),
            'user_agent' => substr((string) $this->userAgent(), 0, 255) ?: null,
        ]);
    }
}
