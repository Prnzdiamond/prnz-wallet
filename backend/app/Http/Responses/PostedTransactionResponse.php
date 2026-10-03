<?php

namespace App\Http\Responses;

use App\Enums\TransactionStatus;
use App\Http\Resources\TransactionResource;
use App\Ledger\PostedTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PostedTransactionResponse
{
    private const FAILURE_MESSAGES = [
        'insufficient_funds' => 'You do not have enough funds for this transfer.',
    ];

    public static function make(PostedTransaction $posted, Request $request): JsonResponse
    {
        $transaction = $posted->transaction->load(['sourceWallet.user', 'destinationWallet.user', 'entries']);
        $data = TransactionResource::make($transaction)->resolve($request);

        if ($transaction->status === TransactionStatus::Failed) {
            return new JsonResponse([
                'message' => self::FAILURE_MESSAGES[$transaction->failure_reason] ?? 'The transaction could not be completed.',
                'code' => $transaction->failure_reason,
                'data' => $data,
                'request_id' => $request->attributes->get('request_id'),
            ], 422, ['Idempotent-Replayed' => $posted->replayed ? 'true' : 'false']);
        }

        return new JsonResponse(
            ['data' => $data],
            $posted->replayed ? 200 : 201,
            ['Idempotent-Replayed' => $posted->replayed ? 'true' : 'false'],
        );
    }
}
