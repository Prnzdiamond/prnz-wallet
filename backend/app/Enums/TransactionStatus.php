<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Failed = 'failed';
    case Reversed = 'reversed';

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, match ($this) {
            self::Pending => [self::Completed, self::Failed],
            self::Completed => [self::Reversed],
            self::Failed, self::Reversed => [],
        }, true);
    }
}
