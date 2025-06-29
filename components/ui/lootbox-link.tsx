"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock } from "lucide-react"
import { getLootboxTabUrl, isLootboxType } from "@/lib/utils/item-profile-utils"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface LootboxLinkProps {
  gameId: string
  itemProfile: {
    id: string
    type: string
    name?: string
  }
  variant?: "button" | "badge" | "link"
  size?: "sm" | "default" | "lg"
  className?: string
}

export function LootboxLink({ 
  gameId, 
  itemProfile, 
  variant = "button", 
  size = "sm",
  className = "" 
}: LootboxLinkProps) {
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  if (!isLootboxType(itemProfile)) {
    return null
  }

  const url = getLootboxTabUrl(gameId, itemProfile.id)
  const text = t('lootbox.title')

  switch (variant) {
    case "badge":
      return (
        <Link href={url} className={`inline-flex items-center gap-1 ${className}`}>
          <Badge variant="secondary" className="inline-flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {text}
          </Badge>
        </Link>
      )
    
    case "link":
      return (
        <Link 
          href={url} 
          className={`inline-flex items-center gap-1 text-primary hover:underline ${className}`}
        >
          <Lock className="w-4 h-4" />
          {text}
        </Link>
      )
    
    case "button":
    default:
      return (
        <Button asChild variant="secondary" size={size} className={className}>
          <Link href={url} className="inline-flex items-center gap-1">
            <Lock className="w-4 h-4" />
            {text}
          </Link>
        </Button>
      )
  }
} 