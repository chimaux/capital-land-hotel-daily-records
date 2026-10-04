import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { TrashIcon, InboxIcon } from './Icons'

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
      <h2 className="text-sm font-semibold flex items-center gap-2">{children}</h2>
      {action}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }

export function PrimaryButton({ className = '', loading, disabled, children, ...props }: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function GhostButton({ className = '', loading, disabled, children, ...props }: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm rounded-lg px-3.5 py-2 transition-colors ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function DangerButton({ className = '', loading, disabled, children, ...props }: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function IconButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    />
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{children}</label>
}

export const inputCls =
  'w-full rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:text-zinc-400 disabled:cursor-not-allowed tabular-nums'

export function Pill({ tone, children }: { tone: 'good' | 'bad' | 'warn' | 'neutral'; children: ReactNode }) {
  const tones = {
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    bad: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    warn: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    neutral: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function TotalRow({ label, value, grand = false }: { label: string; value: string; grand?: boolean }) {
  return (
    <div className={`flex justify-between text-sm py-1.5 ${grand ? 'border-t border-zinc-200 dark:border-zinc-700 mt-1 pt-3 text-base font-semibold' : ''}`}>
      <span className={grand ? '' : 'text-zinc-600 dark:text-zinc-400'}>{label}</span>
      <b className="tabular-nums font-semibold">{value}</b>
    </div>
  )
}

export function ExpenseRow({
  description, amount, onDelete, disabled,
}: { description: string; amount: string; onDelete?: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-none text-sm">
      <span className="min-w-0 truncate">{description}</span>
      <span className="flex items-center gap-1 shrink-0">
        <b className="tabular-nums font-semibold">{amount}</b>
        {onDelete && (
          <IconButton onClick={onDelete} disabled={disabled} aria-label={`Delete ${description}`} className="!p-1.5">
            <TrashIcon width={15} height={15} />
          </IconButton>
        )}
      </span>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-800 ${className}`} />
}

export function EmptyState({ title, body, icon }: { title: string; body?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 p-3 mb-3">
        {icon ?? <InboxIcon width={22} height={22} />}
      </div>
      <div className="text-sm font-medium">{title}</div>
      {body && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">{body}</p>}
    </div>
  )
}

export function ConfirmDialog({
  open, title, body, confirmLabel, danger, loading, onConfirm, onCancel,
}: {
  open: boolean; title: string; body: string; confirmLabel: string
  danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  const Btn = danger ? DangerButton : PrimaryButton
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">{body}</p>
        <div className="flex justify-end gap-2 mt-5">
          <GhostButton onClick={onCancel} disabled={loading}>Cancel</GhostButton>
          <Btn onClick={onConfirm} loading={loading}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  )
}
