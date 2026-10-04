#!/usr/bin/env bash
# Run on the server from /var/www/prnz-wallet: ./deploy/deploy.sh
set -euo pipefail

PHP=php8.4
cd "$(dirname "$0")/.."

git fetch --quiet origin main
git reset --hard --quiet origin/main

cd backend
$PHP "$(command -v composer)" install --no-dev --prefer-dist --optimize-autoloader --no-interaction --quiet

$PHP artisan down --retry=15 || true
$PHP artisan migrate --force
$PHP artisan db:seed --class=SystemWalletSeeder --force
$PHP artisan optimize
$PHP artisan up

sudo systemctl reload php8.4-fpm
$PHP artisan ledger:reconcile
