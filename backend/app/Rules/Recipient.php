<?php

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Recipient implements ValidationRule
{
    public ?User $resolved = null;

    public function __construct(private User $sender) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Enter an account number or email address.');

            return;
        }

        $this->resolved = User::findByIdentifier($value);

        if (! $this->resolved) {
            $fail('We could not find an account with those details.');
        } elseif ($this->resolved->is($this->sender)) {
            $fail('You cannot send money to yourself.');
        }
    }
}
