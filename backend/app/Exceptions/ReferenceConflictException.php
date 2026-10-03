<?php

namespace App\Exceptions;

use RuntimeException;

class ReferenceConflictException extends RuntimeException
{
    public function __construct(public readonly string $reference)
    {
        parent::__construct('This reference has already been used for a different request.');
    }
}
