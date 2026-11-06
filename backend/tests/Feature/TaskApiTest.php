<?php

namespace Tests\Feature;

use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->admin()->create());
    }

    public function test_it_lists_tasks_with_pagination(): void
    {
        Task::factory()->count(3)->create();

        $this->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'title', 'description', 'status', 'due_date', 'assigned_to']],
                'links',
                'meta' => ['current_page', 'per_page', 'total'],
            ]);
    }

    public function test_it_filters_tasks_by_status_and_assignee(): void
    {
        $user = User::factory()->create();
        $match = Task::factory()->for($user)->create(['status' => TaskStatus::Done]);
        Task::factory()->for($user)->create(['status' => TaskStatus::Todo]);
        Task::factory()->create(['status' => TaskStatus::Done]);

        $this->getJson("/api/tasks?status=done&assigned_to={$user->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_it_searches_tasks_by_title_and_description(): void
    {
        $byTitle = Task::factory()->create(['title' => 'Fix login bug', 'description' => null]);
        $byDescription = Task::factory()->create(['title' => 'Release', 'description' => 'Check the LOGIN flow']);
        Task::factory()->create(['title' => 'Write docs', 'description' => 'Nothing related']);

        $ids = collect($this->getJson('/api/tasks?search=login')->assertOk()->json('data'))->pluck('id');

        $this->assertEqualsCanonicalizing([$byTitle->id, $byDescription->id], $ids->all());
    }

    public function test_it_combines_search_with_other_filters(): void
    {
        $match = Task::factory()->create(['title' => 'Deploy api', 'status' => TaskStatus::Done]);
        Task::factory()->create(['title' => 'Deploy web', 'status' => TaskStatus::Todo]);

        $this->getJson('/api/tasks?search=deploy&status=done')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_it_treats_like_wildcards_in_search_literally(): void
    {
        $match = Task::factory()->create(['title' => 'Coverage 100% done']);
        Task::factory()->create(['title' => 'Coverage 1000 lines']);
        Task::factory()->create(['title' => 'snake_case rename']);
        Task::factory()->create(['title' => 'snakeXcase rename']);

        $this->getJson('/api/tasks?search='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);

        $this->getJson('/api/tasks?search=snake_case')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_it_rejects_an_invalid_status_filter(): void
    {
        $this->getJson('/api/tasks?status=archived')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_it_creates_a_task(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/tasks', [
            'title' => 'Write report',
            'description' => 'Quarterly numbers',
            'assigned_to' => $user->id,
            'due_date' => '2026-12-01',
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Write report')
            ->assertJsonPath('data.status', 'todo')
            ->assertJsonPath('data.due_date', '2026-12-01')
            ->assertJsonPath('data.assigned_to', $user->id)
            ->assertJsonMissingPath('data.assignee');

        $this->assertDatabaseHas('tasks', ['title' => 'Write report', 'assigned_to' => $user->id]);
    }

    public function test_it_validates_task_creation(): void
    {
        $this->postJson('/api/tasks', ['status' => 'unknown', 'assigned_to' => 999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'status', 'assigned_to']);
    }

    public function test_it_returns_validation_errors_as_json_without_accept_header(): void
    {
        $this->post('/api/tasks', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_it_shows_a_task(): void
    {
        $task = Task::factory()->create();

        $this->getJson("/api/tasks/{$task->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $task->id)
            ->assertJsonPath('data.assigned_to', $task->assigned_to);
    }

    public function test_it_returns_404_for_a_missing_task(): void
    {
        $this->get('/api/tasks/999')
            ->assertNotFound()
            ->assertJsonStructure(['message']);
    }

    public function test_it_updates_a_task(): void
    {
        $task = Task::factory()->create(['status' => TaskStatus::Todo]);
        $newUser = User::factory()->create();

        $this->putJson("/api/tasks/{$task->id}", [
            'status' => 'in_progress',
            'assigned_to' => $newUser->id,
            'due_date' => null,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.assigned_to', $newUser->id)
            ->assertJsonPath('data.due_date', null)
            ->assertJsonPath('data.title', $task->title);
    }

    public function test_it_validates_task_update(): void
    {
        $task = Task::factory()->create();

        $this->putJson("/api/tasks/{$task->id}", ['title' => '', 'due_date' => 'tomorrow'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'due_date']);
    }

    public function test_it_soft_deletes_a_task(): void
    {
        $task = Task::factory()->create();

        $this->deleteJson("/api/tasks/{$task->id}")->assertNoContent();

        $this->assertSoftDeleted($task);
        $this->getJson("/api/tasks/{$task->id}")->assertNotFound();
    }
}
