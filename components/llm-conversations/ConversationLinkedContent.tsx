'use client'

import { Archive, BookOpen, Dices, Hammer, Link2, Loader2, PackagePlus, Shield, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ConversationContentLink } from '@/types/llm-conversation'

interface ConversationLinkedContentProps {
  gameId: string
  linkedContent: ConversationContentLink[]
  isLoadingLinkedContent: boolean
  unlinkingId: string | null
  loreEntryTitles: Record<string, string>
  itemDefinitionNames: Record<string, string>
  entityDefinitionNames: Record<string, string>
  containerDefinitionNames: Record<string, string>
  gachaPackNames: Record<string, string>
  craftingRecipeNames: Record<string, string>
  onUnlink: (linkId: string, contentType: string, contentId: string) => void
  t: (key: string) => string
}

export function ConversationLinkedContent({
  gameId,
  linkedContent,
  isLoadingLinkedContent,
  unlinkingId,
  loreEntryTitles,
  itemDefinitionNames,
  entityDefinitionNames,
  containerDefinitionNames,
  gachaPackNames,
  craftingRecipeNames,
  onUnlink,
  t,
}: ConversationLinkedContentProps) {
  const router = useRouter()

  const itemLinks = linkedContent.filter(l => l.content_type === 'item_definition')
  const entityLinks = linkedContent.filter(l => l.content_type === 'entity_definition')
  const loreLinks = linkedContent.filter(l => l.content_type === 'lore_entry' || l.content_type === 'lore')
  const containerLinks = linkedContent.filter(l => l.content_type === 'container_definition')
  const gachaPackLinks = linkedContent.filter(l => l.content_type === 'gacha_pack')
  const craftingRecipeLinks = linkedContent.filter(l => l.content_type === 'crafting_recipe')

  function renderBadge(link: ConversationContentLink, refNum: string) {
    const isItem = link.content_type === 'item_definition'
    const isEntity = link.content_type === 'entity_definition'
    const isContainer = link.content_type === 'container_definition'
    const isGachaPack = link.content_type === 'gacha_pack'
    const isCraftingRecipe = link.content_type === 'crafting_recipe'
    const href = isItem
      ? `/games/${gameId}/items/${link.content_id}`
      : isEntity
        ? `/games/${gameId}/entities?expanded=${link.content_id}`
      : isContainer
        ? `/games/${gameId}/items?tab=containers&q=${link.content_id}`
        : isGachaPack
          ? `/games/${gameId}/items?tab=gacha&q=${link.content_id}`
          : isCraftingRecipe
            ? `/games/${gameId}/items?tab=crafting&expanded=${link.content_id}`
            : `/games/${gameId}/lore?lore_id=${link.content_id}`
    const displayName = itemDefinitionNames[link.content_id]
      ?? entityDefinitionNames[link.content_id]
      ?? loreEntryTitles[link.content_id]
      ?? containerDefinitionNames[link.content_id]
      ?? gachaPackNames[link.content_id]
      ?? craftingRecipeNames[link.content_id]
      ?? (t(`llmConversation.contentType.${link.content_type}`) || link.content_type)
    const badgeClass = isItem
      ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
      : isEntity
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
      : isContainer
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        : isGachaPack
          ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
          : isCraftingRecipe
            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-500'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    const TypeIcon = isItem ? PackagePlus : isEntity ? Shield : isContainer ? Archive : isGachaPack ? Dices : isCraftingRecipe ? Hammer : BookOpen
    return (
      <span
        key={link.id}
        id={`conv-panel-linked-item-${link.id}`}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] min-w-0 overflow-hidden ${badgeClass}`}
        title={`${refNum} · ${displayName}`}
      >
        <span id={`conv-panel-linked-item-ref-${link.id}`} className="font-bold opacity-60 tabular-nums">
          {refNum}
        </span>
        <TypeIcon className="h-2.5 w-2.5 shrink-0" />
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
            : <X className="h-2.5 w-2.5" />}
        </button>
      </span>
    )
  }

  return (
    <div id="conv-panel-linked-content" className="shrink-0 border-t px-2 pt-1.5 pb-1">
      <div id="conv-panel-linked-content-header" className="flex items-center gap-1 mb-1">
        <Link2 className="h-3 w-3 text-muted-foreground" />
        <span id="conv-panel-linked-content-label" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {t('llmConversation.linkedContent')}
        </span>
        {isLoadingLinkedContent && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />}
      </div>
      <div id="conv-panel-linked-content-groups" className="flex flex-col gap-1.5">
        {itemLinks.length > 0 && (
          <div id="conv-panel-linked-content-items-group">
            <div id="conv-panel-linked-content-items-label" className="flex items-center gap-1 mb-0.5">
              <PackagePlus className="h-2.5 w-2.5 text-blue-400" />
              <span id="conv-panel-linked-content-items-heading" className="text-[9px] font-semibold text-blue-400/70 uppercase tracking-wider">
                {t('llmConversation.contentType.item_definition')}
              </span>
            </div>
            <div id="conv-panel-linked-content-items-list" className="grid grid-cols-3 gap-1">
              {itemLinks.map((link, idx) => renderBadge(link, `#${idx + 1}`))}
            </div>
          </div>
        )}
        {entityLinks.length > 0 && (
          <div id="conv-panel-linked-content-entity-defs-group">
            <div id="conv-panel-linked-content-entity-defs-label" className="flex items-center gap-1 mb-0.5">
              <Shield className="h-2.5 w-2.5 text-sky-400" />
              <span id="conv-panel-linked-content-entity-defs-heading" className="text-[9px] font-semibold text-sky-400/70 uppercase tracking-wider">
                {t('llmConversation.contentType.entity_definition')}
              </span>
            </div>
            <div id="conv-panel-linked-content-entity-defs-list" className="grid grid-cols-3 gap-1">
              {entityLinks.map((link, idx) => renderBadge(link, `#${itemLinks.length + idx + 1}`))}
            </div>
          </div>
        )}
        {loreLinks.length > 0 && (
          <div id="conv-panel-linked-content-lore-group">
            <div id="conv-panel-linked-content-lore-label" className="flex items-center gap-1 mb-0.5">
              <BookOpen className="h-2.5 w-2.5 text-amber-400" />
              <span id="conv-panel-linked-content-lore-heading" className="text-[9px] font-semibold text-amber-400/70 uppercase tracking-wider">
                {t('llmConversation.contentType.lore_entry')}
              </span>
            </div>
            <div id="conv-panel-linked-content-lore-list" className="grid grid-cols-3 gap-1">
              {loreLinks.map((link, idx) => renderBadge(link, `#${itemLinks.length + entityLinks.length + idx + 1}`))}
            </div>
          </div>
        )}
        {containerLinks.length > 0 && (
          <div id="conv-panel-linked-content-containers-group">
            <div id="conv-panel-linked-content-containers-label" className="flex items-center gap-1 mb-0.5">
              <Archive className="h-2.5 w-2.5 text-emerald-400" />
              <span id="conv-panel-linked-content-containers-heading" className="text-[9px] font-semibold text-emerald-400/70 uppercase tracking-wider">
                {t('llmConversation.contentType.container_definition')}
              </span>
            </div>
            <div id="conv-panel-linked-content-containers-list" className="grid grid-cols-3 gap-1">
              {containerLinks.map((link, idx) => renderBadge(link, `#${itemLinks.length + entityLinks.length + loreLinks.length + idx + 1}`))}
            </div>
          </div>
        )}
        {gachaPackLinks.length > 0 && (
          <div id="conv-panel-linked-content-gacha-packs-group">
            <div id="conv-panel-linked-content-gacha-packs-label" className="flex items-center gap-1 mb-0.5">
              <Dices className="h-2.5 w-2.5 text-violet-400" />
              <span id="conv-panel-linked-content-gacha-packs-heading" className="text-[9px] font-semibold text-violet-400/70 uppercase tracking-wider">
                {t('llmConversation.contentType.gacha_pack')}
              </span>
            </div>
            <div id="conv-panel-linked-content-gacha-packs-list" className="grid grid-cols-3 gap-1">
              {gachaPackLinks.map((link, idx) => renderBadge(link, `#${itemLinks.length + entityLinks.length + loreLinks.length + containerLinks.length + idx + 1}`))}
            </div>
          </div>
        )}
        {craftingRecipeLinks.length > 0 && (
          <div id="conv-panel-linked-content-crafting-recipes-group">
            <div id="conv-panel-linked-content-crafting-recipes-label" className="flex items-center gap-1 mb-0.5">
              <Hammer className="h-2.5 w-2.5 text-cyan-500" />
              <span id="conv-panel-linked-content-crafting-recipes-heading" className="text-[9px] font-semibold text-cyan-500/70 uppercase tracking-wider">
                {t('llmConversation.contentType.crafting_recipe')}
              </span>
            </div>
            <div id="conv-panel-linked-content-crafting-recipes-list" className="grid grid-cols-3 gap-1">
              {craftingRecipeLinks.map((link, idx) => renderBadge(link, `#${itemLinks.length + entityLinks.length + loreLinks.length + containerLinks.length + gachaPackLinks.length + idx + 1}`))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
