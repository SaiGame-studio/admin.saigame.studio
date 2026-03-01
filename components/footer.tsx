"use client"

import { useEffect, useState } from "react"
import { Clock, Package } from "lucide-react"
import { SITE_NAME } from "@/lib/utils/site-config"
import { getUserTimezone } from "@/lib/utils/date-utils"

export function Footer() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION
  const [timezone, setTimezone] = useState<string>("")
  const [time, setTime] = useState<string>("")

  useEffect(() => {
    const tz = getUserTimezone()
    setTimezone(tz)

    const tick = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("en-GB", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      )
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <footer className="border-t py-2 px-4 text-xs text-muted-foreground flex items-center justify-center gap-3">
      {time && (
        <span className="font-mono tabular-nums tracking-tight opacity-70">{time}</span>
      )}
      <span className="flex items-center gap-1">
        <Package className="h-3 w-3" />
        {SITE_NAME} {version} • {new Date().getFullYear()}
      </span>
      {timezone && (
        <span className="flex items-center gap-1 opacity-60" title={`Dates and times are shown in: ${timezone}`}>
          <Clock className="h-3 w-3" />
          {timezone}
        </span>
      )}
    </footer>
  )
}


