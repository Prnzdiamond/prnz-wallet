<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesFundedUsers;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use CreatesFundedUsers, RefreshDatabase;

    private function change(User $user, array $overrides = [])
    {
        return $this->actingAs($user)->withHeader('Origin', 'http://localhost')->putJson('/api/auth/password', [
            'current_password' => 'password123',
            'password' => 'newSecret456',
            'password_confirmation' => 'newSecret456',
            ...$overrides,
        ]);
    }

    private function storedSession(string $id, User $user): void
    {
        DB::table('sessions')->insert(['id' => $id, 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
    }

    #[Test]
    public function a_user_can_change_their_password_and_log_in_with_the_new_one(): void
    {
        $user = $this->fundedUser(email: 'ada@example.com');

        $this->change($user)->assertOk()->assertJsonPath('message', 'Your password has been changed. Other devices have been signed out.');

        $this->assertTrue(Hash::check('newSecret456', $user->fresh()->password));
        $this->assertFalse(Hash::check('password123', $user->fresh()->password));
    }

    #[Test]
    public function the_current_password_must_be_correct(): void
    {
        $user = $this->fundedUser();

        $this->change($user, ['current_password' => 'wrong-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'Your current password is incorrect.']);

        $this->assertTrue(Hash::check('password123', $user->fresh()->password));
    }

    #[Test]
    public function the_new_password_must_be_strong_confirmed_and_different(): void
    {
        $user = $this->fundedUser();

        $this->change($user, ['password' => 'short', 'password_confirmation' => 'short'])->assertJsonValidationErrors(['password']);
        $this->change($user, ['password_confirmation' => 'mismatch123'])->assertJsonValidationErrors(['password']);
        $this->change($user, ['password' => 'password123', 'password_confirmation' => 'password123'])
            ->assertJsonValidationErrors(['password' => 'Choose a password different from your current one.']);
    }

    #[Test]
    public function changing_the_password_signs_out_the_users_other_sessions_only(): void
    {
        $user = $this->fundedUser();
        $other = $this->fundedUser();
        $this->storedSession('user-phone', $user);
        $this->storedSession('user-laptop', $user);
        $this->storedSession('other-user', $other);

        $this->change($user)->assertOk();

        $this->assertDatabaseMissing('sessions', ['id' => 'user-phone']);
        $this->assertDatabaseMissing('sessions', ['id' => 'user-laptop']);
        $this->assertDatabaseHas('sessions', ['id' => 'other-user']);
    }

    #[Test]
    public function changing_the_password_requires_authentication_and_is_rate_limited(): void
    {
        $this->putJson('/api/auth/password', [])->assertUnauthorized();

        $user = $this->fundedUser();
        foreach (range(1, 5) as $_) {
            $this->change($user, ['current_password' => 'wrong'])->assertUnprocessable();
        }

        $this->change($user)->assertTooManyRequests();
    }
}
