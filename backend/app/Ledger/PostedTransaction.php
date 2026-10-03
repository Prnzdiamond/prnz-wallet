<?php

namespace App\Ledger;

use App\Models\Transaction;

final readonly class PostedTransaction
{
    public function __construct(
        public Transaction $transaction,
        public bool $replayed,
    ) {}
}
