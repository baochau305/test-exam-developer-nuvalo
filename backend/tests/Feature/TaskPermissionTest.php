<?php

namespace Tests\Feature;

use App\Models\Scopes\OwnerScope;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskPermissionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->otherUser = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    public function test_user_only_sees_their_own_tasks(): void
    {
        $own = Task::factory()->for($this->user)->create();
        Task::factory()->for($this->otherUser)->create();

        $this->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);
    }

    public function test_user_cannot_list_another_users_tasks_via_filter(): void
    {
        Task::factory()->for($this->user)->create();
        Task::factory()->for($this->otherUser)->create();

        $this->getJson("/api/tasks?assigned_to={$this->otherUser->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_user_can_view_update_and_delete_their_own_task(): void
    {
        $task = Task::factory()->for($this->user)->create();

        $this->getJson("/api/tasks/{$task->id}")->assertOk();
        $this->putJson("/api/tasks/{$task->id}", ['title' => 'Mine'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Mine');
        $this->deleteJson("/api/tasks/{$task->id}")->assertNoContent();
    }

    public function test_another_users_task_is_not_found_for_a_regular_user(): void
    {
        $task = Task::factory()->for($this->otherUser)->create(['title' => 'Not yours']);

        $this->getJson("/api/tasks/{$task->id}")->assertNotFound();
        $this->putJson("/api/tasks/{$task->id}", ['title' => 'Hacked'])->assertNotFound();
        $this->deleteJson("/api/tasks/{$task->id}")->assertNotFound();

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => 'Not yours', 'deleted_at' => null]);
    }

    public function test_another_users_task_is_not_found_before_validation(): void
    {
        $task = Task::factory()->for($this->otherUser)->create();

        $this->putJson("/api/tasks/{$task->id}", ['title' => ''])->assertNotFound();
    }

    public function test_user_task_is_assigned_to_themselves_by_default(): void
    {
        $this->postJson('/api/tasks', ['title' => 'My task'])
            ->assertCreated()
            ->assertJsonPath('data.assigned_to', $this->user->id);
    }

    public function test_user_can_explicitly_assign_a_task_to_themselves(): void
    {
        $this->postJson('/api/tasks', ['title' => 'My task', 'assigned_to' => $this->user->id])
            ->assertCreated()
            ->assertJsonPath('data.assigned_to', $this->user->id);
    }

    public function test_user_cannot_create_a_task_for_someone_else(): void
    {
        $this->postJson('/api/tasks', ['title' => 'For you', 'assigned_to' => $this->otherUser->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assigned_to' => 'You can only assign tasks to yourself.']);

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_user_cannot_reassign_their_task_to_someone_else(): void
    {
        $task = Task::factory()->for($this->user)->create();

        $this->putJson("/api/tasks/{$task->id}", ['assigned_to' => $this->otherUser->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('assigned_to');

        $this->assertSame($this->user->id, $task->fresh()->assigned_to);
    }

    public function test_admin_must_choose_an_assignee(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/tasks', ['title' => 'No assignee'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('assigned_to');
    }

    public function test_regular_user_queries_are_scoped_to_their_own_tasks(): void
    {
        Task::factory()->count(2)->for($this->user)->create();
        Task::factory()->count(3)->for($this->otherUser)->create();

        $this->assertSame(2, Task::count());
        $this->assertSame(2, Task::withoutGlobalScope(OwnerScope::class)->where('assigned_to', $this->user->id)->count());
        $this->assertSame(5, Task::withoutGlobalScope(OwnerScope::class)->count());
    }

    public function test_queries_are_not_scoped_without_an_authenticated_user(): void
    {
        Task::factory()->count(2)->for($this->user)->create();
        Task::factory()->count(3)->for($this->otherUser)->create();

        $this->app['auth']->forgetGuards();

        $this->assertSame(5, Task::count());
    }

    public function test_admin_sees_all_tasks_and_can_filter_by_assignee(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        $mine = Task::factory()->for($this->user)->create();
        Task::factory()->for($this->otherUser)->create();

        $this->getJson('/api/tasks')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson("/api/tasks?assigned_to={$this->user->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);
    }

    public function test_admin_can_manage_any_users_task(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        $task = Task::factory()->for($this->user)->create();

        $this->getJson("/api/tasks/{$task->id}")->assertOk();
        $this->putJson("/api/tasks/{$task->id}", ['assigned_to' => $this->otherUser->id])
            ->assertOk()
            ->assertJsonPath('data.assigned_to', $this->otherUser->id);
        $this->deleteJson("/api/tasks/{$task->id}")->assertNoContent();
    }
}
