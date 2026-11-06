<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    private User $currentUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->currentUser = User::factory()->admin()->create(['name' => 'Current Admin']);
        Sanctum::actingAs($this->currentUser);
    }

    public function test_it_requires_authentication(): void
    {
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', '')
            ->get('/api/users')
            ->assertUnauthorized();
    }

    public function test_it_lists_users_with_task_count(): void
    {
        $user = User::factory()->create();
        Task::factory()->count(2)->for($user)->create();

        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'name', 'email', 'role', 'tasks_count']],
                'links',
                'meta' => ['current_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('data.0.id', $user->id)
            ->assertJsonPath('data.0.tasks_count', 2)
            ->assertJsonMissingPath('data.0.password');
    }

    public function test_it_filters_users_by_role_and_search(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Alice Admin']);
        User::factory()->create(['name' => 'Alice User']);

        $this->getJson('/api/users?role=admin&search=alice')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $admin->id);
    }

    public function test_it_searches_users_by_email(): void
    {
        $match = User::factory()->create(['email' => 'jane.doe@company.test']);
        User::factory()->create(['email' => 'john@other.test']);

        $this->getJson('/api/users?search=company')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_it_creates_a_user_with_a_role(): void
    {
        $this->postJson('/api/users', [
            'name' => 'New Admin',
            'email' => 'new-admin@example.com',
            'password' => 'secret123',
            'role' => 'admin',
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'new-admin@example.com')
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonMissingPath('data.password');

        $user = User::where('email', 'new-admin@example.com')->first();
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertTrue(Hash::check('secret123', $user->password));
    }

    public function test_it_defaults_new_users_to_the_user_role(): void
    {
        $this->postJson('/api/users', [
            'name' => 'Normal',
            'email' => 'normal@example.com',
            'password' => 'secret123',
        ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'user');
    }

    public function test_it_validates_user_creation(): void
    {
        $this->postJson('/api/users', [
            'email' => $this->currentUser->email,
            'password' => 'short',
            'role' => 'superadmin',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password', 'role']);
    }

    public function test_it_shows_a_user(): void
    {
        $user = User::factory()->create();

        $this->getJson("/api/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.tasks_count', 0);
    }

    public function test_it_returns_404_for_a_missing_user(): void
    {
        $this->getJson('/api/users/999')->assertNotFound();
    }

    public function test_it_updates_a_user(): void
    {
        $user = User::factory()->create();

        $this->putJson("/api/users/{$user->id}", [
            'name' => 'Renamed',
            'password' => 'new-password',
            'role' => 'admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed')
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.email', $user->email);

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_it_allows_keeping_the_same_email_on_update(): void
    {
        $user = User::factory()->create();

        $this->putJson("/api/users/{$user->id}", ['email' => $user->email])->assertOk();
    }

    public function test_it_rejects_an_email_taken_by_another_user(): void
    {
        $user = User::factory()->create();

        $this->putJson("/api/users/{$user->id}", ['email' => $this->currentUser->email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_it_deletes_a_user_with_their_tasks_and_tokens(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for($user)->create();
        $user->createToken('api');

        $this->deleteJson("/api/users/{$user->id}")->assertNoContent();

        $this->assertModelMissing($user);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_it_forbids_deleting_your_own_account(): void
    {
        $this->deleteJson("/api/users/{$this->currentUser->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'You cannot delete your own account.');

        $this->assertModelExists($this->currentUser);
    }
}
