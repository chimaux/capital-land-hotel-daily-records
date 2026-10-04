import { useState } from 'react'
import type { ReactNode } from 'react'
import { LogoMark, CalendarIcon, ShieldCheckIcon, LogOutIcon, SunIcon, MoonIcon, MenuIcon, XIcon } from './Icons'
import { IconButton } from './ui'
import { useTheme } from '../hooks/useTheme'
import { ROLE_LABEL } from '../types'
import type { Profile } from '../types'

interface Props {
  profile: Profile
  onSignOut: () => void
  onGoPublic: () => void
  children: ReactNode
}

export function Layout({ profile, onSignOut, onGoPublic, children }: Props) {
  const [open, setOpen] = useState(false)
  const { dark, toggle } = useTheme()
  const name = profile.display_name || ROLE_LABEL[profile.role]
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const navItem = 'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-zinc-200 dark:border-zinc-800">
        <div className="rounded-lg bg-brand-600 text-white p-1.5"><LogoMark width={20} height={20} /></div>
        <div className="leading-tight">
          <div className="text-sm font-bold">Ledger</div>
          <div className="text-[11px] text-zinc-400">Hotel daily records</div>
        </div>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Workspace</div>
        <button className={`${navItem} bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400`} onClick={() => setOpen(false)}>
          <CalendarIcon width={18} height={18} /> Daily entry
        </button>
        <button
          className={`${navItem} text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800`}
          onClick={onGoPublic}
        >
          <ShieldCheckIcon width={18} height={18} /> Public view
        </button>
      </nav>
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400 flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{ROLE_LABEL[profile.role]}</div>
          </div>
          <IconButton onClick={onSignOut} aria-label="Sign out" title="Sign out">
            <LogOutIcon width={17} height={17} />
          </IconButton>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
        {sidebar}
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-zinc-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-zinc-900 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 h-16 flex items-center gap-2 px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
          <IconButton className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <XIcon width={20} height={20} /> : <MenuIcon width={20} height={20} />}
          </IconButton>
          <h1 className="text-base font-semibold">Daily entry</h1>
          <div className="ml-auto">
            <IconButton onClick={toggle} aria-label="Toggle dark mode" title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
            </IconButton>
          </div>
        </header>
        <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
