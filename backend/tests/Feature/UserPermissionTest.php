<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class UserPermissionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string, string}>
     */
    public static function userEndpoints(): array
    {
        return [
            'list' => ['get', '/api/users'],
            'create' => ['post', '/api/users'],
            'show' => ['get', '/api/users/{id}'],
            'update' => ['put', '/api/users/{id}'],
            'delete' => ['delete', '/api/users/{id}'],
        ];
    }

    #[DataProvider('userEndpoints')]
    public function test_regular_user_cannot_manage_users(string $method, string $uri): void
    {
        $target = User::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->json($method, str_replace('{id}', (string) $target->id, $uri), [
            'name' => 'Changed',
            'email' => 'changed@example.com',
            'password' => 'secret123',
            'role' => 'admin',
        ])->assertForbidden();

        $this->assertSame(UserRole::User, $target->fresh()->role);
        $this->assertDatabaseMissing('users', ['email' => 'changed@example.com']);
    }

    public function test_regular_user_cannot_view_their_own_record_via_users_api(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson("/api/users/{$user->id}")->assertForbidden();
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_admin_cannot_change_their_own_role(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$admin->id}", ['role' => 'user'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role' => 'You cannot change your own role.']);

        $this->assertSame(UserRole::Admin, $admin->fresh()->role);
    }

    public function test_admin_can_update_their_own_profile_keeping_the_role(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$admin->id}", ['name' => 'Renamed', 'role' => 'admin'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed');
    }

    public function test_admin_can_change_another_admins_role(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        $otherAdmin = User::factory()->admin()->create();

        $this->putJson("/api/users/{$otherAdmin->id}", ['role' => 'user'])
            ->assertOk()
            ->assertJsonPath('data.role', 'user');
    }

    public function test_admin_can_delete_another_admin(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        $otherAdmin = User::factory()->admin()->create();

        $this->deleteJson("/api/users/{$otherAdmin->id}")->assertNoContent();
        $this->assertModelMissing($otherAdmin);
    }
}
