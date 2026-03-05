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

  function doCopy() {
    const el = document.createElement("textarea")
    el.value = text
    el.style.position = "fixed"
    el.style.left = "-9999px"
    el.style.opacity = "0"
    document.body.appendChild(el)
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    doCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
