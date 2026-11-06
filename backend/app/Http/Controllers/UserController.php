<?php

namespace App\Http\Controllers;

use App\Http\Requests\IndexUserRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {
    }

    /**
     * Display a listing of the resource.
     */
    public function index(IndexUserRequest $request): AnonymousResourceCollection
    {
        return UserResource::collection($this->userService->list($request->validated()));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): UserResource
    {
        return new UserResource($user->loadCount('tasks'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        return new UserResource($this->userService->update($user, $request->validated()));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, User $user): Response
    {
        $this->userService->delete($user, $request->user());

        return response()->noContent();
    }
}
