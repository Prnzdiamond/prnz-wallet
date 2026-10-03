<?php

use App\Actions\TransferFunds;
use App\Enums\Currency;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

[, $senderId, $recipientId, $amount, $reference, $startAt] = $argv;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$sender = User::query()->findOrFail($senderId);
$recipient = User::query()->findOrFail($recipientId);

time_sleep_until((float) $startAt);

try {
    $posted = app(TransferFunds::class)($sender, $recipient, Currency::NGN, (int) $amount, $reference);
    echo json_encode(['status' => $posted->transaction->status->value, 'replayed' => $posted->replayed]);
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'error' => $e::class.': '.$e->getMessage()]);
}
