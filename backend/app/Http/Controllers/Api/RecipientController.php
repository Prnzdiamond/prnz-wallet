<?php

namespace App\Http\Controllers\Api;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Http\Resources\RecipientResource;
use App\Models\User;
use App\Rules\Recipient;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class RecipientController extends Controller
{
    public function show(Request $request): RecipientResource
    {
        $rule = new Recipient($request->user());

        $request->validate(['identifier' => ['required', 'string', 'max:255', $rule]]);

        return RecipientResource::make($rule->resolved);
    }

    public function recent(Request $request): AnonymousResourceCollection
    {
        $recent = DB::table('transactions as t')
            ->join('wallets as dw', 'dw.id', '=', 't.destination_wallet_id')
            ->whereIn('t.source_wallet_id', $request->user()->wallets()->select('id'))
            ->where('t.type', TransactionType::Transfer->value)
            ->where('t.status', TransactionStatus::Completed->value)
            ->groupBy('dw.user_id')
            ->selectRaw('dw.user_id, MAX(t.created_at) AS last_sent_at')
            ->orderByDesc('last_sent_at')
            ->limit(5)
            ->get();

        $users = User::query()->whereKey($recent->pluck('user_id'))->get()->keyBy('id');

        return RecipientResource::collection($recent->map(function ($row) use ($users) {
            $user = $users[$row->user_id];
            $user->last_sent_at = $row->last_sent_at;

            return $user;
        }));
    }
}
