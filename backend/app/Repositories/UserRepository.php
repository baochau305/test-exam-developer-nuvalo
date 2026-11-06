<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UserRepository
{
    public function paginate(array $filters, int $perPage): LengthAwarePaginator
    {
        return User::query()
            ->withCount('tasks')
            ->when($filters['role'] ?? null, fn ($query, $role) => $query->where('role', $role))
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function create(array $data): User
    {
        return User::query()->forceCreate($data);
    }

    public function update(User $user, array $data): User
    {
        $user->forceFill($data)->save();

        return $user;
    }

    public function delete(User $user): void
    {
        $user->tokens()->delete();
        $user->delete();
    }
}
