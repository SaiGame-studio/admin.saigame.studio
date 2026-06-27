"use client";

import { useEffect, useState } from "react";
import {
    getCurrentCloneSessionQuests,
    getCurrentCloneSessionShopDefinitions,
    type CloneSessionCurrentQuestDefinition,
    type CloneSessionCurrentShopDefinition,
    type CloneSessionSnapshot,
} from "@/lib/game-api";

export const CLONE_SESSION_PAGE_SIZE = 12;

type CloneSessionPagedState<TItem> = {
    items: TItem[];
    total: number;
    offset: number;
    searchInput: string;
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
    currentSession: CloneSessionSnapshot | null;
    targetGameId: string;
    isQuestDefinitionsTab: boolean;
    isShopDefinitionsTab: boolean;
    formatError: (error: unknown) => string;
};

function useCloneSessionPagedState<TItem>() {
    const [items, setItems] = useState<TItem[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [searchInput, setSearchInput] = useState("");
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
        searchName: state.searchName,
        loading: state.loading,
        error: state.error,
        onSearchInputChange: state.setSearchInput,
        onApplySearchValue: (value: string) => {
            const nextValue = value.trim();
            state.setSearchInput(nextValue);
            state.setSearchName(nextValue);
            state.setOffset(0);
        },
        onSearch: () => {
            state.setOffset(0);
            state.setSearchName(state.searchInput.trim());
        },
        onClearSearch: () => {
            state.setSearchInput("");
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
    currentSession,
    targetGameId,
    isQuestDefinitionsTab,
    isShopDefinitionsTab,
    formatError,
}: UseCurrentCloneSessionDefinitionsParams) {
    const questsState = useCloneSessionPagedState<CloneSessionCurrentQuestDefinition>();
    const shopDefinitionsState = useCloneSessionPagedState<CloneSessionCurrentShopDefinition>();

    useEffect(() => {
        if (!currentSession || !isQuestDefinitionsTab) {
            return;
        }

        let cancelled = false;

        const loadQuests = async () => {
            questsState.setLoading(true);
            questsState.setError(null);

            try {
                const response = await getCurrentCloneSessionQuests(targetGameId, {
                    name: questsState.searchName || undefined,
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
    }, [currentSession, formatError, isQuestDefinitionsTab, questsState.offset, questsState.searchName, targetGameId]);

    useEffect(() => {
        if (!currentSession || !isShopDefinitionsTab) {
            return;
        }

        let cancelled = false;

        const loadShopDefinitions = async () => {
            shopDefinitionsState.setLoading(true);
            shopDefinitionsState.setError(null);

            try {
                const response = await getCurrentCloneSessionShopDefinitions(targetGameId, {
                    name: shopDefinitionsState.searchName || undefined,
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
    }, [currentSession, formatError, isShopDefinitionsTab, shopDefinitionsState.offset, shopDefinitionsState.searchName, targetGameId]);

    return {
        questsState: toPagedResult(questsState),
        shopDefinitionsState: toPagedResult(shopDefinitionsState),
    };
}
