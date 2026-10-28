"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "@/lib/i18n/use-translation";

const DISCORD_URL = "https://discord.gg/UU3YarmVde";

export function ContactSection() {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    return (<section id="why-sai-server-contact" className="rounded-2xl border bg-card px-6 py-14 text-center md:px-12">
      <h2 id="why-sai-server-contact-title" className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight md:text-5xl">{t("whySaiServer.cta.title")}</h2>
      <p id="why-sai-server-contact-description" className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">{t("whySaiServer.cta.description")}</p>
      <div id="why-sai-server-contact-actions" className="mt-8 flex flex-wrap justify-center gap-3">
        <Button id="why-sai-server-contact-discord-button" size="lg" asChild>
          <a href={DISCORD_URL}>{t("whySaiServer.cta.discord")}</a>
        </Button>
        <Button id="why-sai-server-contact-studio-button" size="lg" variant="outline" asChild>
          <Link href={isAuthenticated ? "/studios" : "/register"}>{t("whySaiServer.cta.createStudio")}</Link>
        </Button>
        <Button id="why-sai-server-contact-tutorials-button" size="lg" variant="ghost" asChild>
          <Link href="/tutorials">{t("whySaiServer.cta.tutorials")}</Link>
        </Button>
      </div>
    </section>);
}
