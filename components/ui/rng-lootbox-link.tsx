"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dices } from "lucide-react"
import { getRngLootboxTabUrl, isRngLootboxType } from "@/lib/utils/item-profile-utils"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface RngLootboxLinkProps {
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

export function RngLootboxLink({
  gameId,
  itemProfile,
  variant = "button",
  size = "sm",
  className = ""
}: RngLootboxLinkProps) {
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  if (!isRngLootboxType(itemProfile)) {
    return null
  }

  const url = getRngLootboxTabUrl(gameId, itemProfile.id)

  if (variant === "badge") {
    return (
      <Link href={url}>
        <Badge variant="secondary" className={`cursor-pointer hover:bg-secondary/80 ${className}`}>
          <Dices className="w-3 h-3 mr-1" />
          {t('rngLootbox.title')}
        </Badge>
      </Link>
    )
  }

  if (variant === "link") {
    return (
      <Link 
        href={url}
        className={`text-primary hover:text-primary/80 inline-flex items-center gap-1 ${className}`}
      >
        <Dices className="w-4 h-4" />
        {itemProfile.name ? `${itemProfile.name} RNG LootBox` : t('rngLootbox.title')}
      </Link>
    )
  }

  return (
    <Link href={url}>
      <Button variant="outline" size={size} className={className}>
        <Dices className="w-4 h-4 mr-2" />
        {t('rngLootbox.title')}
      </Button>
    </Link>
  )
}
