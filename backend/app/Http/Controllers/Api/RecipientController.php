<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RecipientController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->query('email')))]);

        $validated = $request->validate([
            'email' => ['required', 'email', Rule::notIn([$request->user()->email])],
        ], [
            'email.not_in' => 'You cannot send money to yourself.',
        ]);

        $recipient = User::query()->where('email', $validated['email'])->firstOrFail();

        return response()->json(['data' => [
            'name' => $recipient->name,
            'email' => $recipient->email,
        ]]);
    }
}
