<?php

namespace Tests\Feature;

use App\Enums\Currency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesFundedUsers;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use CreatesFundedUsers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Origin', 'http://localhost');
    }

    #[Test]
    public function registering_creates_a_user_with_an_empty_wallet_per_currency(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Ada Obi',
            'email' => 'Ada@Example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'ada@example.com')
            ->assertJsonMissingPath('data.password');

        $user = User::query()->where('email', 'ada@example.com')->sole();

        $this->assertAuthenticatedAs($user);
        $this->assertEqualsCanonicalizing(
            array_map(fn (Currency $c) => $c->value, Currency::cases()),
            $user->wallets->map(fn ($w) => $w->currency->value)->all(),
        );
        $this->assertSame([0, 0, 0], $user->wallets->pluck('balance')->all());
    }

    #[Test]
    public function registration_rejects_a_duplicate_email_and_a_weak_password(): void
    {
        $this->fundedUser(email: 'taken@example.com');

        $this->postJson('/api/auth/register', [
            'name' => 'Someone',
            'email' => 'taken@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'validation_failed')
            ->assertJsonValidationErrors(['email', 'password']);
    }

    #[Test]
    public function a_user_can_log_in_and_out(): void
    {
        $user = $this->fundedUser(email: 'ada@example.com');

        $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'password123'])
            ->assertOk()
            ->assertJsonPath('data.id', $user->public_id);

        $this->assertAuthenticatedAs($user);

        $this->postJson('/api/auth/logout')->assertNoContent();

        $this->assertGuest('web');
    }

    #[Test]
    public function wrong_credentials_are_rejected_without_revealing_which_field_was_wrong(): void
    {
        $this->fundedUser(email: 'ada@example.com');

        $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'These credentials do not match our records.');

        $this->assertGuest('web');
    }

    #[Test]
    public function login_is_rate_limited(): void
    {
        $this->fundedUser(email: 'ada@example.com');

        foreach (range(1, 5) as $_) {
            $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'wrong'])->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'password123'])
            ->assertTooManyRequests()
            ->assertJsonPath('code', 'too_many_requests');
    }

    #[Test]
    public function protected_endpoints_require_authentication(): void
    {
        foreach (['/api/auth/me', '/api/wallets', '/api/transactions', '/api/recipients?email=a@b.com'] as $uri) {
            $this->getJson($uri)->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
        }

        $this->postJson('/api/wallets/fund')->assertUnauthorized();
        $this->postJson('/api/transfers')->assertUnauthorized();
    }

    #[Test]
    public function the_profile_returns_the_authenticated_user_without_internal_ids(): void
    {
        $user = $this->fundedUser();

        $this->actingAs($user)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertExactJsonStructure(['data' => ['id', 'name', 'email', 'created_at']])
            ->assertJsonPath('data.id', $user->public_id);
    }

    #[Test]
    public function every_response_carries_a_request_id(): void
    {
        $this->getJson('/api/auth/me')
            ->assertHeader('X-Request-Id')
            ->assertJsonStructure(['request_id']);
    }
}
