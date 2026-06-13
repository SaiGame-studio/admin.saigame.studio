"use client";
import { CheckCircle2, Gamepad2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { LanguageSelector } from "@/components/ui/language-selector";
export default function GoogleLoginSuccessPage() {
    const { t } = useTranslation();
    return (<div className="min-h-screen flex flex-col items-center bg-background text-foreground p-6 pt-24">
      <div className="absolute top-4 right-4">
        <LanguageSelector compact/>
      </div>

      <div className="flex flex-col items-center max-w-md w-full text-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-500"/>
          </div>
          <span className="absolute -top-1 -right-1 text-xs font-bold bg-green-500 text-white rounded-full px-2 h-7 flex items-center justify-center shadow">
            {t("googleLoginSuccess.badge")}
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("googleLoginSuccess.title")}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("googleLoginSuccess.subtitle")}
          </p>
        </div>

        <div className="w-full rounded-lg border border-border bg-muted/40 p-4 flex items-start gap-3 text-left">
          <Gamepad2 className="w-5 h-5 text-primary shrink-0 mt-0.5"/>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t("googleLoginSuccess.returnToGameTitle")}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("googleLoginSuccess.returnToGameDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>);
}
