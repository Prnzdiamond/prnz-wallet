<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Rules\Recipient;

class TransferRequest extends MoneyRequest
{
    private ?Recipient $recipientRule = null;

    protected function limit(): string
    {
        return 'transfer';
    }

    public function rules(): array
    {
        $this->recipientRule = new Recipient($this->user());

        return [
            ...parent::rules(),
            'recipient' => ['required', 'string', 'max:255', $this->recipientRule],
            'narration' => ['nullable', 'string', 'max:140'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->recipient)) {
            $this->merge(['recipient' => strtolower(trim($this->recipient))]);
        }
    }

    public function recipient(): User
    {
        return $this->recipientRule->resolved;
    }
}
