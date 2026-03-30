"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface MermaidDiagramProps {
  /** Static string, or a function receiving isDark so callers can vary node colors */
  chart: string | ((isDark: boolean) => string)
  className?: string
}

// Incrementing counter to guarantee unique mermaid render IDs across all calls
let globalRenderSeq = 0

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme()
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)
  // Keep latest chart in ref so the effect doesn't need it as a dep
  const chartRef = useRef(chart)
  chartRef.current = chart

  const isDark = !!resolvedTheme && resolvedTheme.startsWith("dark")

  useEffect(() => {
    let cancelled = false

    async function render(attempt = 0) {
      if (cancelled) return
      try {
        const mermaid = (await import("mermaid")).default
        if (cancelled) return
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "neutral",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 13,
          flowchart: { curve: "basis", padding: 20 },
        })
        const chartStr = typeof chartRef.current === "function"
          ? chartRef.current(isDark)
          : chartRef.current
        const renderId = `${idRef.current}-${++globalRenderSeq}`
        const { svg: rendered } = await mermaid.render(renderId, chartStr)
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          if (attempt < 2) {
            // Retry after a short delay — mermaid can fail on first load
            // if React commits the component during a hydration/theme-resolve cycle
            setTimeout(() => render(attempt + 1), 120)
          } else {
            setError(String(e))
          }
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [isDark]) // chart kept in ref — only re-render when theme changes or on mount

  if (!svg && !error) return (
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
      suppressHydrationWarning
    />
  )
}
