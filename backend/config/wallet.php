<?php

return [

    'limits' => [
        'funding' => [
            'NGN' => env('WALLET_MAX_FUNDING_NGN', '10000000.00'),
            'USD' => env('WALLET_MAX_FUNDING_USD', '10000.00'),
            'USDT' => env('WALLET_MAX_FUNDING_USDT', '10000.000000'),
        ],
        'transfer' => [
            'NGN' => env('WALLET_MAX_TRANSFER_NGN', '5000000.00'),
            'USD' => env('WALLET_MAX_TRANSFER_USD', '5000.00'),
            'USDT' => env('WALLET_MAX_TRANSFER_USDT', '5000.000000'),
        ],
    ],

    'lock_timeout' => env('WALLET_LOCK_TIMEOUT', '5s'),

];
