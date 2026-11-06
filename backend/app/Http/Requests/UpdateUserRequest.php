<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('user'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes', 'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($this->route('user')),
            ],
            'password' => ['sometimes', 'required', 'string', 'min:8', 'max:255'],
            'role' => [
                'sometimes', 'required', Rule::enum(UserRole::class),
                function (string $attribute, mixed $value, Closure $fail) {
                    if ($this->route('user')->is($this->user()) && $value !== $this->user()->role->value) {
                        $fail('You cannot change your own role.');
                    }
                },
            ],
        ];
    }
}
