"use client"

import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Server } from "lucide-react"

export default function LoginPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header with logo and theme toggle */}
      <header className="flex h-16 items-center justify-between px-6 border-b bg-background">
        <div className="flex items-center gap-2">
          <Server className="h-6 w-6" />
          <span className="font-semibold">Sai's Admin</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">{t('login.title')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>
          <LoginForm />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Sai's Admin. {t('login.footer')}</p>
      </footer>
    </div>
  )
}
