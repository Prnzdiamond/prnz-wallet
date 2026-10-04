<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->char('account_number', 10)->nullable()->after('public_id');
        });

        $taken = [];
        foreach (DB::table('users')->whereNull('account_number')->pluck('id') as $id) {
            do {
                $number = (string) random_int(1_000_000_000, 9_999_999_999);
            } while (isset($taken[$number]));

            $taken[$number] = true;
            DB::table('users')->where('id', $id)->update(['account_number' => $number]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->char('account_number', 10)->nullable(false)->change();
            $table->unique('account_number');
        });

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_account_number_format CHECK (account_number ~ '^[1-9][0-9]{9}$')");
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('account_number');
        });
    }
};
