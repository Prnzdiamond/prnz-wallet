# Prnz Wallet

A digital wallet and transfer platform. Users hold NGN, USD and USDT balances, fund their wallets
through a simulated top-up, send money to other users, and see every movement on their statement.

**Laravel 13** API · **React 19 + TypeScript** SPA · **PostgreSQL**

[![CI](https://github.com/Prnzdiamond/prnz-wallet/actions/workflows/ci.yml/badge.svg)](https://github.com/Prnzdiamond/prnz-wallet/actions/workflows/ci.yml)

## Live demo

**https://prnz-wallet.vercel.app**

| Account | Email | Password | Starting balance |
|---|---|---|---|
| Ada | `ada@demo.test` | `Password123` | ₦250,000 · $500 · 250 USDT |
| Tunde | `tunde@demo.test` | `Password123` | ₦50,000 |

You can also register a new account; it starts with three empty wallets.

**Try it:** log in as Ada, send money to `tunde@demo.test`, then log in as Tunde to see it arrive.
Try sending more than the balance, or double-clicking **Send**.

### Verify integrity against the live app

```bash
node scripts/concurrency-check.mjs https://prnz-wallet.vercel.app
```

Requires Node 20+ and nothing else. It registers throwaway users (the demo accounts are untouched)
and fires real simultaneous requests:

1. Two ₦80,000 transfers at the same instant from a ₦100,000 wallet → exactly one succeeds, the
   balance ends at ₦20,000.
2. The same transfer submitted 5 times at once with one reference → one transaction, debited once.
3. That reference reused with a different amount → rejected with `409`.

It prints PASS/FAIL per check and exits non-zero on failure.

## Features

- Registration, login, logout and profile with secure cookie sessions
- A 10-digit account number per user, holding NGN, USD and USDT wallets
- Simulated funding with validation and per-currency limits
- User-to-user transfers by account number or email: the recipient's name is verified before the
  amount is entered, recent recipients are one tap away, and each transfer has a reference and
  optional narration
- Transaction history with filters and pagination, and a receipt for each transaction
- Loading, empty, error, success and disabled states throughout; responsive from phone to desktop

## How money is kept correct

**Integer money.** Amounts are stored as integers in the smallest unit (kobo, cents; 6 decimals
for USDT) and cross the API as strings. Floating point is never used for money, on the server or
in the browser.

**Double-entry ledger.** Every movement is a transaction with ledger entries that sum to zero.
Funding moves money from a system clearing account, so money is never created from nothing. A
wallet's balance is a cache of its entries, kept in the same database transaction, and an hourly
`ledger:reconcile` job verifies the two still match.

**Concurrency.** Every money operation locks the wallets it touches (`SELECT … FOR UPDATE`) before
reading balances, always in the same order, so simultaneous transfers cannot overspend and
opposite transfers cannot deadlock.

**Idempotency.** Funding and transfers carry a client `reference`, stored on the transaction with
a hash of the request under a unique index, in the same database transaction as the money. A
repeat returns the original result; the same reference with different details is rejected. Double
clicks, retries and dropped connections cannot execute an operation twice.

**Failures.** A transfer with insufficient funds is recorded as `failed` with a reason and no
ledger entries: visible to the sender, and no money moves. Unexpected errors roll everything back.

**The database enforces it too.** Postgres constraints and triggers reject a negative balance,
unbalanced entries, edits or deletes of ledger history, changes to a transaction's amount or
parties, and a reused reference, even if application code had a bug.

**Security.** Session cookies are `HttpOnly`, `Secure` and CSRF-protected; the SPA reaches the API
through a same-origin proxy, so no tokens live in browser storage. Every query is scoped to the
signed-in user (another user's transaction is a `404`). Public IDs are random ULIDs, and account numbers are random rather than
sequential, so neither can be guessed. Recipient lookup returns only a name and a masked email, is
rate-limited, and there is deliberately no search across users. The server
decides sender, balances and status; the client only states intent. Auth and money endpoints are
rate-limited. Errors return a safe message and a request id, never internals.

## Project structure

```
backend/             Laravel API
  app/Actions          RegisterUser, FundWallet, TransferFunds
  app/Ledger           Idempotency, row locking and posting of ledger entries
  app/Http             Controllers, form requests, resources, error rendering
  app/Support/Money    Decimal string ↔ minor unit conversion
  database/            Migrations (with constraints and triggers) and seeders
  tests/               Unit, feature and concurrency tests
frontend/            React SPA (Vite, TanStack Query, React Router, react-hook-form + zod, Tailwind)
scripts/             Live integrity check
deploy/              Web server and process manager configuration, deploy script
```

## API

All endpoints are under `/api` and return JSON. Amounts are decimal strings, e.g. `"1500.50"`.

| Method | Endpoint | |
|---|---|---|
| POST | `/auth/register` | Create an account (and its wallets) and sign in |
| POST | `/auth/login` | Sign in |
| POST | `/auth/logout` | Sign out |
| GET | `/auth/me` | Current user, including account number |
| GET | `/wallets` | Balances |
| POST | `/wallets/fund` | `{ currency, amount, reference }` |
| POST | `/transfers` | `{ recipient, currency, amount, reference, narration? }`, where `recipient` is an account number or email |
| GET | `/recipients?identifier=` | Resolve an account number or email to a name (email masked) |
| GET | `/recipients/recent` | The last 5 people you sent money to |
| GET | `/transactions` | History; filters `type`, `status`, `currency`; cursor pagination |
| GET | `/transactions/{id}` | One transaction |

Responses: `201` created, `200` idempotent replay (`Idempotent-Replayed: true`), `422` validation
error or insufficient funds (the failed transaction is in `data`), `409` reference reused with
different details, `401`, `404`, `429`. Errors share one shape:
`{ "message", "code", "errors"?, "request_id" }`.

## Running locally

**Requirements:** PHP 8.3+ (extensions `pdo_pgsql`, `bcmath`, `intl`), Composer, Node 20+,
PostgreSQL 14+.

**1. Database**

```sql
CREATE ROLE wallet LOGIN PASSWORD 'choose-a-password';
CREATE DATABASE wallet OWNER wallet;
CREATE DATABASE wallet_test OWNER wallet;
```

**2. Backend**

```bash
cd backend
cp .env.example .env          # set DB_PASSWORD
composer install
php artisan key:generate
php artisan migrate --seed    # system accounts + demo users
php artisan serve             # http://localhost:8000
```

**3. Frontend**

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :8000)
```

Open http://localhost:5173 and log in with a demo account.

### Configuration

| Variable | Purpose |
|---|---|
| `DB_*` | PostgreSQL connection |
| `SANCTUM_STATEFUL_DOMAINS` | Host(s) the SPA is served from, e.g. `localhost:5173` |
| `SESSION_SECURE_COOKIE` | `true` in production (HTTPS) |
| `WALLET_MAX_FUNDING_{NGN,USD,USDT}` | Maximum single funding amount |
| `WALLET_MAX_TRANSFER_{NGN,USD,USDT}` | Maximum single transfer amount |
| `WALLET_LOCK_TIMEOUT` | How long a request waits for a wallet lock (default `5s`) |

## Tests

```bash
cd backend && php artisan test     # 96 tests, needs the wallet_test database
cd frontend && npm test
```

- **Ledger schema**: every database rule (negative balance, zero-sum, append-only, immutability)
- **Auth**: registration, login, rate limiting, access control
- **Funding and transfers**: balances and entries, invalid input, insufficient funds, replays,
  reference conflicts, spoofed parameters ignored, limits
- **History**: ownership, filters, pagination
- **Concurrency**: real parallel PHP processes racing transfers against PostgreSQL: the ₦80k×2
  case, a burst of 10, five identical simultaneous requests, opposite transfers without deadlock

CI runs the full suite, code style, type checks, lint and the production build on every push.

## Deployment

The SPA is hosted on Vercel, which proxies `/api` and `/sanctum` to the API so the browser only
talks to one origin. The API runs on a Linux server with nginx, PHP-FPM and PostgreSQL over HTTPS.
Server configuration and the deploy script are in `deploy/`.

## Not in scope, and what would come next

- **Bank payouts**: debit into a "payouts in transit" system account, call the provider after
  commit, then complete on the provider's webhook or post a reversal on failure. The schema already
  supports pending transactions and reversals.
- **Very busy wallets**: a wallet receiving a very high rate of concurrent credits (a large merchant)
  would serialise on its row lock; the standard fix is splitting it into sub-wallets.
- Email notifications (sent after commit), transaction PIN / 2FA, admin tooling for reversals.
