<?php

namespace App\Services;

use App\Constants\Pagination;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class UserService
{
    public function __construct(
        private readonly UserRepository $userRepo,
    ) {
    }

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->userRepo->paginate($filters, $filters['per_page'] ?? Pagination::DEFAULT_PER_PAGE);
    }

    public function create(array $data): User
    {
        return $this->userRepo->create($data);
    }

    public function update(User $user, array $data): User
    {
        return $this->userRepo->update($user, $data);
    }

    /**
     * @throws AuthorizationException
     */
    public function delete(User $user, User $currentUser): void
    {
        if ($user->is($currentUser)) {
            throw new AuthorizationException('You cannot delete your own account.');
        }

        DB::transaction(fn () => $this->userRepo->delete($user));
    }
}
