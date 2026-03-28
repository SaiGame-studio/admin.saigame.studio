"use client"

import { useEffect, useRef, useState } from "react"

interface MermaidDiagramProps {
  chart: string
  className?: string
}

let mermaidInitialized = false

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 13,
          })
          mermaidInitialized = true
        }
        const { svg: rendered } = await mermaid.render(idRef.current, chart)
        if (!cancelled) setSvg(rendered)
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    }
    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) return (
    <div className="text-xs text-destructive font-mono p-2 border rounded bg-destructive/5">{error}</div>
  )

  if (!svg) return (
    <div className="h-32 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
      Rendering diagram…
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
