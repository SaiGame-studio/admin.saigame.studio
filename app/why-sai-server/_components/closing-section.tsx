"use client";
import { Handshake } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Final sign-off line at the very bottom of the landing page. */
export function ClosingSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-closing" className="why-sai-server-closing pt-16 text-center">
      <Handshake id="why-sai-server-closing-icon" className="why-sai-server-closing-icon mx-auto h-8 w-8 text-primary" aria-hidden="true"/>
      <p id="why-sai-server-closing-message" className="why-sai-server-closing-message mx-auto mt-4 max-w-3xl text-2xl font-bold tracking-tight md:text-3xl">
        {t("whySaiServer.closing.message")}
      </p>
    </section>);
}
