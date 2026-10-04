import { useCallback, useEffect, useState } from 'react'

function getInitialDark(): boolean {
  try {
    // Only go dark if the user explicitly chose it before.
    return localStorage.getItem('theme') === 'dark'
  } catch {
    return false
  }
}

export function useTheme() {
  const [dark, setDark] = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return { dark, toggle }
}