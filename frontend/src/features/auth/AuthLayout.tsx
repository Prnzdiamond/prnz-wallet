import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(28rem,36rem)]">
      <div className="guilloche relative hidden overflow-hidden bg-naira-deep p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo className="text-lg [&_rect]:fill-white [&_path]:stroke-naira-deep" />
        <div className="max-w-md">
          <p className="text-4xl leading-tight font-bold tracking-tight text-balance">Naira, dollars and USDT in one wallet.</p>
          <p className="mt-4 text-white/75">Fund your wallet, send money to anyone with an account, and see every movement on your statement.</p>
        </div>
        <p className="text-sm text-white/60">Demo application. No real money moves.</p>
      </div>

      <main className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-sm text-ink-soft">{footer}</div>
        </div>
      </main>
    </div>
  )
}
