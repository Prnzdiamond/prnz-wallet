export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="currentColor" className="text-naira" />
        <path d="M11 24V8h6.5a4.75 4.75 0 0 1 0 9.5H11" fill="none" stroke="#F2F4F1" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Prnz Wallet
    </span>
  )
}
