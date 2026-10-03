<?php

namespace App\Http\Controllers\Api;

use App\Actions\TransferFunds;
use App\Http\Controllers\Controller;
use App\Http\Requests\TransferRequest;
use App\Http\Responses\PostedTransactionResponse;
use Illuminate\Http\JsonResponse;

class TransferController extends Controller
{
    public function store(TransferRequest $request, TransferFunds $transfer): JsonResponse
    {
        $posted = $transfer(
            $request->user(),
            $request->recipient(),
            $request->currency(),
            $request->amountInMinorUnits(),
            $request->validated('reference'),
            $request->validated('narration'),
            $request->clientMetadata(),
        );

        return PostedTransactionResponse::make($posted, $request);
    }
}
