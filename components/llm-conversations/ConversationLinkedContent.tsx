'use client'

import { Link2, Loader2, PackagePlus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ConversationContentLink } from '@/types/llm-conversation'

interface ConversationLinkedContentProps {
  gameId: string
  linkedContent: ConversationContentLink[]
  isLoadingLinkedContent: boolean
  unlinkingId: string | null
  loreEntryTitles: Record<string, string>
  onUnlink: (linkId: string, contentType: string, contentId: string) => void
  t: (key: string) => string
}

export function ConversationLinkedContent({
  gameId,
  linkedContent,
  isLoadingLinkedContent,
  unlinkingId,
  loreEntryTitles,
  onUnlink,
  t,
}: ConversationLinkedContentProps) {
  const router = useRouter()

  return (
    <div id="conv-panel-linked-content" className="shrink-0 border-t px-2 pt-1.5 pb-1">
      <div id="conv-panel-linked-content-header" className="flex items-center gap-1 mb-1">
        <Link2 className="h-3 w-3 text-muted-foreground" />
        <span id="conv-panel-linked-content-label" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {t('llmConversation.linkedContent')}
        </span>
        {isLoadingLinkedContent && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />}
      </div>
      <div id="conv-panel-linked-content-list" className="grid grid-cols-3 gap-1">
        {linkedContent.map((link, idx) => {
          const refNum = `#${idx + 1}`
          const href = `/games/${gameId}/lore?lore_id=${link.content_id}`
          const displayName = loreEntryTitles[link.content_id]
            ?? (t(`llmConversation.contentType.${link.content_type}`) || link.content_type)
          return (
            <span
              key={link.id}
              id={`conv-panel-linked-item-${link.id}`}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground min-w-0 overflow-hidden"
              title={`${refNum} · ${displayName}`}
            >
              <span id={`conv-panel-linked-item-ref-${link.id}`} className="font-bold text-foreground/60 tabular-nums">
                {refNum}
              </span>
              <PackagePlus className="h-2.5 w-2.5 shrink-0" />
              <button
                id={`conv-panel-linked-item-name-${link.id}`}
                type="button"
                className="font-medium hover:underline hover:text-foreground transition-colors truncate flex-1 min-w-0 text-left"
                onClick={(e) => { e.stopPropagation(); router.push(href) }}
              >
                <span id={`conv-panel-linked-item-type-${link.id}`} className="truncate block">
                  {displayName}
                </span>
              </button>
              <button
                id={`conv-panel-linked-item-unlink-${link.id}`}
                type="button"
                className="opacity-50 hover:opacity-100 hover:text-destructive transition-opacity shrink-0"
                disabled={unlinkingId === link.id}
                onClick={(e) => { e.stopPropagation(); onUnlink(link.id, link.content_type, link.content_id) }}
              >
                {unlinkingId === link.id
                  ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  : <Trash2 className="h-2.5 w-2.5" />}
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}
