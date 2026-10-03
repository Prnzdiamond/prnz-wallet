<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\Process\PhpExecutableFinder;
use Symfony\Component\Process\Process;
use Tests\Concerns\CreatesFundedUsers;
use Tests\TestCase;

#[Group('concurrency')]
class ConcurrentTransferTest extends TestCase
{
    use CreatesFundedUsers, DatabaseTruncation;

    protected function tearDown(): void
    {
        $this->truncateTablesForAllConnections();
        $this->seed();

        parent::tearDown();
    }

    #[Test]
    public function two_simultaneous_transfers_cannot_overspend_a_wallet(): void
    {
        $sender = $this->fundedUser(['NGN' => '100000']);
        $first = $this->fundedUser();
        $second = $this->fundedUser();

        $results = $this->runConcurrently([
            [$sender, $first, 8000000, (string) Str::uuid()],
            [$sender, $second, 8000000, (string) Str::uuid()],
        ]);

        $this->assertEqualsCanonicalizing(['completed', 'failed'], array_column($results, 'status'));
        $this->assertSame('20000.00', $this->balanceOf($sender));
        $this->assertSame('80000.00', bcadd($this->balanceOf($first), $this->balanceOf($second), 2));
        $this->artisan('ledger:reconcile')->assertSuccessful();
    }

    #[Test]
    public function a_burst_of_transfers_spends_exactly_the_available_balance(): void
    {
        $sender = $this->fundedUser(['NGN' => '50000']);
        $recipient = $this->fundedUser();

        $results = $this->runConcurrently(array_map(
            fn () => [$sender, $recipient, 1000000, (string) Str::uuid()],
            range(1, 10),
        ));

        $statuses = array_count_values(array_column($results, 'status'));
        $this->assertSame(['completed' => 5, 'failed' => 5], [
            'completed' => $statuses['completed'] ?? 0,
            'failed' => $statuses['failed'] ?? 0,
        ]);
        $this->assertSame('0.00', $this->balanceOf($sender));
        $this->assertSame('50000.00', $this->balanceOf($recipient));
        $this->artisan('ledger:reconcile')->assertSuccessful();
    }

    #[Test]
    public function the_same_transfer_submitted_simultaneously_executes_once(): void
    {
        $sender = $this->fundedUser(['NGN' => '100000']);
        $recipient = $this->fundedUser();
        $reference = (string) Str::uuid();

        $results = $this->runConcurrently(array_map(
            fn () => [$sender, $recipient, 3000000, $reference],
            range(1, 5),
        ));

        $this->assertSame(array_fill(0, 5, 'completed'), array_column($results, 'status'));
        $this->assertSame(1, count(array_filter($results, fn ($r) => $r['replayed'] === false)));
        $this->assertSame(1, Transaction::query()->where('reference', $reference)->count());
        $this->assertSame('70000.00', $this->balanceOf($sender));
        $this->assertSame('30000.00', $this->balanceOf($recipient));
    }

    #[Test]
    public function opposite_transfers_between_two_users_do_not_deadlock(): void
    {
        $ada = $this->fundedUser(['NGN' => '100000']);
        $tunde = $this->fundedUser(['NGN' => '100000']);

        $jobs = [];
        foreach (range(1, 4) as $_) {
            $jobs[] = [$ada, $tunde, 100000, (string) Str::uuid()];
            $jobs[] = [$tunde, $ada, 100000, (string) Str::uuid()];
        }

        $results = $this->runConcurrently($jobs);

        $this->assertSame(array_fill(0, 8, 'completed'), array_column($results, 'status'));
        $this->assertSame('100000.00', $this->balanceOf($ada));
        $this->assertSame('100000.00', $this->balanceOf($tunde));
        $this->artisan('ledger:reconcile')->assertSuccessful();
    }

    /**
     * @param  list<array{User, User, int, string}>  $jobs
     * @return list<array{status: string, replayed?: bool, error?: string}>
     */
    private function runConcurrently(array $jobs): array
    {
        $php = (new PhpExecutableFinder)->find(false);
        $startAt = microtime(true) + 3;
        $env = [
            'APP_ENV' => 'testing',
            'DB_CONNECTION' => 'pgsql',
            'DB_DATABASE' => config('database.connections.pgsql.database'),
            'CACHE_STORE' => 'array',
            'LOG_CHANNEL' => 'stderr',
        ];

        $processes = array_map(function (array $job) use ($php, $startAt, $env) {
            [$sender, $recipient, $amount, $reference] = $job;
            $process = new Process(
                [$php, base_path('tests/Support/transfer-worker.php'), $sender->id, $recipient->id, $amount, $reference, sprintf('%.6F', $startAt)],
                base_path(),
                $env,
                timeout: 60,
            );
            $process->start();

            return $process;
        }, $jobs);

        return array_map(function (Process $process) {
            $process->wait();
            $result = json_decode($process->getOutput(), true);

            $this->assertIsArray($result, 'Worker failed: '.$process->getErrorOutput().$process->getOutput());
            $this->assertNotSame('error', $result['status'], $result['error'] ?? '');

            return $result;
        }, $processes);
    }
}
