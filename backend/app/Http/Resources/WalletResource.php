<?php

namespace App\Http\Resources;

use App\Models\Wallet;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Wallet */
class WalletResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'currency' => $this->currency->value,
            'currency_name' => $this->currency->label(),
            'scale' => $this->currency->scale(),
            'balance' => Money::fromMinor($this->balance, $this->currency),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
