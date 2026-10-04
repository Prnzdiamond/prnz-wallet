#!/usr/bin/env node
// Usage: node scripts/concurrency-check.mjs https://your-deployment-url   (Node 20+)

import { randomUUID } from 'node:crypto'

const baseUrl = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '')
const runId = Date.now().toString(36)
let failures = 0

class Client {
  cookies = new Map()

  async request(method, path, body) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: baseUrl,
      Referer: `${baseUrl}/`,
      Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
    }
    const xsrf = this.cookies.get('XSRF-TOKEN')
    if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf)

    const res = await fetch(baseUrl + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';')
      const index = pair.indexOf('=')
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1))
    }

    const text = await res.text()
    return { status: res.status, body: text ? JSON.parse(text) : null }
  }

  async register(label) {
    await this.request('GET', '/sanctum/csrf-cookie')
    const email = `check-${runId}-${label}@example.com`
    const res = await this.request('POST', '/api/auth/register', {
      name: `Check ${label}`,
      email,
      password: 'Password123',
      password_confirmation: 'Password123',
    })
    if (res.status !== 201) throw new Error(`Could not register ${label}: ${res.status} ${JSON.stringify(res.body)}`)
    this.email = email
    return this
  }

  async balance(currency = 'NGN') {
    const res = await this.request('GET', '/api/wallets')
    return res.body.data.find((w) => w.currency === currency).balance
  }

  transfer(recipient, amount, reference = randomUUID()) {
    return this.request('POST', '/api/transfers', { recipient: recipient.email, currency: 'NGN', amount, reference })
  }
}

function check(label, passed, detail) {
  if (!passed) failures++
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}

console.log(`Checking ${baseUrl}\n`)

const sender = await new Client().register('sender')
const first = await new Client().register('first')
const second = await new Client().register('second')

const funded = await sender.request('POST', '/api/wallets/fund', { currency: 'NGN', amount: '100000', reference: randomUUID() })
check('Sender funded with ₦100,000', funded.status === 201, `HTTP ${funded.status}`)

console.log('\n1. Two ₦80,000 transfers fired at the same instant from a ₦100,000 wallet')
const race = await Promise.all([sender.transfer(first, '80000'), sender.transfer(second, '80000')])
const statuses = race.map((r) => r.status).sort()
check('Exactly one succeeds and one is rejected for insufficient funds', statuses[0] === 201 && statuses[1] === 422, `HTTP ${statuses.join(', ')}`)
const afterRace = await sender.balance()
check('Sender balance is ₦20,000', afterRace === '20000.00', `₦${afterRace}`)
const received = [await first.balance(), await second.balance()].sort()
check('Only one recipient received ₦80,000', received[0] === '0.00' && received[1] === '80000.00', received.map((b) => `₦${b}`).join(' / '))

console.log('\n2. The same ₦5,000 transfer submitted 5 times at once with one reference')
const reference = randomUUID()
const repeats = await Promise.all(Array.from({ length: 5 }, () => sender.transfer(first, '5000', reference)))
const ids = new Set(repeats.map((r) => r.body?.data?.id))
check('All 5 requests return the same transaction', ids.size === 1 && !ids.has(undefined), `${ids.size} distinct id(s)`)
check('Exactly one is new, the rest are replays', repeats.filter((r) => r.status === 201).length === 1, `HTTP ${repeats.map((r) => r.status).join(', ')}`)
const afterRepeat = await sender.balance()
check('Sender was debited once: balance is ₦15,000', afterRepeat === '15000.00', `₦${afterRepeat}`)

console.log('\n3. Reusing that reference with a different amount')
const conflict = await sender.transfer(first, '1', reference)
check('Rejected as a conflict', conflict.status === 409, `HTTP ${conflict.status}`)

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.')
process.exit(failures ? 1 : 0)
