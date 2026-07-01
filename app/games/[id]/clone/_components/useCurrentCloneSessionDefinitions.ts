"use client";

import { useEffect, useState } from "react";
import {
    getCurrentCloneSessionPresetDefinitions,
    getCurrentCloneSessionQuests,
    getCurrentCloneSessionShopDefinitions,
    type CloneSessionCurrentPresetDefinition,
    type CloneSessionCurrentQuestDefinition,
    type CloneSessionCurrentShopDefinition,
} from "@/lib/game-api";

export const CLONE_SESSION_PAGE_SIZE = 12;

type CloneSessionPagedState<TItem> = {
    items: TItem[];
    total: number;
    offset: number;
    searchInput: string;
    searchId: string;
    searchName: string;
    loading: boolean;
    error: string | null;
    onSearchInputChange: (value: string) => void;
    onApplySearchValue: (value: string) => void;
    onSearch: () => void;
    onClearSearch: () => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
};

type UseCurrentCloneSessionDefinitionsParams = {
    currentSessionId: string | null;
    targetGameId: string;
    isQuestDefinitionsTab: boolean;
    isShopDefinitionsTab: boolean;
    isPresetDefinitionsTab: boolean;
    refreshNonce: number;
    formatError: (error: unknown) => string;
};

function useCloneSessionPagedState<TItem>() {
    const [items, setItems] = useState<TItem[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [searchId, setSearchId] = useState("");
    const [searchName, setSearchName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return {
        items,
        setItems,
        total,
        setTotal,
        offset,
        setOffset,
        searchInput,
        setSearchInput,
        searchId,
        setSearchId,
        searchName,
        setSearchName,
        loading,
        setLoading,
        error,
        setError,
    };
}

function toPagedResult<TItem>(state: ReturnType<typeof useCloneSessionPagedState<TItem>>): CloneSessionPagedState<TItem> {
    return {
        items: state.items,
        total: state.total,
        offset: state.offset,
        searchInput: state.searchInput,
        searchId: state.searchId,
        searchName: state.searchName,
        loading: state.loading,
        error: state.error,
        onSearchInputChange: state.setSearchInput,
        onApplySearchValue: (value: string) => {
            const nextValue = value.trim();
            state.setSearchInput(nextValue);
            state.setSearchId(nextValue);
            state.setSearchName("");
            state.setOffset(0);
        },
        onSearch: () => {
            state.setOffset(0);
            state.setSearchId("");
            state.setSearchName(state.searchInput.trim());
        },
        onClearSearch: () => {
            state.setSearchInput("");
            state.setSearchId("");
            state.setSearchName("");
            state.setOffset(0);
        },
        onPreviousPage: () => {
            state.setOffset((current) => Math.max(0, current - CLONE_SESSION_PAGE_SIZE));
        },
        onNextPage: () => {
            state.setOffset((current) => current + CLONE_SESSION_PAGE_SIZE);
        },
    };
}

export function useCurrentCloneSessionDefinitions({
    currentSessionId,
    targetGameId,
    isQuestDefinitionsTab,
    isShopDefinitionsTab,
    isPresetDefinitionsTab,
    refreshNonce,
    formatError,
}: UseCurrentCloneSessionDefinitionsParams) {
    const questsState = useCloneSessionPagedState<CloneSessionCurrentQuestDefinition>();
    const shopDefinitionsState = useCloneSessionPagedState<CloneSessionCurrentShopDefinition>();
    const presetDefinitionsState = useCloneSessionPagedState<CloneSessionCurrentPresetDefinition>();

    useEffect(() => {
        if (!currentSessionId || !isQuestDefinitionsTab) {
            return;
        }

        let cancelled = false;

        const loadQuests = async () => {
            questsState.setLoading(true);
            questsState.setError(null);

            try {
                const response = await getCurrentCloneSessionQuests(targetGameId, {
                    id: questsState.searchId || undefined,
                    name: questsState.searchId ? undefined : questsState.searchName || undefined,
                    limit: CLONE_SESSION_PAGE_SIZE,
                    offset: questsState.offset,
                });

                if (cancelled) {
                    return;
                }

                const nextQuests = Array.isArray(response.quests)
                    ? response.quests
                    : Array.isArray(response.quest_definitions)
                        ? response.quest_definitions
                        : [];

                questsState.setItems(nextQuests);
                questsState.setTotal(Number(response.total ?? 0));
            } catch (error) {
                if (cancelled) {
                    return;
                }

                questsState.setItems([]);
                questsState.setTotal(0);
                questsState.setError(formatError(error));
            } finally {
                if (!cancelled) {
                    questsState.setLoading(false);
                }
            }
        };

        void loadQuests();

        return () => {
            cancelled = true;
        };
    }, [currentSessionId, formatError, isQuestDefinitionsTab, questsState.offset, questsState.searchId, questsState.searchName, refreshNonce, targetGameId]);

    useEffect(() => {
        if (!currentSessionId || !isShopDefinitionsTab) {
            return;
        }

        let cancelled = false;

        const loadShopDefinitions = async () => {
            shopDefinitionsState.setLoading(true);
            shopDefinitionsState.setError(null);

            try {
                const response = await getCurrentCloneSessionShopDefinitions(targetGameId, {
                    id: shopDefinitionsState.searchId || undefined,
                    name: shopDefinitionsState.searchId ? undefined : shopDefinitionsState.searchName || undefined,
                    limit: CLONE_SESSION_PAGE_SIZE,
                    offset: shopDefinitionsState.offset,
                });

                if (cancelled) {
                    return;
                }

                const nextShopDefinitions = Array.isArray(response.shop_definitions)
                    ? response.shop_definitions
                    : Array.isArray(response.shops)
                        ? response.shops
                        : [];

                shopDefinitionsState.setItems(nextShopDefinitions);
                shopDefinitionsState.setTotal(Number(response.total ?? 0));
            } catch (error) {
                if (cancelled) {
                    return;
                }

                shopDefinitionsState.setItems([]);
                shopDefinitionsState.setTotal(0);
                shopDefinitionsState.setError(formatError(error));
            } finally {
                if (!cancelled) {
                    shopDefinitionsState.setLoading(false);
                }
            }
        };

        void loadShopDefinitions();

        return () => {
            cancelled = true;
        };
    }, [currentSessionId, formatError, isShopDefinitionsTab, refreshNonce, shopDefinitionsState.offset, shopDefinitionsState.searchId, shopDefinitionsState.searchName, targetGameId]);

    useEffect(() => {
        if (!currentSessionId || !isPresetDefinitionsTab) {
            return;
        }

        let cancelled = false;

        const loadPresetDefinitions = async () => {
            presetDefinitionsState.setLoading(true);
            presetDefinitionsState.setError(null);

            try {
                const response = await getCurrentCloneSessionPresetDefinitions(targetGameId, {
                    id: presetDefinitionsState.searchId || undefined,
                    name: presetDefinitionsState.searchId ? undefined : presetDefinitionsState.searchName || undefined,
                    limit: CLONE_SESSION_PAGE_SIZE,
                    offset: presetDefinitionsState.offset,
                });

                if (cancelled) {
                    return;
                }

                const nextPresetDefinitions = Array.isArray(response.preset_definitions)
                    ? response.preset_definitions
                    : Array.isArray(response.presets)
                        ? response.presets
                        : [];

                presetDefinitionsState.setItems(nextPresetDefinitions);
                presetDefinitionsState.setTotal(Number(response.total ?? 0));
            } catch (error) {
                if (cancelled) {
                    return;
                }

                presetDefinitionsState.setItems([]);
                presetDefinitionsState.setTotal(0);
                presetDefinitionsState.setError(formatError(error));
            } finally {
                if (!cancelled) {
                    presetDefinitionsState.setLoading(false);
                }
            }
        };

        void loadPresetDefinitions();

        return () => {
            cancelled = true;
        };
    }, [currentSessionId, formatError, isPresetDefinitionsTab, presetDefinitionsState.offset, presetDefinitionsState.searchId, presetDefinitionsState.searchName, refreshNonce, targetGameId]);

    return {
        questsState: toPagedResult(questsState),
        shopDefinitionsState: toPagedResult(shopDefinitionsState),
        presetDefinitionsState: toPagedResult(presetDefinitionsState),
    };
}
