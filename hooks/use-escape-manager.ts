'use client'

import { useEffect, useRef } from 'react'

type EscapeHandler = () => void

interface EscapeEntry {
  readonly id: symbol
  handler: EscapeHandler
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level singleton stack — one global instance for the entire app.
// Components push when they open and pop when they close.
// Only the topmost entry receives each Escape press.
// ─────────────────────────────────────────────────────────────────────────────
const _stack: EscapeEntry[] = []
let _initialized = false

function _ensureGlobalListener(): void {
  if (_initialized || typeof window === 'undefined') return
  _initialized = true

  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || _stack.length === 0) return

      // Capture phase + stopImmediatePropagation: no other listener (Radix, etc.)
      // will see this event. Our manager owns all Escape handling when the stack
      // has entries. Radix dialogs / sheets close via controlled `open` props.
      e.stopImmediatePropagation()

      _stack[_stack.length - 1].handler()
    },
    true // capture phase — runs before every bubble-phase listener
  )
}

/**
 * Register this component as an Escape-closeable layer.
 *
 * When `isOpen` is true this layer is pushed onto the global stack.
 * Pressing Escape fires only the topmost layer's `onClose` — no other
 * layers or third-party handlers (Radix, etc.) receive the event.
 *
 * Usage:
 *   useEscapeLayer(isOpen, () => setIsOpen(false))
 */
export function useEscapeLayer(isOpen: boolean, onClose: () => void): void {
  // Keep the handler ref always current so we never need to re-register
  // when `onClose` identity changes between renders.
  const onCloseRef = useRef<EscapeHandler>(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return

    _ensureGlobalListener()

    const id = Symbol('escape-layer')
    const entry: EscapeEntry = { id, handler: () => onCloseRef.current() }
    _stack.push(entry)

    return () => {
      const idx = _stack.findIndex((e) => e.id === id)
      if (idx !== -1) _stack.splice(idx, 1)
    }
  }, [isOpen])
}
