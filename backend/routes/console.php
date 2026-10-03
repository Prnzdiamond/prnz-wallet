<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('ledger:reconcile')->hourly()->withoutOverlapping();
