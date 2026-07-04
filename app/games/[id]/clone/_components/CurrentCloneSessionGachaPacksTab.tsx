"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { CloneSessionCurrentGachaPack } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionGachaPacksTabProps = {
    t: TranslationFn;
    gachaPacks: CloneSessionCurrentGachaPack[];
    sessionId?: string;
    gachaPacksTotal: number;
    gachaPacksOffset: number;
    gachaPacksSearchInput: string;
    gachaPacksSearchName: string;
    gachaPacksLoading: boolean;
    gachaPacksError: string | null;
    onGachaPacksSearchInputChange: (value: string) => void;
    onGachaPacksSearch: () => void;
    onGachaPacksClearSearch: () => void;
    onGachaPacksPreviousPage: () => void;
    onGachaPacksNextPage: () => void;
    onManualOverwriteSuccess: () => Promise<void>;
};

const GACHA_PACKS_PAGE_SIZE = 12;

function formatRange(start: number, end: number, total: number) {
    if (total <= 0) {
        return "0 / 0";
    }

    return `${start.toLocaleString("en-US")} - ${end.toLocaleString("en-US")}/${total.toLocaleString("en-US")}`;
}

function formatPage(currentPage: number, totalPages: number) {
    if (totalPages <= 0) {
        return "0/0";
    }

    return `${currentPage.toLocaleString("en-US")}/${totalPages.toLocaleString("en-US")}`;
}

function getEnabledBadgeVariant(isEnabled?: boolean) {
    return isEnabled ? "default" as const : "secondary" as const;
}

function isIgnored(value: { ignored?: boolean; is_ignored?: boolean }) {
    return Boolean(value.ignored ?? value.is_ignored);
}

function CurrentCloneSessionGachaPackList({
    gachaPacks,
    sessionId,
    t,
}: {
    gachaPacks: CloneSessionCurrentGachaPack[];
    sessionId?: string;
    t: TranslationFn;
}) {
    if (gachaPacks.length === 0) {
        return (
            <div id="clone-game-source-current-session-gacha-packs-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    return (
        <div id="clone-game-source-current-session-gacha-packs-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-gacha-packs-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-gacha-packs-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-gacha-packs-table-head-row">
                        <th id="clone-game-source-current-session-gacha-packs-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">{t("cloneGame.sourceGameCurrentSessionNameLabel")}</th>
                        <th id="clone-game-source-current-session-gacha-packs-table-code-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">{t("cloneGame.sourceGameCurrentSessionCodeLabel")}</th>
                        <th id="clone-game-source-current-session-gacha-packs-table-destination-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">{t("cloneGame.sourceGameCurrentSessionGachaPackDestinationLabel")}</th>
                        <th id="clone-game-source-current-session-gacha-packs-table-pool-head" className="h-9 px-3 text-right align-middle text-xs font-medium text-muted-foreground">{t("cloneGame.sourceGameCurrentSessionGachaPackPoolItemsLabel")}</th>
                        <th id="clone-game-source-current-session-gacha-packs-table-keys-head" className="h-9 px-3 text-right align-middle text-xs font-medium text-muted-foreground">{t("cloneGame.sourceGameCurrentSessionGachaPackKeyRequirementsLabel")}</th>
                        <th id="clone-game-source-current-session-gacha-packs-table-status-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">{t("cloneGame.sourceGameCurrentSessionGachaPackStatusLabel")}</th>
                        <th id="clone-game-source-current-session-gacha-packs-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">{t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}</th>
                        <th id="clone-game-source-current-session-gacha-packs-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">{t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}</th>
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-gacha-packs-table-body">
                    {gachaPacks.map((gachaPack) => (
                        <tr id={`clone-game-source-current-session-gacha-pack-row-${gachaPack.id}`} key={gachaPack.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td id={`clone-game-source-current-session-gacha-pack-name-cell-${gachaPack.id}`} className="px-3 py-2 align-middle">
                                <div id={`clone-game-source-current-session-gacha-pack-name-wrap-${gachaPack.id}`} className="space-y-0.5">
                                    <span id={`clone-game-source-current-session-gacha-pack-name-${gachaPack.id}`} className="font-medium">{gachaPack.name || t("common.unknown")}</span>
                                    <div id={`clone-game-source-current-session-gacha-pack-id-wrap-${gachaPack.id}`} className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                        <span id={`clone-game-source-current-session-gacha-pack-id-${gachaPack.id}`} className="truncate">{gachaPack.id}</span>
                                        <CopyButton id={`clone-game-source-current-session-gacha-pack-id-copy-btn-${gachaPack.id}`} iconId={`clone-game-source-current-session-gacha-pack-id-copy-icon-${gachaPack.id}`} text={gachaPack.id} size="h-3 w-3" className="ml-0" />
                                    </div>
                                </div>
                            </td>
                            <td id={`clone-game-source-current-session-gacha-pack-code-cell-${gachaPack.id}`} className="px-3 py-2 align-middle">
                                <div id={`clone-game-source-current-session-gacha-pack-code-wrap-${gachaPack.id}`} className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                    <span id={`clone-game-source-current-session-gacha-pack-code-${gachaPack.id}`} className="truncate">{gachaPack.code_name || t("common.unknown")}</span>
                                    {gachaPack.code_name ? <CopyButton id={`clone-game-source-current-session-gacha-pack-code-copy-btn-${gachaPack.id}`} iconId={`clone-game-source-current-session-gacha-pack-code-copy-icon-${gachaPack.id}`} text={gachaPack.code_name} size="h-3 w-3" className="ml-0" /> : null}
                                </div>
                            </td>
                            <td id={`clone-game-source-current-session-gacha-pack-destination-cell-${gachaPack.id}`} className="px-3 py-2 align-middle">
                                <Badge id={`clone-game-source-current-session-gacha-pack-destination-${gachaPack.id}`} variant="outline">{gachaPack.collect_destination || t("common.unknown")}</Badge>
                            </td>
                            <td id={`clone-game-source-current-session-gacha-pack-pool-cell-${gachaPack.id}`} className="px-3 py-2 text-right align-middle tabular-nums">
                                <span id={`clone-game-source-current-session-gacha-pack-pool-${gachaPack.id}`}>{(gachaPack.item_pool ?? []).length.toLocaleString("en-US")}</span>
                            </td>
                            <td id={`clone-game-source-current-session-gacha-pack-keys-cell-${gachaPack.id}`} className="px-3 py-2 text-right align-middle tabular-nums">
                                <span id={`clone-game-source-current-session-gacha-pack-keys-${gachaPack.id}`}>{(gachaPack.key_requirements ?? []).length.toLocaleString("en-US")}</span>
                            </td>
                            <td id={`clone-game-source-current-session-gacha-pack-status-cell-${gachaPack.id}`} className="px-3 py-2 align-middle">
                                <Badge id={`clone-game-source-current-session-gacha-pack-status-${gachaPack.id}`} variant={getEnabledBadgeVariant(gachaPack.is_enabled)}>{gachaPack.is_enabled ? t("common.active") : t("common.inactive")}</Badge>
                            </td>
                            <td id={`clone-game-source-current-session-gacha-pack-previously-cloned-cell-${gachaPack.id}`} className="px-3 py-2 align-middle">
                                <CloneSessionPreviouslyClonedStatus id={`clone-game-source-current-session-gacha-pack-previously-cloned-${gachaPack.id}`} iconId={`clone-game-source-current-session-gacha-pack-previously-cloned-icon-${gachaPack.id}`} labelId={`clone-game-source-current-session-gacha-pack-previously-cloned-label-${gachaPack.id}`} previouslyCloned={gachaPack.previously_cloned} t={t} />
                            </td>
                            <td id={`clone-game-source-current-session-gacha-pack-ignore-cell-${gachaPack.id}`} className="px-3 py-2 align-middle">
                                <CloneSessionIgnoreSwitch
                                    id={`clone-game-source-current-session-gacha-pack-ignore-${gachaPack.id}`}
                                    sessionId={sessionId}
                                    contentType="gacha_pack"
                                    sourceId={gachaPack.id}
                                    initialIgnored={isIgnored(gachaPack)}
                                    t={t}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function CurrentCloneSessionGachaPacksTab({
    t, gachaPacks, sessionId, gachaPacksTotal, gachaPacksOffset, gachaPacksSearchInput, gachaPacksSearchName, gachaPacksLoading, gachaPacksError,
    onGachaPacksSearchInputChange, onGachaPacksSearch, onGachaPacksClearSearch, onGachaPacksPreviousPage, onGachaPacksNextPage, onManualOverwriteSuccess,
}: CurrentCloneSessionGachaPacksTabProps) {
    const currentPage = gachaPacksTotal > 0 ? Math.floor(gachaPacksOffset / GACHA_PACKS_PAGE_SIZE) + 1 : 0;
    const totalPages = gachaPacksTotal > 0 ? Math.ceil(gachaPacksTotal / GACHA_PACKS_PAGE_SIZE) : 0;
    const start = gachaPacksTotal > 0 ? gachaPacksOffset + 1 : 0;
    const end = gachaPacksTotal > 0 ? Math.min(gachaPacksOffset + GACHA_PACKS_PAGE_SIZE, gachaPacksTotal) : 0;
    const hasPreviousPage = gachaPacksOffset > 0;
    const hasNextPage = gachaPacksOffset + GACHA_PACKS_PAGE_SIZE < gachaPacksTotal;

    return (
        <div id="clone-game-source-current-session-gacha-packs-section" className="space-y-3">
            <div id="clone-game-source-current-session-gacha-packs-controls" className="space-y-2">
                <div id="clone-game-source-current-session-gacha-packs-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-gacha-packs-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-gacha-packs-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-gacha-packs-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input id="clone-game-source-current-session-gacha-packs-search-input" value={gachaPacksSearchInput} onChange={(event) => onGachaPacksSearchInputChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onGachaPacksSearch(); } }} placeholder={t("cloneGame.sourceGameCurrentSessionGachaPackSearchPlaceholder")} className="h-8 pl-8 pr-20 text-xs" autoComplete="off" />
                            {gachaPacksSearchInput || gachaPacksSearchName ? (
                                <Button id="clone-game-source-current-session-gacha-packs-clear-search-inline-btn" type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5" onClick={onGachaPacksClearSearch}>
                                    <X id="clone-game-source-current-session-gacha-packs-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button id="clone-game-source-current-session-gacha-packs-search-btn" type="button" onClick={onGachaPacksSearch} disabled={gachaPacksLoading} size="sm" className="h-8 px-2.5 text-xs">{t("common.search")}</Button>
                    <div id="clone-game-source-current-session-gacha-packs-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-gacha-packs-pagination-actions" className="flex items-center gap-1">
                            <Button id="clone-game-source-current-session-gacha-packs-pagination-prev" type="button" variant="outline" size="sm" onClick={onGachaPacksPreviousPage} disabled={!hasPreviousPage || gachaPacksLoading} className="h-7 w-7 p-0">
                                <ChevronLeft id="clone-game-source-current-session-gacha-packs-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-gacha-packs-pagination-prev-label" className="sr-only">{t("common.previous")}</span>
                            </Button>
                            <p id="clone-game-source-current-session-gacha-packs-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">{formatPage(currentPage, totalPages)}</p>
                            <Button id="clone-game-source-current-session-gacha-packs-pagination-next" type="button" variant="outline" size="sm" onClick={onGachaPacksNextPage} disabled={!hasNextPage || gachaPacksLoading} className="h-7 w-7 p-0">
                                <ChevronRight id="clone-game-source-current-session-gacha-packs-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-gacha-packs-pagination-next-label" className="sr-only">{t("common.next")}</span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-gacha-packs-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">{formatRange(start, end, gachaPacksTotal)}</p>
                        <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-gacha-packs-refresh-btn" iconId="clone-game-source-current-session-gacha-packs-refresh-icon" loading={gachaPacksLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                    </div>
                </div>
            </div>

            {gachaPacksLoading ? (
                <div id="clone-game-source-current-session-gacha-packs-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-gacha-packs-loading-header" className="grid min-w-[980px] grid-cols-[1.5fr_1.2fr_0.9fr_0.7fr_0.7fr_0.8fr_0.7fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 8 }).map((_, index) => <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-head-${index}`} key={`clone-game-source-current-session-gacha-pack-skeleton-head-${index}`} className="h-4 w-20" />)}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-gacha-pack-skeleton-row-${index}`} key={`clone-game-source-current-session-gacha-pack-skeleton-row-${index}`} className="grid min-w-[980px] grid-cols-[1.5fr_1.2fr_0.9fr_0.7fr_0.7fr_0.8fr_0.7fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-name-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-code-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-destination-${index}`} className="h-4 w-16" />
                            <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-pool-${index}`} className="ml-auto h-4 w-10" />
                            <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-keys-${index}`} className="ml-auto h-4 w-10" />
                            <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-status-${index}`} className="h-4 w-14" />
                            <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-gacha-pack-skeleton-ignore-${index}`} className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            ) : gachaPacksError ? (
                <div id="clone-game-source-current-session-gacha-packs-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{gachaPacksError}</div>
            ) : (
                <CurrentCloneSessionGachaPackList gachaPacks={gachaPacks} sessionId={sessionId} t={t} />
            )}
        </div>
    );
}
