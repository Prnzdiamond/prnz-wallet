<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Validation\Rule;

class TransferRequest extends MoneyRequest
{
    protected function limit(): string
    {
        return 'transfer';
    }

    public function rules(): array
    {
        return [
            ...parent::rules(),
            'recipient_email' => [
                'required', 'string', 'email', 'max:255',
                Rule::notIn([$this->user()->email]),
                Rule::exists('users', 'email'),
            ],
            'narration' => ['nullable', 'string', 'max:140'],
        ];
    }

    public function messages(): array
    {
        return [
            ...parent::messages(),
            'recipient_email.not_in' => 'You cannot send money to yourself.',
            'recipient_email.exists' => 'We could not find a user with that email.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->recipient_email)) {
            $this->merge(['recipient_email' => strtolower(trim($this->recipient_email))]);
        }
    }

    public function recipient(): User
    {
        return User::query()->where('email', $this->validated('recipient_email'))->firstOrFail();
    }
}
