<?php

use App\Actions\TransferFunds;
use App\Enums\Currency;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

[, $senderId, $recipientId, $amount, $reference, $barrier, $index] = $argv;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$sender = User::query()->findOrFail($senderId);
$recipient = User::query()->findOrFail($recipientId);

DB::select('select 1');
touch("{$barrier}/ready-{$index}");

$deadline = microtime(true) + 60;
while (! file_exists("{$barrier}/go") && microtime(true) < $deadline) {
    usleep(200);
}

try {
    $posted = app(TransferFunds::class)($sender, $recipient, Currency::NGN, (int) $amount, $reference);
    echo json_encode(['status' => $posted->transaction->status->value, 'replayed' => $posted->replayed]);
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'error' => $e::class.': '.$e->getMessage()]);
}
