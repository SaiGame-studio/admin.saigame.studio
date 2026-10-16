"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { History, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getCmsContentVersion, listCmsContentVersions, rollbackCmsContent, type CmsContent, type CmsContentVersion, type CmsContentVersionSummary } from "@/lib/admin-api";
import { ContentVersionDetail, VERSION_TABS, type VersionTab } from "./ContentVersionDetail";

/** URL query keys: `history` = "open" or the selected version number; `tab` = detail tab. */
const HISTORY_PARAM = "history";
const TAB_PARAM = "tab";

interface ContentVersionHistoryProps {
    content: CmsContent;
    dirty: boolean;
    onRestored: () => Promise<void>;
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Version history panel for a CMS content item: list saved versions, view one, restore it. */
export function ContentVersionHistory({ content, dirty, onRestored }: ContentVersionHistoryProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const historyParam = searchParams.get(HISTORY_PARAM);
    const open = historyParam !== null;
    const selectedNumber = historyParam && /^\d+$/.test(historyParam) ? Number(historyParam) : null;
    const tabParam = searchParams.get(TAB_PARAM) as VersionTab | null;
    const tab: VersionTab = tabParam && VERSION_TABS.includes(tabParam) ? tabParam : "preview";

    const [versions, setVersions] = useState<CmsContentVersionSummary[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [selected, setSelected] = useState<CmsContentVersion | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const updateQuery = useCallback((history: string | null, nextTab: VersionTab | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (history === null)
            params.delete(HISTORY_PARAM);
        else
            params.set(HISTORY_PARAM, history);
        if (nextTab === null)
            params.delete(TAB_PARAM);
        else
            params.set(TAB_PARAM, nextTab);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    const loadVersions = useCallback(async () => {
        setListLoading(true);
        setListError(null);
        try {
            const result = await listCmsContentVersions(content.id);
            setVersions(result.data ?? []);
        }
        catch (err) {
            setListError(String(err));
        }
        finally {
            setListLoading(false);
        }
    }, [content.id]);

    useEffect(() => {
        if (open)
            loadVersions();
    }, [open, content.version_number, loadVersions]);

    useEffect(() => {
        if (!open || selectedNumber === null) {
            setSelected(null);
            return;
        }
        let cancelled = false;
        setDetailLoading(true);
        getCmsContentVersion(content.id, selectedNumber)
            .then((v) => { if (!cancelled) setSelected(v); })
            .catch((err) => {
                if (!cancelled) {
                    setSelected(null);
                    toast({ title: t("cmsVersions.loadVersionFailed"), description: String(err), variant: "destructive" });
                }
            })
            .finally(() => { if (!cancelled) setDetailLoading(false); });
        return () => { cancelled = true; };
    }, [open, selectedNumber, content.id, toast, t]);

    const handleRestore = async () => {
        if (!selected)
            return;
        setRestoring(true);
        try {
            const result = await rollbackCmsContent(content.id, selected.version_number);
            await onRestored();
            toast({ title: t("cmsVersions.restoredTitle"), description: t("cmsVersions.restoredDesc", { version: selected.version_number, newVersion: result.version_number }) });
            updateQuery(String(result.version_number), tab);
        }
        catch (err) {
            toast({ title: t("cmsVersions.restoreFailed"), description: String(err), variant: "destructive" });
        }
        finally {
            setRestoring(false);
            setConfirmOpen(false);
        }
    };

    const isCurrent = selected?.version_number === content.version_number;

    return (<>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button id="cms-version-history-open-btn" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => updateQuery("open", null)}>
              <History id="cms-version-history-open-icon" className="h-3.5 w-3.5"/>
              v{content.version_number}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p id="cms-version-history-open-tooltip">{t("cmsVersions.open")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Sheet open={open} onOpenChange={(next) => { if (!next) updateQuery(null, null); }}>
        <SheetContent id="cms-version-history-sheet" side="right" className="w-full sm:max-w-6xl flex flex-col gap-3">
          <SheetHeader id="cms-version-history-header">
            <SheetTitle id="cms-version-history-title">{t("cmsVersions.title")}</SheetTitle>
            <SheetDescription id="cms-version-history-description">{t("cmsVersions.description")}</SheetDescription>
          </SheetHeader>

          <div id="cms-version-history-body" className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
            {/* Version list */}
            <div id="cms-version-list-column" className="md:w-64 shrink-0 flex flex-col min-h-0">
              <div id="cms-version-list-toolbar" className="flex items-center justify-between mb-2">
                <span id="cms-version-list-count" className="text-xs text-muted-foreground">{t("cmsVersions.savedCount", { count: versions.length })}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button id="cms-version-list-refresh-btn" variant="ghost" size="icon" className="h-7 w-7" disabled={listLoading} onClick={loadVersions}>
                        <RefreshCw id="cms-version-list-refresh-icon" className={cn("h-3.5 w-3.5", listLoading && "animate-spin")}/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p id="cms-version-list-refresh-tooltip">{t("cmsVersions.refresh")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {listError && <p id="cms-version-list-error" className="text-xs text-destructive">{t("cmsVersions.loadFailed")}: {listError}</p>}
              {!listError && !listLoading && versions.length === 0 && <p id="cms-version-list-empty" className="text-xs text-muted-foreground">{t("cmsVersions.empty")}</p>}
              <ul id="cms-version-list" className="space-y-1 overflow-auto">
                {versions.map((v) => (<li key={v.version_number} id={`cms-version-list-item-${v.version_number}`}>
                    <button id={`cms-version-list-item-btn-${v.version_number}`} type="button" onClick={() => updateQuery(String(v.version_number), tab)} className={cn("w-full text-left rounded-md border px-3 py-2 text-xs hover:bg-accent transition-colors", selectedNumber === v.version_number && "border-primary bg-accent")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">v{v.version_number}</span>
                        {v.version_number === content.version_number && <Badge id={`cms-version-current-badge-${v.version_number}`} variant="secondary" className="text-[10px] px-1.5 py-0">{t("cmsVersions.current")}</Badge>}
                      </div>
                      <div className="text-muted-foreground mt-0.5">{formatDateTime(v.created_at)}</div>
                      <div className="truncate mt-0.5">{v.title}</div>
                    </button>
                  </li>))}
              </ul>
            </div>

            {/* Version detail */}
            <div id="cms-version-detail-column" className="flex-1 min-w-0 flex flex-col min-h-0 gap-2">
              {detailLoading && <div id="cms-version-detail-loading" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>{t("cmsVersions.loading")}</div>}
              {!detailLoading && !selected && <p id="cms-version-detail-empty" className="text-sm text-muted-foreground">{t("cmsVersions.selectVersion")}</p>}
              {!detailLoading && selected && (<>
                  <div id="cms-version-detail-toolbar" className="flex items-center justify-between gap-2 flex-wrap">
                    <div id="cms-version-detail-meta" className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground mr-2">v{selected.version_number}</span>
                      {t("cmsVersions.savedAt")}: {formatDateTime(selected.created_at)} · {t("cmsVersions.changedBy")}: <span className="font-mono">{selected.changed_by_id.slice(0, 8)}</span>
                    </div>
                    <Button id="cms-version-restore-btn" size="sm" variant="outline" className="gap-1.5" disabled={isCurrent || restoring} onClick={() => setConfirmOpen(true)}>
                      <RotateCcw id="cms-version-restore-icon" className="h-3.5 w-3.5"/>
                      {isCurrent ? t("cmsVersions.isCurrent") : t("cmsVersions.restore")}
                    </Button>
                  </div>
                  <ContentVersionDetail version={selected} current={content} tab={tab} onTabChange={(next) => updateQuery(String(selected.version_number), next)}/>
                </>)}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent id="cms-version-restore-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle id="cms-version-restore-dialog-title">{t("cmsVersions.restoreTitle", { version: selected?.version_number ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription id="cms-version-restore-dialog-description" asChild>
              <div className="space-y-2">
                <p>{t("cmsVersions.restoreDesc", { version: selected?.version_number ?? "" })}</p>
                {content.status === "published" && <p id="cms-version-restore-published-warning" className="font-medium">{t("cmsVersions.restorePublishedWarning")}</p>}
                {dirty && <p id="cms-version-restore-unsaved-warning" className="font-medium text-destructive">{t("cmsVersions.restoreUnsavedWarning")}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="cms-version-restore-cancel-btn" disabled={restoring}>{t("cmsVersions.cancel")}</AlertDialogCancel>
            <AlertDialogAction id="cms-version-restore-confirm-btn" disabled={restoring} onClick={(e) => { e.preventDefault(); handleRestore(); }}>
              {restoring && <Loader2 className="h-4 w-4 animate-spin mr-1"/>}
              {t("cmsVersions.restoreConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);
}
