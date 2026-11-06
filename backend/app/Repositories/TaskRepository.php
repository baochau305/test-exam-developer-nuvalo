<?php

namespace App\Repositories;

use App\Models\Task;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TaskRepository
{
    public function paginate(array $filters, int $perPage): LengthAwarePaginator
    {
        return Task::query()
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['assigned_to'] ?? null, fn ($query, $userId) => $query->where('assigned_to', $userId))
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->search($search, ['title', 'description']))
            ->latest()
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function create(array $data): Task
    {
        return Task::create($data);
    }

    public function update(Task $task, array $data): Task
    {
        $task->update($data);

        return $task;
    }

    public function delete(Task $task): void
    {
        $task->delete();
    }
}
