"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ReceiptText } from "lucide-react"
import { useCapabilities } from "@/hooks/use-capabilities"
import { useTranslation } from "@/lib/i18n/use-translation"

export default function AdminTransactionsPage() {
  const router = useRouter()
  const capabilities = useCapabilities()
  const { t } = useTranslation()

  useEffect(() => {
    if (!capabilities.is_super_admin) router.push("/")
  }, [capabilities, router])

  if (!capabilities.is_super_admin) return null

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-8">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{t('adminGiftCodes.tabTransactions')}</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <ReceiptText className="h-14 w-14 text-muted-foreground/40" />
          <div>
            <h2 className="text-lg font-semibold">{t('adminGiftCodes.comingSoon')}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {t('adminGiftCodes.comingSoonDesc')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
