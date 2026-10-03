<?php

namespace App\Enums;

enum TransactionType: string
{
    case Funding = 'funding';
    case Transfer = 'transfer';
    case Reversal = 'reversal';
}
