"use client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { SectionHeading } from "./section-heading";
import { ZoomableImage } from "./zoomable-image";

const STEPS = ["studio", "unity", "configure"];
// Unity Editor: SaiServer component in the Inspector, connected and logging in (Console on the right).
const INTEGRATION_IMAGE = { src: "/why-sai-server/Integration.jpg", width: 1026, height: 959 };

export function IntegrationSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-integration" className="border-t py-16">
      <SectionHeading sectionId="why-sai-server-integration" eyebrow={t("whySaiServer.integration.eyebrow")} title={t("whySaiServer.integration.title")}/>
      <div id="why-sai-server-integration-body" className="why-sai-server-integration-body mt-10 grid items-start gap-10 lg:grid-cols-2">
        <ol id="why-sai-server-integration-steps" className="why-sai-server-integration-steps space-y-8">
          {STEPS.map((step, index) => (<li id={`why-sai-server-integration-step-${step}`} key={step} className={`why-sai-server-integration-step border-l-2 pl-5 ${index === 0 ? "border-primary" : "border-border"}`}>
              <span className="font-mono text-sm text-primary">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-lg font-semibold">{t(`whySaiServer.integration.steps.${step}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`whySaiServer.integration.steps.${step}.desc`)}</p>
            </li>))}
        </ol>
        <ZoomableImage id="why-sai-server-integration-screenshot" {...INTEGRATION_IMAGE} alt={t("whySaiServer.integration.screenshotAlt")} caption={t("whySaiServer.integration.screenshotCaption")} zoomLabel={t("whySaiServer.integration.screenshotZoom")}/>
      </div>
    </section>);
}
