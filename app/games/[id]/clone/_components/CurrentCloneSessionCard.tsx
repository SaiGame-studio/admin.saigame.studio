"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/use-translation";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
    getCurrentCloneSessionItemContainers,
    getCurrentCloneSessionItems,
    getCurrentCloneSessionItemTags,
    runCloneSession,
    type CloneSessionConflict,
    type CloneSessionCurrentItemContainer,
    type CloneSessionCurrentItemDefinition,
    type CloneSessionCurrentItemTag,
    type CloneSessionSnapshot,
} from "@/lib/game-api";
import { CurrentCloneSessionProgressTabs } from "./CurrentCloneSessionProgressTabs";
import { useCurrentCloneSessionDefinitions } from "./useCurrentCloneSessionDefinitions";

type TranslationFn = (key: string) => string;

const ITEMS_PAGE_SIZE = 12;

type CurrentCloneSessionCardProps = {
    targetGameId: string;
    currentSession: CloneSessionSnapshot | null;
    currentSessionLoading: boolean;
    currentSessionError: string | null;
    deletingCurrentSession: boolean;
    onRetry: () => void;
    onDelete: () => void;
};

function formatTechnicalLabel(value?: string) {
    if (!value) {
        return "";
    }

    return value
        .split(/[_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function getCloneSessionStatusStyle(status?: string) {
    if (status === "running") {
        return {
            pill: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
            dot: "bg-sky-500",
        };
    }

    if (status === "created") {
        return {
            pill: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            dot: "bg-amber-500",
        };
    }

    if (status === "blocked" || status === "failed") {
        return {
            pill: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
            dot: "bg-red-500",
        };
    }

    if (status === "completed") {
        return {
            pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            dot: "bg-emerald-500",
        };
    }

    return {
        pill: "border-muted-foreground/20 bg-muted/60 text-muted-foreground",
        dot: "bg-muted-foreground",
    };
}

function getCloneSessionErrorMessage(error: unknown, t: TranslationFn) {
    const rawMessage = error instanceof ApiError
        ? (error.data?.message || error.data?.error || error.message)
        : error instanceof Error
            ? error.message
            : "";

    const normalizedMessage = rawMessage.trim().toLowerCase();

    if (normalizedMessage === "insufficient balance") {
        return t("cloneGame.sourceGameCloneProgressInsufficientBalance");
    }

    return rawMessage || t("common.error");
}

function getConflictProgressTab(conflict: CloneSessionConflict) {
    const hint = `${conflict.phase ?? ""} ${conflict.definition_type ?? ""} ${conflict.field ?? ""}`.toLowerCase();
    if (hint.includes("container")) return "item_container_definitions";
    if (hint.includes("tag")) return "item_tags";
    if (hint.includes("quest")) return "quest_definitions";
    if (hint.includes("shop")) return "shop_definitions";
    return "item_definitions";
}

function normalizeProgressTab(tab: string, entries: Array<[string, { total?: number; processed?: number; completed?: boolean }]>) {
    if (entries.some(([phaseKey]) => phaseKey === tab)) return tab;
    if (tab === "item_tags" && entries.some(([phaseKey]) => phaseKey === "item_tag_definitions")) return "item_tag_definitions";
    return entries[0]?.[0] ?? tab;
}

function CurrentCloneSessionLoadingCard() {
    return (
        <Card id="clone-game-source-current-session-loading-card" className="border-primary/30">
            <CardHeader id="clone-game-source-current-session-loading-header" className="space-y-2">
                <div id="clone-game-source-current-session-loading-title" className="h-5 w-56 rounded bg-muted" />
                <div id="clone-game-source-current-session-loading-description" className="h-4 w-3/4 rounded bg-muted" />
            </CardHeader>
            <CardContent id="clone-game-source-current-session-loading-content" className="space-y-3">
                <div id="clone-game-source-current-session-loading-line-1" className="h-4 w-full rounded bg-muted" />
                <div id="clone-game-source-current-session-loading-line-2" className="h-4 w-2/3 rounded bg-muted" />
            </CardContent>
        </Card>
    );
}

type CurrentCloneSessionContentProps = {
    t: TranslationFn;
    currentSession: CloneSessionSnapshot;
    activeProgressTab: string | null;
    onActiveProgressTabChange: (value: string) => void;
    currentSessionProgressEntries: Array<[string, { total?: number; processed?: number; completed?: boolean }]>;
    currentSessionEstimatedCost?: { currency?: string; amount?: number };
    currentSessionWarnings: Array<{ field?: string; message?: string }>;
    currentSessionConflicts: CloneSessionConflict[];
    onConflictClick: (conflict: CloneSessionConflict) => void;
    items: CloneSessionCurrentItemDefinition[];
    itemsTotal: number;
    itemsOffset: number;
    itemsSearchInput: string;
    itemsSearchName: string;
    itemsLoading: boolean;
    itemsError: string | null;
    onItemsSearchInputChange: (value: string) => void;
    onItemsSearch: () => void;
    onItemsClearSearch: () => void;
    onItemsPreviousPage: () => void;
    onItemsNextPage: () => void;
    itemContainers: CloneSessionCurrentItemContainer[];
    itemContainersTotal: number;
    itemContainersOffset: number;
    itemContainersLoading: boolean;
    itemContainersError: string | null;
    onItemContainersSearchInputChange: (value: string) => void;
    onItemContainersSearch: () => void;
    onItemContainersClearSearch: () => void;
    onItemContainersPreviousPage: () => void;
    onItemContainersNextPage: () => void;
    itemTags: CloneSessionCurrentItemTag[];
    itemTagsTotal: number;
    itemTagsOffset: number;
    itemTagsSearchInput: string;
    itemTagsSearchName: string;
    itemTagsLoading: boolean;
    itemTagsError: string | null;
    onItemTagsSearchInputChange: (value: string) => void;
    onItemTagsSearch: () => void;
    onItemTagsClearSearch: () => void;
    onItemTagsPreviousPage: () => void;
    onItemTagsNextPage: () => void;
    quests: ReturnType<typeof useCurrentCloneSessionDefinitions>["questsState"]["items"];
    questsTotal: number;
    questsOffset: number;
    questsSearchInput: string;
    questsSearchName: string;
    questsLoading: boolean;
    questsError: string | null;
    onQuestsSearchInputChange: (value: string) => void;
    onQuestsSearch: () => void;
    onQuestsClearSearch: () => void;
    onQuestsPreviousPage: () => void;
    onQuestsNextPage: () => void;
    shopDefinitions: ReturnType<typeof useCurrentCloneSessionDefinitions>["shopDefinitionsState"]["items"];
    shopDefinitionsTotal: number;
    shopDefinitionsOffset: number;
    shopDefinitionsSearchInput: string;
    shopDefinitionsSearchName: string;
    shopDefinitionsLoading: boolean;
    shopDefinitionsError: string | null;
    onShopDefinitionsSearchInputChange: (value: string) => void;
    onShopDefinitionsSearch: () => void;
    onShopDefinitionsClearSearch: () => void;
    onShopDefinitionsPreviousPage: () => void;
    onShopDefinitionsNextPage: () => void;
};

export function CurrentCloneSessionCard({
    targetGameId,
    currentSession,
    currentSessionLoading,
    currentSessionError,
    deletingCurrentSession,
    onRetry,
    onDelete,
}: CurrentCloneSessionCardProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [items, setItems] = useState<CloneSessionCurrentItemDefinition[]>([]);
    const [itemsTotal, setItemsTotal] = useState(0);
    const [itemsOffset, setItemsOffset] = useState(0);
    const [itemsSearchInput, setItemsSearchInput] = useState("");
    const [itemsSearchName, setItemsSearchName] = useState("");
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState<string | null>(null);
    const [itemContainers, setItemContainers] = useState<CloneSessionCurrentItemContainer[]>([]);
    const [itemContainersTotal, setItemContainersTotal] = useState(0);
    const [itemContainersOffset, setItemContainersOffset] = useState(0);
    const [itemContainersSearchInput, setItemContainersSearchInput] = useState("");
    const [itemContainersSearchName, setItemContainersSearchName] = useState("");
    const [itemContainersLoading, setItemContainersLoading] = useState(false);
    const [itemContainersError, setItemContainersError] = useState<string | null>(null);
    const [itemTags, setItemTags] = useState<CloneSessionCurrentItemTag[]>([]);
    const [itemTagsTotal, setItemTagsTotal] = useState(0);
    const [itemTagsOffset, setItemTagsOffset] = useState(0);
    const [itemTagsSearchInput, setItemTagsSearchInput] = useState("");
    const [itemTagsSearchName, setItemTagsSearchName] = useState("");
    const [itemTagsLoading, setItemTagsLoading] = useState(false);
    const [itemTagsError, setItemTagsError] = useState<string | null>(null);
    const [runningCloneSession, setRunningCloneSession] = useState(false);
    const [runCloneSessionError, setRunCloneSessionError] = useState<string | null>(null);
    const currentSessionProgressEntries = Object.entries(currentSession?.progress ?? {});
    const currentSessionEstimatedCost = currentSession?.last_run_response?.estimated_clone_cost;
    const currentSessionWarnings = currentSession?.last_run_response?.warnings ?? [];
    const currentSessionConflicts = currentSession?.last_run_response?.conflicts ?? [];
    const searchProgressTab = searchParams.get("subTab");
    const activeProgressTab = currentSessionProgressEntries.some(([phaseKey]) => phaseKey === searchProgressTab)
        ? searchProgressTab
        : currentSessionProgressEntries[0]?.[0] ?? null;
    const isItemTagsTab = activeProgressTab === "item_tags" || activeProgressTab === "item_tag_definitions";
    const isQuestDefinitionsTab = activeProgressTab === "quest_definitions";
    const isShopDefinitionsTab = activeProgressTab === "shop_definitions";
    const formatCloneSessionError = useCallback((error: unknown) => getCloneSessionErrorMessage(error, t), [t]);

    useEffect(() => {
        if (currentSessionProgressEntries.length === 0) {
            return;
        }

        if (searchProgressTab && currentSessionProgressEntries.some(([phaseKey]) => phaseKey === searchProgressTab)) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("subTab", currentSessionProgressEntries[0]?.[0] ?? "");
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }, [currentSessionProgressEntries, pathname, router, searchParams, searchProgressTab]);

    useEffect(() => {
        if (!currentSession || activeProgressTab !== "item_definitions") {
            return;
        }

        let cancelled = false;

        const loadItems = async () => {
            setItemsLoading(true);
            setItemsError(null);

            try {
                const response = await getCurrentCloneSessionItems(targetGameId, {
                    name: itemsSearchName || undefined,
                    limit: ITEMS_PAGE_SIZE,
                    offset: itemsOffset,
                });

                if (cancelled) {
                    return;
                }

                setItems(Array.isArray(response.items) ? response.items : []);
                setItemsTotal(Number(response.total ?? 0));
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setItems([]);
                setItemsTotal(0);
                setItemsError(getCloneSessionErrorMessage(error, t));
            } finally {
                if (!cancelled) {
                    setItemsLoading(false);
                }
            }
        };

        void loadItems();

        return () => {
            cancelled = true;
        };
    }, [activeProgressTab, currentSession, itemsOffset, itemsSearchName, targetGameId, t]);

    useEffect(() => {
        if (!currentSession || activeProgressTab !== "item_container_definitions") {
            return;
        }

        let cancelled = false;

        const loadItemContainers = async () => {
            setItemContainersLoading(true);
            setItemContainersError(null);

            try {
                const response = await getCurrentCloneSessionItemContainers(targetGameId, {
                    name: itemContainersSearchName || undefined,
                    limit: ITEMS_PAGE_SIZE,
                    offset: itemContainersOffset,
                });

                if (cancelled) {
                    return;
                }

                setItemContainers(Array.isArray(response.item_containers) ? response.item_containers : []);
                setItemContainersTotal(Number(response.total ?? 0));
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setItemContainers([]);
                setItemContainersTotal(0);
                setItemContainersError(getCloneSessionErrorMessage(error, t));
            } finally {
                if (!cancelled) {
                    setItemContainersLoading(false);
                }
            }
        };

        void loadItemContainers();

        return () => {
            cancelled = true;
        };
    }, [activeProgressTab, currentSession, itemContainersOffset, itemContainersSearchName, targetGameId, t]);

    useEffect(() => {
        if (!currentSession || !isItemTagsTab) {
            return;
        }

        let cancelled = false;

        const loadItemTags = async () => {
            setItemTagsLoading(true);
            setItemTagsError(null);

            try {
                const response = await getCurrentCloneSessionItemTags(targetGameId, {
                    name: itemTagsSearchName || undefined,
                    limit: ITEMS_PAGE_SIZE,
                    offset: itemTagsOffset,
                });

                if (cancelled) {
                    return;
                }

                const nextItemTags = Array.isArray(response.item_tags)
                    ? response.item_tags
                    : Array.isArray(response.tags)
                        ? response.tags
                        : [];
                setItemTags(nextItemTags);
                setItemTagsTotal(Number(response.total ?? 0));
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setItemTags([]);
                setItemTagsTotal(0);
                setItemTagsError(getCloneSessionErrorMessage(error, t));
            } finally {
                if (!cancelled) {
                    setItemTagsLoading(false);
                }
            }
        };

        void loadItemTags();

        return () => {
            cancelled = true;
        };
    }, [activeProgressTab, currentSession, itemTagsOffset, itemTagsSearchName, isItemTagsTab, targetGameId, t]);

    const {
        questsState,
        shopDefinitionsState,
    } = useCurrentCloneSessionDefinitions({
        currentSession,
        targetGameId,
        isQuestDefinitionsTab,
        isShopDefinitionsTab,
        formatError: formatCloneSessionError,
    });

    const handleSearchItems = () => {
        setItemsOffset(0);
        setItemsSearchName(itemsSearchInput.trim());
    };

    const handleClearItemsSearch = () => {
        setItemsSearchInput("");
        setItemsSearchName("");
        setItemsOffset(0);
    };

    const handlePreviousItemsPage = () => {
        setItemsOffset((current) => Math.max(0, current - ITEMS_PAGE_SIZE));
    };

    const handleNextItemsPage = () => {
        setItemsOffset((current) => current + ITEMS_PAGE_SIZE);
    };

    const handleSearchItemContainers = () => {
        setItemContainersOffset(0);
        setItemContainersSearchName(itemContainersSearchInput.trim());
    };

    const handleClearItemContainersSearch = () => {
        setItemContainersSearchInput("");
        setItemContainersSearchName("");
        setItemContainersOffset(0);
    };

    const handlePreviousItemContainersPage = () => {
        setItemContainersOffset((current) => Math.max(0, current - ITEMS_PAGE_SIZE));
    };

    const handleNextItemContainersPage = () => {
        setItemContainersOffset((current) => current + ITEMS_PAGE_SIZE);
    };

    const handleSearchItemTags = () => {
        setItemTagsOffset(0);
        setItemTagsSearchName(itemTagsSearchInput.trim());
    };

    const handleClearItemTagsSearch = () => {
        setItemTagsSearchInput("");
        setItemTagsSearchName("");
        setItemTagsOffset(0);
    };

    const handlePreviousItemTagsPage = () => {
        setItemTagsOffset((current) => Math.max(0, current - ITEMS_PAGE_SIZE));
    };

    const handleNextItemTagsPage = () => {
        setItemTagsOffset((current) => current + ITEMS_PAGE_SIZE);
    };

    const handleRunCloneSession = async () => {
        if (!currentSession?.session_id || runningCloneSession) {
            return;
        }

        setRunningCloneSession(true);
        setRunCloneSessionError(null);

        try {
            await runCloneSession(currentSession.session_id);
            onRetry();
        } catch (error) {
            setRunCloneSessionError(getCloneSessionErrorMessage(error, t));
        } finally {
            setRunningCloneSession(false);
        }
    };

    const handleConflictClick = (conflict: CloneSessionConflict) => {
        const nextTab = normalizeProgressTab(getConflictProgressTab(conflict), currentSessionProgressEntries);
        const searchValue = (conflict.target_definition_id || conflict.value || "").trim();
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("subTab", nextTab);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
        if (!searchValue) return;
        if (nextTab === "item_definitions") {
            setItemsSearchInput(searchValue);
            setItemsSearchName(searchValue);
            setItemsOffset(0);
        } else if (nextTab === "item_container_definitions") {
            setItemContainersSearchInput(searchValue);
            setItemContainersSearchName(searchValue);
            setItemContainersOffset(0);
        } else if (nextTab === "item_tags" || nextTab === "item_tag_definitions") {
            setItemTagsSearchInput(searchValue);
            setItemTagsSearchName(searchValue);
            setItemTagsOffset(0);
        } else if (nextTab === "quest_definitions") {
            questsState.onApplySearchValue(searchValue);
        } else if (nextTab === "shop_definitions") {
            shopDefinitionsState.onApplySearchValue(searchValue);
        }
    };

    if (currentSessionLoading) {
        return <CurrentCloneSessionLoadingCard />;
    }

    if (currentSessionError) {
        return (
            <Card id="clone-game-source-current-session-error-card" className="border-destructive">
                <CardHeader id="clone-game-source-current-session-error-header">
                    <CardTitle id="clone-game-source-current-session-error-title">{t("common.error")}</CardTitle>
                    <CardDescription id="clone-game-source-current-session-error-description">{currentSessionError}</CardDescription>
                </CardHeader>
                <CardFooter id="clone-game-source-current-session-error-footer" className="flex flex-wrap gap-2">
                    <Button id="clone-game-source-current-session-error-retry-btn" type="button" variant="outline" onClick={onRetry}>
                        {t("common.retry")}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    if (!currentSession) {
        return null;
    }

    const contentProps: CurrentCloneSessionContentProps = {
        t,
        currentSession,
        activeProgressTab,
        onActiveProgressTabChange: () => {},
        currentSessionProgressEntries,
        currentSessionEstimatedCost,
        currentSessionWarnings,
        currentSessionConflicts,
        onConflictClick: handleConflictClick,
        items,
        itemsTotal,
        itemsOffset,
        itemsSearchInput,
        itemsSearchName,
        itemsLoading,
        itemsError,
        onItemsSearchInputChange: setItemsSearchInput,
        onItemsSearch: handleSearchItems,
        onItemsClearSearch: handleClearItemsSearch,
        onItemsPreviousPage: handlePreviousItemsPage,
        onItemsNextPage: handleNextItemsPage,
        itemContainers,
        itemContainersTotal,
        itemContainersOffset,
        itemContainersSearchInput,
        itemContainersSearchName,
        itemContainersLoading,
        itemContainersError,
        onItemContainersSearchInputChange: setItemContainersSearchInput,
        onItemContainersSearch: handleSearchItemContainers,
        onItemContainersClearSearch: handleClearItemContainersSearch,
        onItemContainersPreviousPage: handlePreviousItemContainersPage,
        onItemContainersNextPage: handleNextItemContainersPage,
        itemTags,
        itemTagsTotal,
        itemTagsOffset,
        itemTagsSearchInput,
        itemTagsSearchName,
        itemTagsLoading,
        itemTagsError,
        onItemTagsSearchInputChange: setItemTagsSearchInput,
        onItemTagsSearch: handleSearchItemTags,
        onItemTagsClearSearch: handleClearItemTagsSearch,
        onItemTagsPreviousPage: handlePreviousItemTagsPage,
        onItemTagsNextPage: handleNextItemTagsPage,
        quests: questsState.items,
        questsTotal: questsState.total,
        questsOffset: questsState.offset,
        questsSearchInput: questsState.searchInput,
        questsSearchName: questsState.searchName,
        questsLoading: questsState.loading,
        questsError: questsState.error,
        onQuestsSearchInputChange: questsState.onSearchInputChange,
        onQuestsSearch: questsState.onSearch,
        onQuestsClearSearch: questsState.onClearSearch,
        onQuestsPreviousPage: questsState.onPreviousPage,
        onQuestsNextPage: questsState.onNextPage,
        shopDefinitions: shopDefinitionsState.items,
        shopDefinitionsTotal: shopDefinitionsState.total,
        shopDefinitionsOffset: shopDefinitionsState.offset,
        shopDefinitionsSearchInput: shopDefinitionsState.searchInput,
        shopDefinitionsSearchName: shopDefinitionsState.searchName,
        shopDefinitionsLoading: shopDefinitionsState.loading,
        shopDefinitionsError: shopDefinitionsState.error,
        onShopDefinitionsSearchInputChange: shopDefinitionsState.onSearchInputChange,
        onShopDefinitionsSearch: shopDefinitionsState.onSearch,
        onShopDefinitionsClearSearch: shopDefinitionsState.onClearSearch,
        onShopDefinitionsPreviousPage: shopDefinitionsState.onPreviousPage,
        onShopDefinitionsNextPage: shopDefinitionsState.onNextPage,
    };
    const currentSessionStatusStyle = getCloneSessionStatusStyle(currentSession.status);

    return (
        <Card id="clone-game-source-current-session-card" className="border-primary/40 bg-primary/5">
            <CardHeader id="clone-game-source-current-session-header" className="space-y-3">
                <div id="clone-game-source-current-session-title-row" className="flex flex-wrap items-start justify-between gap-3">
                    <div id="clone-game-source-current-session-title-copy" className="space-y-1">
                        <CardTitle id="clone-game-source-current-session-title" className="text-sm uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionTitle")}
                        </CardTitle>
                        <CardDescription id="clone-game-source-current-session-description">
                            {currentSession.message || t("cloneGame.sourceGameCurrentSessionActiveDesc")}
                        </CardDescription>
                    </div>
                    <div id="clone-game-source-current-session-top-right" className="flex flex-col items-end gap-2 self-start">
                        <div id="clone-game-source-current-session-session-id-wrap" className="flex items-center gap-1">
                            <p id="clone-game-source-current-session-session-id-text" className="max-w-[220px] truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                                {currentSession.session_id || t("common.unknown")}
                            </p>
                            {currentSession.session_id ? (
                                <CopyButton
                                    id="clone-game-source-current-session-session-id-copy-btn"
                                    iconId="clone-game-source-current-session-session-id-copy-icon"
                                    text={currentSession.session_id}
                                    size="h-3 w-3"
                                    className="ml-0"
                                />
                            ) : null}
                        </div>
                        <span
                            id="clone-game-source-current-session-status-badge"
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
                                currentSessionStatusStyle.pill,
                            )}
                        >
                            <span
                                id="clone-game-source-current-session-status-indicator"
                                className={cn("h-1.5 w-1.5 rounded-full", currentSessionStatusStyle.dot)}
                            />
                            {formatTechnicalLabel(currentSession.status) || t("common.unknown")}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CurrentCloneSessionProgressTabs {...contentProps} />

            <CardFooter id="clone-game-source-current-session-footer" className="flex flex-wrap items-center justify-between gap-2">
                <div id="clone-game-source-current-session-footer-left" className="flex flex-wrap items-center gap-2">
                    <Button
                        id="clone-game-source-current-session-delete-btn"
                        type="button"
                        variant="destructive"
                        onClick={onDelete}
                        disabled={deletingCurrentSession}
                    >
                        {deletingCurrentSession ? <Loader2 id="clone-game-source-current-session-delete-loading-icon" className="h-4 w-4 animate-spin" /> : null}
                        {deletingCurrentSession ? t("common.loading") : t("common.delete")}
                    </Button>
                    {runCloneSessionError ? (
                        <p id="clone-game-source-current-session-run-error" className="text-sm text-destructive">
                            {runCloneSessionError}
                        </p>
                    ) : null}
                </div>
                <div id="clone-game-source-current-session-footer-right" className="flex flex-wrap items-center gap-2">
                    <Button
                        id="clone-game-source-current-session-run-btn"
                        type="button"
                        onClick={() => void handleRunCloneSession()}
                        disabled={!currentSession.session_id || runningCloneSession || deletingCurrentSession}
                    >
                        {runningCloneSession ? <Loader2 id="clone-game-source-current-session-run-loading-icon" className="h-4 w-4 animate-spin" /> : null}
                        {runningCloneSession ? t("common.loading") : t("cloneGame.sourceGameCurrentSessionRun")}
                    </Button>
                    <Button id="clone-game-source-current-session-refresh-btn" type="button" variant="outline" onClick={onRetry}>
                        {t("common.refresh")}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
