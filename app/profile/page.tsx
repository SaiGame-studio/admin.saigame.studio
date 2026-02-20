"use client"

import { ProfileContent } from "@/components/profile-content"
import { useTranslation } from '@/lib/i18n/use-translation'

export default function ProfilePage() {
  const { t } = useTranslation()
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('profilePage.title')}</h1>
      <ProfileContent />
    </div>
  )
}
