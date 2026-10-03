<?php

namespace Tests\Unit;

use App\Enums\TransactionStatus;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class TransactionStatusTest extends TestCase
{
    public static function transitions(): array
    {
        return [
            'pending to completed' => [TransactionStatus::Pending, TransactionStatus::Completed, true],
            'pending to failed' => [TransactionStatus::Pending, TransactionStatus::Failed, true],
            'pending to reversed' => [TransactionStatus::Pending, TransactionStatus::Reversed, false],
            'completed to reversed' => [TransactionStatus::Completed, TransactionStatus::Reversed, true],
            'completed to failed' => [TransactionStatus::Completed, TransactionStatus::Failed, false],
            'completed to pending' => [TransactionStatus::Completed, TransactionStatus::Pending, false],
            'failed to completed' => [TransactionStatus::Failed, TransactionStatus::Completed, false],
            'reversed to completed' => [TransactionStatus::Reversed, TransactionStatus::Completed, false],
        ];
    }

    #[Test]
    #[DataProvider('transitions')]
    public function it_only_allows_valid_transitions(TransactionStatus $from, TransactionStatus $to, bool $allowed): void
    {
        $this->assertSame($allowed, $from->canTransitionTo($to));
    }
}
