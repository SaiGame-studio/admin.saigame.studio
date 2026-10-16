"use client";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { CmsContent, CmsContentVersion } from "@/lib/admin-api";
import { diffLines } from "./line-diff";
import { preprocessImgSize } from "./preprocess-img-size";

export const VERSION_TABS = ["preview", "markdown", "changes"] as const;
export type VersionTab = (typeof VERSION_TABS)[number];

interface ContentVersionDetailProps {
    version: CmsContentVersion;
    current: CmsContent;
    tab: VersionTab;
    onTabChange: (tab: VersionTab) => void;
}

/** Shows one saved version as rendered preview, raw markdown, or a diff against the current content. */
export function ContentVersionDetail({ version, current, tab, onTabChange }: ContentVersionDetailProps) {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const bodyDiff = useMemo(() => diffLines(current.body || "", version.body || ""), [current.body, version.body]);
    const fieldChanges = [
        { key: "title", label: t("cmsVersions.fieldTitle"), from: current.title, to: version.title },
        { key: "slug", label: t("cmsVersions.fieldSlug"), from: current.slug, to: version.slug },
        { key: "description", label: t("cmsVersions.fieldDescription"), from: current.description, to: version.description },
    ].filter((f) => (f.from || "") !== (f.to || ""));
    const added = bodyDiff?.filter((l) => l.kind === "added").length ?? 0;
    const removed = bodyDiff?.filter((l) => l.kind === "removed").length ?? 0;

    return (<Tabs id="cms-version-detail-tabs" value={tab} onValueChange={(v) => onTabChange(v as VersionTab)} className="flex flex-col min-h-0 flex-1">
      <TabsList id="cms-version-detail-tab-list" className="self-start">
        <TabsTrigger id="cms-version-tab-preview" value="preview" className="text-xs">{t("cmsVersions.tabPreview")}</TabsTrigger>
        <TabsTrigger id="cms-version-tab-markdown" value="markdown" className="text-xs">{t("cmsVersions.tabMarkdown")}</TabsTrigger>
        <TabsTrigger id="cms-version-tab-changes" value="changes" className="text-xs">{t("cmsVersions.tabChanges")}</TabsTrigger>
      </TabsList>

      <TabsContent id="cms-version-preview-panel" value="preview" className="flex-1 min-h-0 overflow-auto rounded-md border p-4">
        <h2 id="cms-version-preview-title" className="text-xl font-semibold mb-1">{version.title}</h2>
        {version.description && <p id="cms-version-preview-description" className="text-sm text-muted-foreground mb-4">{version.description}</p>}
        <div id="cms-version-preview-body" className={cn("prose prose-sm max-w-none", resolvedTheme?.includes("dark") && "prose-invert")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{preprocessImgSize(version.body || "")}</ReactMarkdown>
        </div>
      </TabsContent>

      <TabsContent id="cms-version-markdown-panel" value="markdown" className="flex-1 min-h-0 overflow-auto rounded-md border">
        <pre id="cms-version-markdown-body" className="p-4 text-xs font-mono whitespace-pre-wrap break-words">{version.body}</pre>
      </TabsContent>

      <TabsContent id="cms-version-changes-panel" value="changes" className="flex-1 min-h-0 overflow-auto rounded-md border">
        <p id="cms-version-changes-hint" className="px-4 pt-3 text-xs text-muted-foreground">
          {t("cmsVersions.changesHint", { version: version.version_number, current: current.version_number })}
        </p>
        {fieldChanges.length > 0 && (<div id="cms-version-field-changes" className="px-4 pt-3 space-y-1 text-xs">
            {fieldChanges.map((f) => (<div key={f.key} id={`cms-version-field-change-${f.key}`} className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">{f.label}</span>
                <span>
                  <span className="line-through text-red-600 dark:text-red-400 mr-2">{f.from || "—"}</span>
                  <span className="text-green-700 dark:text-green-400">{f.to || "—"}</span>
                </span>
              </div>))}
          </div>)}
        {bodyDiff === null ? (<p id="cms-version-diff-too-large" className="p-4 text-sm text-muted-foreground">{t("cmsVersions.diffTooLarge")}</p>) : added + removed === 0 ? (<p id="cms-version-diff-identical" className="p-4 text-sm text-muted-foreground">{t("cmsVersions.noChanges")}</p>) : (<>
            <p id="cms-version-diff-stats" className="px-4 pt-3 text-xs">
              <span className="text-green-700 dark:text-green-400 mr-3">{t("cmsVersions.addedLines", { count: added })}</span>
              <span className="text-red-600 dark:text-red-400">{t("cmsVersions.removedLines", { count: removed })}</span>
            </p>
            <pre id="cms-version-diff-body" className="p-4 text-xs font-mono whitespace-pre-wrap break-words">
              {bodyDiff.map((line, i) => (<div key={i} id={`cms-version-diff-line-${i}`} className={cn("px-2", line.kind === "added" && "bg-green-500/15 text-green-800 dark:text-green-300", line.kind === "removed" && "bg-red-500/15 text-red-800 dark:text-red-300")}>
                  {line.kind === "added" ? "+ " : line.kind === "removed" ? "- " : "  "}{line.text}
                </div>))}
            </pre>
          </>)}
      </TabsContent>
    </Tabs>);
}
