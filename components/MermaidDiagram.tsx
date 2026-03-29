"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface MermaidDiagramProps {
  /** Static string, or a function receiving isDark so callers can vary node colors */
  chart: string | ((isDark: boolean) => string)
  className?: string
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)

  useEffect(() => { setMounted(true) }, [])

  const isDark = mounted && !!resolvedTheme && resolvedTheme.startsWith("dark")

  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "neutral",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 13,
          flowchart: { curve: "basis", padding: 20 },
        })
        const chartStr = typeof chart === "function" ? chart(isDark) : chart
        const renderId = `${idRef.current}-${isDark ? "d" : "l"}`
        const { svg: rendered } = await mermaid.render(renderId, chartStr)
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    }
    render()
    return () => { cancelled = true }
  }, [chart, isDark, mounted])

  if (!mounted || !svg) return (
    <div className="h-32 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
      Rendering diagram…
    </div>
  )

  if (error) return (
    <div className="text-xs text-destructive font-mono p-2 border rounded bg-destructive/5 whitespace-pre-wrap">{error}</div>
  )

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
