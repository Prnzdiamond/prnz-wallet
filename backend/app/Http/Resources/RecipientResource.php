<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\Mask;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/** @mixin User */
class RecipientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->name,
            'account_number' => $this->account_number,
            'email_masked' => Mask::email($this->email),
            'last_sent_at' => $this->when(isset($this->last_sent_at), fn () => Carbon::parse($this->last_sent_at)->toIso8601String()),
        ];
    }
}
