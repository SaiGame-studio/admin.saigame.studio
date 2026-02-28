"use client"

import { useEffect, useState, useCallback } from "react"
import { Lightbulb, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"

const TIPS_INDEX_KEY  = "tips_banner_last_index"
const AUTO_ROTATE_MS  = 9000
const SHOW_DELAY_MS   = 1800

export function TipsBanner() {
  const { t, locale } = useTranslation()

  const getTips = useCallback((): string[] => {
    const tips: string[] = []
    let i = 1
    while (true) {
      const tip = t(`tips.tip${i}`)
      if (tip === `tips.tip${i}`) break
      tips.push(tip)
      i++
    }
    return tips
  }, [t, locale])

  const [tips, setTips] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [animIn, setAnimIn] = useState(false)
  const [index, setIndex] = useState(0)
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    setMounted(true)
    const computed = getTips()
    setTips(computed)

    const savedIndex = Number(localStorage.getItem(TIPS_INDEX_KEY) ?? "0") % Math.max(computed.length, 1)
    let nextIndex = Math.floor(Math.random() * computed.length)
    if (computed.length > 1 && nextIndex === savedIndex) {
      nextIndex = (nextIndex + 1) % computed.length
    }
    setIndex(nextIndex)

    const timer = setTimeout(() => {
      requestAnimationFrame(() => setAnimIn(true))
    }, SHOW_DELAY_MS)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const computed = getTips()
    setTips(computed)
    setIndex(prev => prev % Math.max(computed.length, 1))
  }, [locale, mounted])

  useEffect(() => {
    if (!mounted || tips.length <= 1) return
    const timer = setInterval(() => changeIndex("next"), AUTO_ROTATE_MS)
    return () => clearInterval(timer)
  }, [mounted, tips.length, index])

  const changeIndex = (dir: "next" | "prev") => {
    setChanging(true)
    setTimeout(() => {
      setIndex(prev => {
        const next =
          dir === "next"
            ? (prev + 1) % tips.length
            : (prev - 1 + tips.length) % tips.length
        localStorage.setItem(TIPS_INDEX_KEY, String(next))
        return next
      })
      setChanging(false)
    }, 180)
  }

  if (!mounted || tips.length === 0) return null

  return (
    <div
      className="hidden lg:flex flex-1 min-w-0 items-center gap-2"
      style={{
        transition: "opacity 0.3s ease",
        opacity: animIn ? 1 : 0,
      }}
    >
      {/* Label */}
      <Lightbulb className="h-3 w-3 text-muted-foreground/50 shrink-0" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 shrink-0">
        {t("tips.label")}
      </span>
      {tips.length > 1 && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => changeIndex("prev")}
            className="rounded p-0.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="text-[10px] text-muted-foreground/40 tabular-nums">
            {index + 1}/{tips.length}
          </span>
          <button
            onClick={() => changeIndex("next")}
            className="rounded p-0.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
      <span className="text-muted-foreground/20 shrink-0">·</span>

      {/* Tip text */}
      <span
        className="text-xs text-muted-foreground/50 truncate"
        style={{
          transition: "opacity 0.18s ease",
          opacity: changing ? 0 : 1,
        }}
      >
        {tips[index]}
      </span>


    </div>
  )
}
