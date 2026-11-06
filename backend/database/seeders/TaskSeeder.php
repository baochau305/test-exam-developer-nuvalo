<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        $taskCounts = [
            'admin@gmail.com' => 3,
            'user1@gmail.com' => 4,
            'user2@gmail.com' => 13,
        ];

        foreach ($taskCounts as $email => $count) {
            $user = User::where('email', $email)->firstOrFail();

            Task::factory()->count($count)->for($user)->create();
        }
    }
}
