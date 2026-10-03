<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

#[Signature('ledger:reconcile')]
#[Description('Verify cached wallet balances and ledger totals against ledger entries')]
class ReconcileLedger extends Command
{
    public function handle(): int
    {
        $driftedWallets = DB::select(<<<'SQL'
            SELECT w.public_id, w.currency, w.balance, COALESCE(SUM(e.amount), 0) AS ledger_balance
            FROM wallets w
            LEFT JOIN ledger_entries e ON e.wallet_id = w.id
            WHERE w.type = 'user'
            GROUP BY w.id
            HAVING w.balance <> COALESCE(SUM(e.amount), 0)
        SQL);

        $unbalancedCurrencies = DB::select(<<<'SQL'
            SELECT w.currency, SUM(e.amount) AS total
            FROM ledger_entries e
            JOIN wallets w ON w.id = e.wallet_id
            GROUP BY w.currency
            HAVING SUM(e.amount) <> 0
        SQL);

        $completedWithoutEntries = DB::select(<<<'SQL'
            SELECT t.public_id
            FROM transactions t
            WHERE t.status IN ('completed', 'reversed')
              AND NOT EXISTS (SELECT 1 FROM ledger_entries e WHERE e.transaction_id = t.id)
        SQL);

        if (! $driftedWallets && ! $unbalancedCurrencies && ! $completedWithoutEntries) {
            $this->info('Ledger is consistent.');

            return self::SUCCESS;
        }

        $report = [
            'drifted_wallets' => $driftedWallets,
            'unbalanced_currencies' => $unbalancedCurrencies,
            'completed_without_entries' => $completedWithoutEntries,
        ];

        Log::critical('Ledger reconciliation failed', $report);
        $this->error('Ledger reconciliation failed.');
        $this->line(json_encode($report, JSON_PRETTY_PRINT));

        return self::FAILURE;
    }
}
