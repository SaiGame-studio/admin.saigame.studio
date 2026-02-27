"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

const THEMES = ["light", "dark", "system"] as const
type Theme = typeof THEMES[number]

const ICONS: Record<Theme, React.ReactNode> = {
  light:  <Sun className="h-[1.2rem] w-[1.2rem]" />,
  dark:   <Moon className="h-[1.2rem] w-[1.2rem]" />,
  system: <Monitor className="h-[1.2rem] w-[1.2rem]" />,
}

const LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const cycle = () => {
    const current = (theme ?? "system") as Theme
    const idx = THEMES.indexOf(current)
    setTheme(THEMES[(idx + 1) % THEMES.length])

    // Show label then fade out
    setShowLabel(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShowLabel(false), 1200)
  }

  const current = (mounted ? (theme ?? "system") : "system") as Theme

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
