"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import { Moon, Sun, Monitor, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"

const THEMES = ["light-warm", "dark-green", "light", "dark", "system"] as const
type Theme = typeof THEMES[number]

const ICONS: Record<Theme, React.ReactNode> = {
  "light-warm": <Sun className="h-[1.2rem] w-[1.2rem] text-amber-400" />,
  "dark-green": <Leaf className="h-[1.2rem] w-[1.2rem] text-green-400" />,
  light:        <Sun className="h-[1.2rem] w-[1.2rem]" />,
  dark:         <Moon className="h-[1.2rem] w-[1.2rem]" />,
  system:       <Monitor className="h-[1.2rem] w-[1.2rem]" />,
}

const LABELS: Record<Theme, string> = {
  "light-warm": "Warm Light",
  "dark-green": "Dark Green",
  light:        "Light",
  dark:         "Dark",
  system:       "System",
}

function resolveTheme(theme: string | undefined): Theme {
  if (!theme) return "system"
  if ((THEMES as readonly string[]).includes(theme)) return theme as Theme
  return "system"
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const current = resolveTheme(mounted ? theme : undefined)

  const cycle = () => {
    const idx = THEMES.indexOf(current)
    setTheme(THEMES[(idx + 1) % THEMES.length])

    setShowLabel(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShowLabel(false), 1400)
  }

  // Also show label when theme changes externally (e.g. from side-nav)
  const prevThemeRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!mounted) return
    if (prevThemeRef.current !== undefined && prevThemeRef.current !== theme) {
      setShowLabel(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setShowLabel(false), 1400)
    }
    prevThemeRef.current = theme
  }, [theme, mounted])

  return (
    <div className="relative flex items-center">
      {/* Floating label flies left */}
      <span
        className={`absolute right-full mr-2 whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded bg-popover border border-border shadow-sm text-foreground pointer-events-none transition-all duration-300 ${
          showLabel ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
        }`}
      >
        {LABELS[current]}
      </span>

      <Button variant="outline" size="icon" onClick={mounted ? cycle : undefined} disabled={!mounted}>
        {ICONS[current]}
        <span className="sr-only">Toggle theme ({current})</span>
      </Button>
    </div>
  )
}
