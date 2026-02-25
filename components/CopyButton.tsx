"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

interface CopyButtonProps {
  text: string
  className?: string
  /** Icon size class (default: "h-3.5 w-3.5") */
  size?: string
}

export function CopyButton({ text, className, size = "h-3.5 w-3.5" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallback())
    } else {
      fallback()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function fallback() {
    const el = document.createElement("textarea")
    el.value = text
    el.style.position = "fixed"
    el.style.opacity = "0"
    document.body.appendChild(el)
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
  }

  return (
    <button
      onClick={handleCopy}
      className={`ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors${className ? ` ${className}` : ""}`}
      title="Copy"
      type="button"
    >
      {copied
        ? <Check className={`${size} text-green-500`} />
        : <Copy className={size} />}
    </button>
  )
}
