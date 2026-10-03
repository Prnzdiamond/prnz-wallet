<?php

namespace App\Http\Controllers\Api;

use App\Actions\FundWallet;
use App\Http\Controllers\Controller;
use App\Http\Requests\FundWalletRequest;
use App\Http\Resources\WalletResource;
use App\Http\Responses\PostedTransactionResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WalletController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return WalletResource::collection($request->user()->wallets()->orderBy('id')->get());
    }

    public function fund(FundWalletRequest $request, FundWallet $fund): JsonResponse
    {
        $posted = $fund(
            $request->user(),
            $request->currency(),
            $request->amountInMinorUnits(),
            $request->validated('reference'),
            $request->clientMetadata(),
        );

        return PostedTransactionResponse::make($posted, $request);
    }
}
