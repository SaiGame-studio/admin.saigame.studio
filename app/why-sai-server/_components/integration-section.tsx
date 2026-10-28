"use client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { SectionHeading } from "./section-heading";

const STEPS = ["studio", "unity", "configure"];

export function IntegrationSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-integration" className="border-t py-16">
      <SectionHeading sectionId="why-sai-server-integration" eyebrow={t("whySaiServer.integration.eyebrow")} title={t("whySaiServer.integration.title")}/>
      <ol id="why-sai-server-integration-steps" className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => (<li id={`why-sai-server-integration-step-${step}`} key={step} className={`border-t-2 pt-5 ${index === 0 ? "border-primary" : "border-border"}`}>
            <span className="font-mono text-sm text-primary">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-2 text-lg font-semibold">{t(`whySaiServer.integration.steps.${step}.title`)}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t(`whySaiServer.integration.steps.${step}.desc`)}</p>
          </li>))}
      </ol>
    </section>);
}
