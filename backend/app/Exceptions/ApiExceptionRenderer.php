<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class ApiExceptionRenderer
{
    public function __invoke(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        [$status, $code, $message, $extra] = match (true) {
            $e instanceof ValidationException => [422, 'validation_failed', 'Some of the details you entered are invalid.', ['errors' => $e->errors()]],
            $e instanceof AuthenticationException => [401, 'unauthenticated', 'Please log in to continue.', []],
            $e instanceof AuthorizationException => [403, 'forbidden', 'You are not allowed to do that.', []],
            $e instanceof ModelNotFoundException => [404, 'not_found', 'We could not find what you were looking for.', []],
            $e instanceof ReferenceConflictException => [409, 'reference_conflict', $e->getMessage(), ['reference' => $e->reference]],
            $e instanceof TokenMismatchException => [419, 'session_expired', 'Your session has expired. Please refresh and try again.', []],
            $e instanceof ThrottleRequestsException => [429, 'too_many_requests', 'Too many attempts. Please wait a moment and try again.', []],
            $e instanceof HttpExceptionInterface => [$e->getStatusCode(), $this->httpCode($e->getStatusCode()), $this->httpMessage($e->getStatusCode()), []],
            default => [500, 'server_error', 'Something went wrong on our side. Please try again.', []],
        };

        if ($status === 500 && config('app.debug')) {
            return null;
        }

        $headers = $e instanceof HttpExceptionInterface ? $e->getHeaders() : [];

        return new JsonResponse([
            'message' => $message,
            'code' => $code,
            ...$extra,
            'request_id' => $request->attributes->get('request_id'),
        ], $status, $headers);
    }

    private function httpCode(int $status): string
    {
        return match ($status) {
            404 => 'not_found',
            405 => 'method_not_allowed',
            503 => 'service_unavailable',
            default => 'http_error',
        };
    }

    private function httpMessage(int $status): string
    {
        return match ($status) {
            404 => 'We could not find what you were looking for.',
            405 => 'That action is not supported.',
            503 => 'The service is temporarily unavailable. Please try again shortly.',
            default => 'The request could not be completed.',
        };
    }
}
