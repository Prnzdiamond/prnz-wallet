<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RecipientController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\TransferController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('wallets', [WalletController::class, 'index']);
    Route::post('wallets/fund', [WalletController::class, 'fund'])->middleware('throttle:money');
    Route::post('transfers', [TransferController::class, 'store'])->middleware('throttle:money');
    Route::get('recipients', [RecipientController::class, 'show'])->middleware('throttle:lookup');
    Route::get('transactions', [TransactionController::class, 'index']);
    Route::get('transactions/{transaction}', [TransactionController::class, 'show']);
});
