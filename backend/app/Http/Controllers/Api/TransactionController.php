<?php

namespace App\Http\Controllers\Api;

use App\Enums\Currency;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TransactionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'type' => ['nullable', Rule::enum(TransactionType::class)],
            'status' => ['nullable', Rule::enum(TransactionStatus::class)],
            'currency' => ['nullable', Rule::enum(Currency::class)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $transactions = Transaction::query()
            ->visibleTo($request->user())
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['currency'] ?? null, fn ($q, $currency) => $q->where('currency', $currency))
            ->with(['sourceWallet.user', 'destinationWallet.user', 'entries'])
            ->orderByDesc('id')
            ->cursorPaginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return TransactionResource::collection($transactions);
    }

    public function show(Request $request, string $transaction): TransactionResource
    {
        $model = Transaction::query()
            ->visibleTo($request->user())
            ->where('public_id', $transaction)
            ->with(['sourceWallet.user', 'destinationWallet.user', 'entries'])
            ->firstOrFail();

        return TransactionResource::make($model);
    }
}
