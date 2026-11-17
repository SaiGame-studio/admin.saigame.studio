"use client";
import Link from "next/link";
import { ArrowUpRight, BookOpen, BookOpenText, Download, FileJson2, type LucideIcon } from "lucide-react";
import { PostmanIcon } from "@/components/icons/postman-icon";
import { UnityIcon } from "@/components/icons/unity-icon";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { API_DOCS_URL, POSTMAN_COLLECTION_URL, UNITY_SDK_IMPORT_GUIDE_PATH, UNITY_SDK_RELEASES_URL } from "@/lib/sdk-links";

const QUICK_START_STEPS = ["stepDownload", "stepImport", "stepPrefab"] as const;
const FOCUS_RING = "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The download itself: what the SDK is, the release link, and the three steps from the import guide. */
function UnityPackageSection() {
    const { t } = useTranslation();
    return (<section id="download-sdk-unity-package" aria-labelledby="download-sdk-unity-package-title" className="rounded-xl border bg-card text-card-foreground">
      <div id="download-sdk-unity-package-body" className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div id="download-sdk-unity-package-intro" className="flex flex-col">
          <div id="download-sdk-unity-package-icon" className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UnityIcon className="h-6 w-6" aria-hidden="true"/>
          </div>
          <h2 id="download-sdk-unity-package-title" className="mt-5 text-xl font-semibold sm:text-2xl">{t("downloadSdk.unityPackageTitle")}</h2>
          <p id="download-sdk-unity-package-description" className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">{t("downloadSdk.unityPackageDescription")}</p>
          <p id="download-sdk-unity-package-requirement" className="mt-3 text-sm text-foreground">{t("downloadSdk.unityPackageRequirement")}</p>
          <div id="download-sdk-unity-package-actions" className="mt-6 flex flex-col items-start gap-3 lg:mt-auto lg:pt-6">
            <Link id="download-sdk-unity-package-guide-link" href={UNITY_SDK_IMPORT_GUIDE_PATH} className={`inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline ${FOCUS_RING}`}>
              <BookOpen className="h-4 w-4" aria-hidden="true"/>
              {t("downloadSdk.unityPackageGuide")}
            </Link>
            <Button id="download-sdk-unity-package-link" size="lg" asChild>
              <a href={UNITY_SDK_RELEASES_URL}>
                <Download aria-hidden="true"/>
                {t("downloadSdk.unityPackageAction")}
              </a>
            </Button>
          </div>
        </div>
        <div id="download-sdk-quick-start" className="border-t pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <h3 id="download-sdk-quick-start-title" className="text-sm font-semibold">{t("downloadSdk.quickStartTitle")}</h3>
          <ol id="download-sdk-quick-start-steps" className="mt-5 space-y-5">
            {QUICK_START_STEPS.map((step, index) => (<li key={step} id={`download-sdk-quick-start-step-${index + 1}`} className="flex gap-4">
                <span id={`download-sdk-quick-start-step-${index + 1}-number`} aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <p id={`download-sdk-quick-start-step-${index + 1}-text`} className="min-w-0 break-words pt-0.5 text-sm leading-relaxed">{t(`downloadSdk.${step}`)}</p>
              </li>))}
          </ol>
        </div>
      </div>
    </section>);
}

/** badge: what the Postman resource is (documentation or collection files), drawn over the Postman logo */
type Reference = { id: string; badge: LucideIcon; title: string; description: string; action: string; href: string };

/** One reference row: icon, what it is, and where it opens. */
function ReferenceRow({ reference }: { reference: Reference }) {
    const { id, badge: Badge } = reference;
    return (<li id={`download-sdk-${id}`} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:gap-6">
      <div id={`download-sdk-${id}-icon`} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        <PostmanIcon className="h-6 w-6" aria-hidden="true"/>
        <span id={`download-sdk-${id}-icon-badge`} className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-foreground">
          <Badge className="h-3.5 w-3.5" aria-hidden="true"/>
        </span>
      </div>
      <div id={`download-sdk-${id}-text`} className="min-w-0 flex-1">
        <h3 id={`download-sdk-${id}-title`} className="font-medium">{reference.title}</h3>
        <p id={`download-sdk-${id}-description`} className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{reference.description}</p>
      </div>
      <Button id={`download-sdk-${id}-link`} variant="outline" className="shrink-0 self-start sm:self-center" asChild>
        <a href={reference.href}>
          {reference.action}
          <ArrowUpRight aria-hidden="true"/>
        </a>
      </Button>
    </li>);
}

/** /download-sdk: the Unity Package download, then the API references. */
export function DownloadSdkContent() {
    const { t } = useTranslation();
    const references: Reference[] = [
        {
            id: "api-docs",
            badge: BookOpenText,
            title: t("downloadSdk.apiDocsTitle"),
            description: t("downloadSdk.apiDocsDescription"),
            action: t("downloadSdk.apiDocsAction"),
            href: API_DOCS_URL,
        },
        {
            id: "postman",
            badge: FileJson2,
            title: t("downloadSdk.postmanTitle"),
            description: t("downloadSdk.postmanDescription"),
            action: t("downloadSdk.postmanAction"),
            href: POSTMAN_COLLECTION_URL,
        },
    ];
    return (<div id="download-sdk-page" className="container mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
      <div id="download-sdk-heading" className="mb-6 flex items-center gap-3 sm:mb-8">
        <Download id="download-sdk-heading-icon" className="h-6 w-6 shrink-0 text-primary" aria-hidden="true"/>
        <div id="download-sdk-heading-text" className="min-w-0">
          <h1 id="download-sdk-title" className="text-xl font-bold sm:text-2xl">{t("downloadSdk.title")}</h1>
          <p id="download-sdk-subtitle" className="text-sm text-muted-foreground">{t("downloadSdk.subtitle")}</p>
        </div>
      </div>
      <UnityPackageSection/>
      <section id="download-sdk-references" aria-labelledby="download-sdk-references-title" className="mt-12">
        <h2 id="download-sdk-references-title" className="text-lg font-semibold">{t("downloadSdk.referenceTitle")}</h2>
        <ul id="download-sdk-references-list" className="mt-2 divide-y border-y">
          {references.map((reference) => (<ReferenceRow key={reference.id} reference={reference}/>))}
        </ul>
      </section>
    </div>);
}
