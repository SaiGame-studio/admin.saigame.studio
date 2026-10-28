"use client";
import { CircleDollarSign, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { SectionHeading } from "./section-heading";

const VALUE_ITEMS: {
    key: string;
    icon: LucideIcon;
}[] = [
    { key: "cost", icon: CircleDollarSign },
    { key: "speed", icon: Zap },
    { key: "safety", icon: ShieldCheck },
];

export function ValueSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-value" className="border-t py-16">
      <SectionHeading sectionId="why-sai-server-value" eyebrow={t("whySaiServer.value.eyebrow")} title={t("whySaiServer.value.title")} description={t("whySaiServer.value.description")}/>
      <div id="why-sai-server-value-list" className="mt-10 grid gap-4 md:grid-cols-3">
        {VALUE_ITEMS.map(({ key, icon: Icon }) => (<div id={`why-sai-server-value-${key}`} key={key} className="rounded-xl border bg-card p-6">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true"/>
            <h3 id={`why-sai-server-value-${key}-title`} className="mt-4 text-lg font-semibold">{t(`whySaiServer.value.items.${key}.title`)}</h3>
            <p id={`why-sai-server-value-${key}-desc`} className="mt-2 text-sm text-muted-foreground">{t(`whySaiServer.value.items.${key}.desc`)}</p>
          </div>))}
      </div>
    </section>);
}
