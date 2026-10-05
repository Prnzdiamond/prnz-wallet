<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class ChangePassword
{
    public function __invoke(User $user, string $password, string $currentSessionId): void
    {
        DB::transaction(function () use ($user, $password, $currentSessionId) {
            $user->forceFill(['password' => $password])->save();

            DB::table('sessions')
                ->where('user_id', $user->id)
                ->where('id', '!=', $currentSessionId)
                ->delete();
        });
    }
}
