<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(SystemWalletSeeder::class);

        if (! app()->runningUnitTests()) {
            $this->call(DemoUserSeeder::class);
        }
    }
}
