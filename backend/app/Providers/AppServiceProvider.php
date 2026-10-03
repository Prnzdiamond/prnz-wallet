<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());

        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(5)->by('auth:'.Str::lower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(20)->by('auth-ip:'.$request->ip()),
        ]);

        RateLimiter::for('money', fn (Request $request) => Limit::perMinute(30)->by('money:'.$request->user()?->id));

        RateLimiter::for('lookup', fn (Request $request) => Limit::perMinute(30)->by('lookup:'.$request->user()?->id));
    }
}
