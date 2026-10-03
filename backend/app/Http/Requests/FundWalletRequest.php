<?php

namespace App\Http\Requests;

class FundWalletRequest extends MoneyRequest
{
    protected function limit(): string
    {
        return 'funding';
    }
}
