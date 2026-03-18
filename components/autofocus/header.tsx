'use client'

import { Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Header() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // AF4 is dark by default
    document.documentElement.classList.add('dark')
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div>
        <h1 className="text-lg tracking-[0.3em] font-medium">
          AUT<span className="text-af4-olive">O</span>FOCUS
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          AF4 — One list. One task. Trust the process.
        </p>
      </div>
      <button
        onClick={toggleTheme}
        className="p-2 hover:bg-accent rounded transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  )
}
