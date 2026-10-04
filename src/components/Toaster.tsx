import { useEffect, useState } from 'react'
import { AlertIcon, CheckCircleIcon } from './Icons'

type Kind = 'success' | 'error'
interface Item { id: number; kind: Kind; message: string }

let listeners: Array<(i: Item) => void> = []
let counter = 0

export function toast(message: string, kind: Kind = 'success') {
  const item = { id: ++counter, kind, message }
  listeners.forEach((l) => l(item))
}

export function Toaster() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const l = (i: Item) => {
      setItems((prev) => [...prev, i])
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== i.id)), 3500)
    }
    listeners.push(l)
    return () => {
      listeners = listeners.filter((x) => x !== l)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg px-4 py-3 text-sm"
        >
          {t.kind === 'success' ? (
            <CheckCircleIcon width={18} height={18} className="text-emerald-500 shrink-0" />
          ) : (
            <AlertIcon width={18} height={18} className="text-red-500 shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}
