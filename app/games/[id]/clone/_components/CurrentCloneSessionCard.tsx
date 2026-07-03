"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import {
    getCurrentCloneSessionItemContainers,
    getCurrentCloneSessionItems,
    getCurrentCloneSessionItemTags,
    runCloneSession,
    completeCloneSession,
    type CloneSessionConflict,
    type CloneSessionCurrentItemContainer,
    type CloneSessionCurrentItemDefinition,
    type CloneSessionCurrentItemTag,
    type CloneSessionSnapshot,
    type CloneSessionWarning,
} from "@/lib/game-api";
import { CurrentCloneSessionAlerts } from "./CurrentCloneSessionAlerts";
import { CurrentCloneSessionFooterActions } from "./CurrentCloneSessionFooterActions";
import { CurrentCloneSessionFooterProgress } from "./CurrentCloneSessionFooterProgress";
import { CurrentCloneSessionLoadingCard } from "./CurrentCloneSessionLoadingCard";
import { CurrentCloneSessionProgressTabs } from "./CurrentCloneSessionProgressTabs";
import type { CurrentCloneSessionProgressTabsProps } from "./currentCloneSessionProgressTabs.types";
import { getConflictProgressTab, getConflictSearchId, normalizeProgressTab } from "./cloneSessionConflictNavigation";
import { findCloneSessionManualOverwriteTargetId } from "./cloneSessionManualOverwriteUtils";
import { formatTechnicalLabel, getCloneSessionErrorMessage, getCloneSessionStatusStyle } from "./cloneSessionProgressUtils";
import { useCurrentCloneSessionDefinitions } from "./useCurrentCloneSessionDefinitions";

const ITEMS_PAGE_SIZE = 12;

type CurrentCloneSessionCardProps = {
    targetGameId: string;
    currentSession: CloneSessionSnapshot | null;
    currentSessionLoading: boolean;
    currentSessionError: string | null;
    deletingCurrentSession: boolean;
    onRefreshCurrentSession: () => Promise<void>;
    onRetry: () => Promise<void>;
    onDelete: () => void;
};

export function CurrentCloneSessionCard({
    targetGameId,
    currentSession,
    currentSessionLoading,
    currentSessionError,
    deletingCurrentSession,
    onRefreshCurrentSession,
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
    const [itemsSearchId, setItemsSearchId] = useState("");
    const [itemsSearchName, setItemsSearchName] = useState("");
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState<string | null>(null);
    const [itemContainers, setItemContainers] = useState<CloneSessionCurrentItemContainer[]>([]);
    const [itemContainersTotal, setItemContainersTotal] = useState(0);
    const [itemContainersOffset, setItemContainersOffset] = useState(0);
    const [itemContainersSearchInput, setItemContainersSearchInput] = useState("");
    const [itemContainersSearchId, setItemContainersSearchId] = useState("");
    const [itemContainersSearchName, setItemContainersSearchName] = useState("");
    const [itemContainersLoading, setItemContainersLoading] = useState(false);
    const [itemContainersError, setItemContainersError] = useState<string | null>(null);
    const [itemTags, setItemTags] = useState<CloneSessionCurrentItemTag[]>([]);
    const [itemTagsTotal, setItemTagsTotal] = useState(0);
    const [itemTagsOffset, setItemTagsOffset] = useState(0);
    const [itemTagsSearchInput, setItemTagsSearchInput] = useState("");
    const [itemTagsSearchId, setItemTagsSearchId] = useState("");
    const [itemTagsSearchName, setItemTagsSearchName] = useState("");
    const [itemTagsLoading, setItemTagsLoading] = useState(false);
    const [itemTagsError, setItemTagsError] = useState<string | null>(null);
    const [runningCloneSession, setRunningCloneSession] = useState(false);
    const [runCloneSessionError, setRunCloneSessionError] = useState<string | null>(null);
    const [contentRefreshNonce, setContentRefreshNonce] = useState(0);
    const previousSessionIdRef = useRef<string | null>(null);
    const currentSessionId = currentSession?.session_id ?? null;
    const currentSessionProgressEntries = Object.entries(currentSession?.progress ?? {});
    const currentSessionEstimatedCost = currentSession?.last_run_response?.estimated_clone_cost;
    const currentSessionWarnings = currentSession?.last_run_response?.warnings ?? [];
    const currentSessionConflicts = currentSession?.last_run_response?.conflicts ?? [];
    const searchProgressTab = searchParams.get("subTab");
    const activeProgressTab = currentSessionProgressEntries.some(([phaseKey]) => phaseKey === searchProgressTab)
        ? searchProgressTab
        : currentSessionProgressEntries[0]?.[0] ?? null;
    const canCompleteCloneSession = currentSession?.status === "review_pending" && currentSession?.current_phase === "finalization";
    const isItemTagsTab = activeProgressTab === "item_tags" || activeProgressTab === "item_tag_definitions";
    const isEquipmentSlotDefinitionsTab = activeProgressTab === "equipment_slot_definitions";
    const isQuestDefinitionsTab = activeProgressTab === "quest_definitions";
    const isShopDefinitionsTab = activeProgressTab === "shop_definitions";
    const isPresetDefinitionsTab = activeProgressTab === "preset_definitions";
    const isGachaPacksTab = activeProgressTab === "gacha_packs" || activeProgressTab === "gacha_pack_definitions";
    const isCraftingRecipesTab = activeProgressTab === "crafting_recipes" || activeProgressTab === "crafting_recipe_definitions";
    const isEntityDefinitionsTab = activeProgressTab === "entity_definitions";
    const isEntityPoolsTab = activeProgressTab === "entity_pools";
    const formatCloneSessionError = useCallback((error: unknown) => getCloneSessionErrorMessage(error, t), [t]);

    useEffect(() => {
        if (!currentSessionId || currentSessionProgressEntries.length === 0) {
            return;
        }

        const previousSessionId = previousSessionIdRef.current;
        if (previousSessionId === currentSessionId) {
            return;
        }

        previousSessionIdRef.current = currentSessionId;

        if (!previousSessionId) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("subTab", currentSessionProgressEntries[0]?.[0] ?? "");
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }, [currentSessionId, currentSessionProgressEntries, pathname, router, searchParams]);

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
        if (!currentSessionId || activeProgressTab !== "item_definitions") {
            return;
        }

        let cancelled = false;

        const loadItems = async () => {
            setItemsLoading(true);
            setItemsError(null);

            try {
                const response = await getCurrentCloneSessionItems(targetGameId, {
                    id: itemsSearchId || undefined,
                    name: itemsSearchId ? undefined : itemsSearchName || undefined,
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
    }, [activeProgressTab, contentRefreshNonce, currentSessionId, itemsOffset, itemsSearchId, itemsSearchName, targetGameId, t]);

    useEffect(() => {
        if (!currentSessionId || activeProgressTab !== "item_container_definitions") {
            return;
        }

        let cancelled = false;

        const loadItemContainers = async () => {
            setItemContainersLoading(true);
            setItemContainersError(null);

            try {
                const response = await getCurrentCloneSessionItemContainers(targetGameId, {
                    id: itemContainersSearchId || undefined,
                    name: itemContainersSearchId ? undefined : itemContainersSearchName || undefined,
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
    }, [activeProgressTab, contentRefreshNonce, currentSessionId, itemContainersOffset, itemContainersSearchId, itemContainersSearchName, targetGameId, t]);

    useEffect(() => {
        if (!currentSessionId || !isItemTagsTab) {
            return;
        }

        let cancelled = false;

        const loadItemTags = async () => {
            setItemTagsLoading(true);
            setItemTagsError(null);

            try {
                const response = await getCurrentCloneSessionItemTags(targetGameId, {
                    id: itemTagsSearchId || undefined,
                    name: itemTagsSearchId ? undefined : itemTagsSearchName || undefined,
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
    }, [activeProgressTab, contentRefreshNonce, currentSessionId, itemTagsOffset, itemTagsSearchId, itemTagsSearchName, isItemTagsTab, targetGameId, t]);

    const {
        equipmentSlotDefinitionsState,
        questsState,
        shopDefinitionsState,
        presetDefinitionsState,
        gachaPacksState,
        craftingRecipesState,
        entityDefinitionsState,
        entityPoolsState,
    } = useCurrentCloneSessionDefinitions({
        currentSessionId,
        targetGameId,
        isEquipmentSlotDefinitionsTab,
        isQuestDefinitionsTab,
        isShopDefinitionsTab,
        isPresetDefinitionsTab,
        isGachaPacksTab,
        isCraftingRecipesTab,
        isEntityDefinitionsTab,
        isEntityPoolsTab,
        refreshNonce: contentRefreshNonce,
        formatError: formatCloneSessionError,
    });

    const getManualOverwriteTargetId = useCallback((
        contentType: "item_definition" | "item_container_definition" | "equipment_slot_definition" | "item_tag" | "quest_definition" | "shop_definition" | "preset_definition" | "crafting_recipe" | "entity_definition",
        sourceId: string,
    ) => findCloneSessionManualOverwriteTargetId(currentSessionConflicts, contentType, sourceId), [currentSessionConflicts]);

    const handleSearchItems = () => {
        setItemsOffset(0);
        setItemsSearchId("");
        setItemsSearchName(itemsSearchInput.trim());
    };

    const handleClearItemsSearch = () => {
        setItemsSearchInput("");
        setItemsSearchId("");
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
        setItemContainersSearchId("");
        setItemContainersSearchName(itemContainersSearchInput.trim());
    };

    const handleClearItemContainersSearch = () => {
        setItemContainersSearchInput("");
        setItemContainersSearchId("");
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
        setItemTagsSearchId("");
        setItemTagsSearchName(itemTagsSearchInput.trim());
    };

    const handleClearItemTagsSearch = () => {
        setItemTagsSearchInput("");
        setItemTagsSearchId("");
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
        let nextRunCloneSessionError: string | null = null;

        try {
            if (canCompleteCloneSession) {
                await completeCloneSession(currentSession.session_id);
            } else {
                await runCloneSession(currentSession.session_id);
            }
        } catch (error) {
            nextRunCloneSessionError = getCloneSessionErrorMessage(error, t);
        } finally {
            try {
                await onRefreshCurrentSession();
            } catch (error) {
                if (!nextRunCloneSessionError) {
                    nextRunCloneSessionError = getCloneSessionErrorMessage(error, t);
                }
            }

            setRunCloneSessionError(nextRunCloneSessionError);
            setRunningCloneSession(false);
        }
    };

    const handleConflictClick = (conflict: CloneSessionConflict) => {
        const nextTab = normalizeProgressTab(getConflictProgressTab(conflict), currentSessionProgressEntries);
        const searchValue = getConflictSearchId(conflict, nextTab);
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("subTab", nextTab);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
        if (!searchValue) return setRunCloneSessionError(t("cloneGame.sourceGameCurrentSessionConflictMissingItemDefinitionId"));
        setRunCloneSessionError(null);
        if (nextTab === "item_definitions") {
            setItemsSearchInput(searchValue);
            setItemsSearchId(searchValue);
            setItemsSearchName("");
            setItemsOffset(0);
        } else if (nextTab === "item_container_definitions") {
            setItemContainersSearchInput(searchValue);
            setItemContainersSearchId(searchValue);
            setItemContainersSearchName("");
            setItemContainersOffset(0);
        } else if (nextTab === "item_tags" || nextTab === "item_tag_definitions") {
            setItemTagsSearchInput(searchValue);
            setItemTagsSearchId(searchValue);
            setItemTagsSearchName("");
            setItemTagsOffset(0);
        } else if (nextTab === "equipment_slot_definitions") {
            equipmentSlotDefinitionsState.onApplySearchValue(searchValue);
        } else if (nextTab === "quest_definitions") {
            questsState.onApplySearchValue(searchValue);
        } else if (nextTab === "shop_definitions") {
            shopDefinitionsState.onApplySearchValue(searchValue);
        } else if (nextTab === "preset_definitions") {
            presetDefinitionsState.onApplySearchValue(searchValue);
        } else if (nextTab === "gacha_packs" || nextTab === "gacha_pack_definitions") {
            gachaPacksState.onApplySearchValue(searchValue);
        } else if (nextTab === "crafting_recipes" || nextTab === "crafting_recipe_definitions") {
            craftingRecipesState.onApplySearchValue(searchValue);
        } else if (nextTab === "entity_definitions") {
            entityDefinitionsState.onApplySearchValue(searchValue);
        } else if (nextTab === "entity_pools") {
            entityPoolsState.onApplySearchValue(searchValue);
        }
    };

    const handleWarningClick = (warning: CloneSessionWarning) => {
        const searchValue = (warning.source_id || "").trim();
        const nextTab = normalizeProgressTab("quest_definitions", currentSessionProgressEntries);
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("subTab", nextTab);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
        if (!searchValue) return setRunCloneSessionError(t("cloneGame.sourceGameCurrentSessionConflictMissingItemDefinitionId"));
        setRunCloneSessionError(null);
        questsState.onApplySearchValue(searchValue);
    };

    const handleManualOverwriteSuccess = useCallback(async () => {
        await onRefreshCurrentSession();
        setContentRefreshNonce((current) => current + 1);
    }, [onRefreshCurrentSession]);

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
                    <Button id="clone-game-source-current-session-error-retry-btn" type="button" variant="outline" onClick={() => void onRetry()}>
                        {t("common.retry")}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    if (!currentSession) {
        return null;
    }

    const contentProps: CurrentCloneSessionProgressTabsProps = {
        t,
        currentSession,
        activeProgressTab,
        onActiveProgressTabChange: () => {},
        currentSessionProgressEntries,
        currentSessionEstimatedCost,
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
        equipmentSlotDefinitions: equipmentSlotDefinitionsState.items,
        equipmentSlotDefinitionsTotal: equipmentSlotDefinitionsState.total,
        equipmentSlotDefinitionsOffset: equipmentSlotDefinitionsState.offset,
        equipmentSlotDefinitionsSearchInput: equipmentSlotDefinitionsState.searchInput,
        equipmentSlotDefinitionsSearchName: equipmentSlotDefinitionsState.searchName,
        equipmentSlotDefinitionsLoading: equipmentSlotDefinitionsState.loading,
        equipmentSlotDefinitionsError: equipmentSlotDefinitionsState.error,
        onEquipmentSlotDefinitionsSearchInputChange: equipmentSlotDefinitionsState.onSearchInputChange,
        onEquipmentSlotDefinitionsSearch: equipmentSlotDefinitionsState.onSearch,
        onEquipmentSlotDefinitionsClearSearch: equipmentSlotDefinitionsState.onClearSearch,
        onEquipmentSlotDefinitionsPreviousPage: equipmentSlotDefinitionsState.onPreviousPage,
        onEquipmentSlotDefinitionsNextPage: equipmentSlotDefinitionsState.onNextPage,
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
        presetDefinitions: presetDefinitionsState.items, presetDefinitionsTotal: presetDefinitionsState.total, presetDefinitionsOffset: presetDefinitionsState.offset,
        presetDefinitionsSearchInput: presetDefinitionsState.searchInput, presetDefinitionsSearchName: presetDefinitionsState.searchName,
        presetDefinitionsLoading: presetDefinitionsState.loading, presetDefinitionsError: presetDefinitionsState.error,
        onPresetDefinitionsSearchInputChange: presetDefinitionsState.onSearchInputChange, onPresetDefinitionsSearch: presetDefinitionsState.onSearch,
        onPresetDefinitionsClearSearch: presetDefinitionsState.onClearSearch, onPresetDefinitionsPreviousPage: presetDefinitionsState.onPreviousPage, onPresetDefinitionsNextPage: presetDefinitionsState.onNextPage,
        gachaPacks: gachaPacksState.items,
        gachaPacksSessionId: currentSession.session_id,
        gachaPacksTotal: gachaPacksState.total,
        gachaPacksOffset: gachaPacksState.offset,
        gachaPacksSearchInput: gachaPacksState.searchInput,
        gachaPacksSearchName: gachaPacksState.searchName,
        gachaPacksLoading: gachaPacksState.loading,
        gachaPacksError: gachaPacksState.error,
        onGachaPacksSearchInputChange: gachaPacksState.onSearchInputChange,
        onGachaPacksSearch: gachaPacksState.onSearch,
        onGachaPacksClearSearch: gachaPacksState.onClearSearch,
        onGachaPacksPreviousPage: gachaPacksState.onPreviousPage,
        onGachaPacksNextPage: gachaPacksState.onNextPage,
        craftingRecipes: craftingRecipesState.items,
        craftingRecipesTotal: craftingRecipesState.total,
        craftingRecipesOffset: craftingRecipesState.offset,
        craftingRecipesSearchInput: craftingRecipesState.searchInput,
        craftingRecipesSearchName: craftingRecipesState.searchName,
        craftingRecipesLoading: craftingRecipesState.loading,
        craftingRecipesError: craftingRecipesState.error,
        onCraftingRecipesSearchInputChange: craftingRecipesState.onSearchInputChange,
        onCraftingRecipesSearch: craftingRecipesState.onSearch,
        onCraftingRecipesClearSearch: craftingRecipesState.onClearSearch,
        onCraftingRecipesPreviousPage: craftingRecipesState.onPreviousPage,
        onCraftingRecipesNextPage: craftingRecipesState.onNextPage,
        entityDefinitions: entityDefinitionsState.items,
        entityDefinitionsTotal: entityDefinitionsState.total,
        entityDefinitionsOffset: entityDefinitionsState.offset,
        entityDefinitionsSearchInput: entityDefinitionsState.searchInput,
        entityDefinitionsSearchName: entityDefinitionsState.searchName,
        entityDefinitionsLoading: entityDefinitionsState.loading,
        entityDefinitionsError: entityDefinitionsState.error,
        onEntityDefinitionsSearchInputChange: entityDefinitionsState.onSearchInputChange,
        onEntityDefinitionsSearch: entityDefinitionsState.onSearch,
        onEntityDefinitionsClearSearch: entityDefinitionsState.onClearSearch,
        onEntityDefinitionsPreviousPage: entityDefinitionsState.onPreviousPage,
        onEntityDefinitionsNextPage: entityDefinitionsState.onNextPage,
        entityPools: entityPoolsState.items,
        entityPoolsTotal: entityPoolsState.total,
        entityPoolsOffset: entityPoolsState.offset,
        entityPoolsSearchInput: entityPoolsState.searchInput,
        entityPoolsSearchName: entityPoolsState.searchName,
        entityPoolsLoading: entityPoolsState.loading,
        entityPoolsError: entityPoolsState.error,
        onEntityPoolsSearchInputChange: entityPoolsState.onSearchInputChange,
        onEntityPoolsSearch: entityPoolsState.onSearch,
        onEntityPoolsClearSearch: entityPoolsState.onClearSearch,
        onEntityPoolsPreviousPage: entityPoolsState.onPreviousPage,
        onEntityPoolsNextPage: entityPoolsState.onNextPage,
        getManualOverwriteTargetId,
        onManualOverwriteSuccess: handleManualOverwriteSuccess,
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
                        <div id="clone-game-source-current-session-status-actions" className="flex items-center gap-2">
                            <span id="clone-game-source-current-session-status-badge" className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none", currentSessionStatusStyle.pill)}>
                                <span id="clone-game-source-current-session-status-indicator" className={cn("h-1.5 w-1.5 rounded-full", currentSessionStatusStyle.dot)} />
                                {formatTechnicalLabel(currentSession.status) || t("common.unknown")}
                            </span>
                            <Button id="clone-game-source-current-session-refresh-btn" type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => void onRetry()} aria-label={t("common.refresh")} title={t("common.refresh")}>
                                <RefreshCw id="clone-game-source-current-session-refresh-icon" className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CurrentCloneSessionProgressTabs {...contentProps} />

            <CurrentCloneSessionFooterActions
                deletingCurrentSession={deletingCurrentSession}
                runCloneSessionError={runCloneSessionError}
                runningCloneSession={runningCloneSession}
                canCompleteCloneSession={canCompleteCloneSession}
                sessionId={currentSession.session_id}
                initialOverwriteConflicts={currentSession.clone_run_options?.overwrite_all_conflicting_codes}
                t={t}
                onDelete={onDelete}
                onRefreshCurrentSession={onRefreshCurrentSession}
                onRunCloneSession={handleRunCloneSession}
            />

            <div id="clone-game-source-current-session-alerts-wrap" className="px-6 pb-6">
                <CurrentCloneSessionAlerts
                    t={t}
                    targetGameId={targetGameId}
                    sourceGameId={currentSession.source_game_id}
                    warnings={currentSessionWarnings}
                    conflicts={currentSessionConflicts}
                    onConflictClick={handleConflictClick}
                    onWarningClick={handleWarningClick}
                />
            </div>

            <CurrentCloneSessionFooterProgress
                t={t}
                progressEntries={currentSessionProgressEntries}
                onRefresh={onRefreshCurrentSession}
            />
        </Card>
    );
}
