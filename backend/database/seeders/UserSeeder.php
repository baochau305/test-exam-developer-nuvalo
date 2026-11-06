<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Admin', 'email' => 'admin@gmail.com', 'role' => UserRole::Admin],
            ['name' => 'User 1', 'email' => 'user1@gmail.com', 'role' => UserRole::User],
            ['name' => 'User 2', 'email' => 'user2@gmail.com', 'role' => UserRole::User],
        ];

        foreach ($users as $data) {
            User::firstOrNew(['email' => $data['email']])
                ->forceFill([
                    'name' => $data['name'],
                    'password' => '123123123',
                    'role' => $data['role'],
                ])
                ->save();
        }
    }
}
