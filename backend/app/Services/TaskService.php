<?php

namespace App\Services;

use App\Constants\Pagination;
use App\Models\Task;
use App\Repositories\TaskRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TaskService
{
    public function __construct(
        private readonly TaskRepository $taskRepo,
    ) {
    }

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->taskRepo->paginate($filters, $filters['per_page'] ?? Pagination::DEFAULT_PER_PAGE);
    }

    public function create(array $data): Task
    {
        return $this->taskRepo->create($data)->load('user');
    }

    public function update(Task $task, array $data): Task
    {
        return $this->taskRepo->update($task, $data)->load('user');
    }

    public function delete(Task $task): void
    {
        $this->taskRepo->delete($task);
    }
}
