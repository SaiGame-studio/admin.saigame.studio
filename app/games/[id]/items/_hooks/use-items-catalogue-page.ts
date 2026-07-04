"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";

import { ApiError } from "@/lib/api-client";
import { getGame } from "@/lib/game-api";
import { fetchItemCategories, fetchItemRarities, listItemDefinitions, listItemTags, updateItemDefinition } from "@/lib/inventory-api";
import { createConversation, linkConversationContent } from "@/lib/llm-conversation-api";
import { safeSetItem } from "@/lib/storage-utils";
import type { GameLimits } from "@/types/game";
import type { ItemCategory, ItemDefinition, ItemRarity, UpdateItemRequest } from "@/types/inventory";
import type { ItemTag, ListItemsParams } from "@/lib/inventory-api";

type ToastFn = (options: { title?: string; description?: string; variant?: "default" | "destructive" }) => void;

type UseItemsCataloguePageParams = {
  gameId: string;
  limit: number;
  total: number;
  offset: number;
  filterCategory: string;
  filterRarity: string;
  debouncedName: string;
  selectedTagKeys: string[];
  filterAllowClientUpdateQty: string;
  convActiveId: string | null;
  t: (key: string) => string;
  toast: ToastFn;
  setGameName: (value: string) => void;
  setStudioId: (value: string) => void;
  setMaxItems: (value: number | null) => void;
  setItemUsage: (value: number | null) => void;
  setGameLimits: (value: GameLimits | null) => void;
  setMaxEquipmentSlots: (value: number | null) => void;
  setEquipmentSlotsUsage: (value: number | null) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setItems: Dispatch<SetStateAction<ItemDefinition[]>>;
  setTotal: (value: number) => void;
  setOffset: (value: number) => void;
  setUpdatingItemId: (value: string | null) => void;
  setConvActiveId: (value: string | null) => void;
  setLinkingItemId: (value: string | null) => void;
  setCategories: (value: ItemCategory[]) => void;
  setRarities: (value: ItemRarity[]) => void;
  setItemTags: (value: ItemTag[]) => void;
};

export function useItemsCataloguePage({
  gameId,
  limit,
  total,
  offset,
  filterCategory,
  filterRarity,
  debouncedName,
  selectedTagKeys,
  filterAllowClientUpdateQty,
  convActiveId,
  t,
  toast,
  setGameName,
  setStudioId,
  setMaxItems,
  setItemUsage,
  setGameLimits,
  setMaxEquipmentSlots,
  setEquipmentSlotsUsage,
  setLoading,
  setError,
  setItems,
  setTotal,
  setOffset,
  setUpdatingItemId,
  setConvActiveId,
  setLinkingItemId,
  setCategories,
  setRarities,
  setItemTags,
}: UseItemsCataloguePageParams) {
  const loadGameInfo = useCallback(async () => {
    try {
      const game = await getGame(gameId);
      setGameName(game.name);
      setStudioId(game.studio_id ?? "");
      setMaxItems(game.limits?.max_items ?? null);
      setItemUsage(game.usage?.items ?? null);
      setGameLimits(game.limits ?? null);
      setMaxEquipmentSlots(game.limits?.max_equipment_slots ?? null);
      setEquipmentSlotsUsage(game.usage?.equipment_slots ?? null);
    } catch {
      setLoading(false);
    }
  }, [gameId, setEquipmentSlotsUsage, setGameLimits, setGameName, setItemUsage, setLoading, setMaxEquipmentSlots, setMaxItems, setStudioId]);

  useEffect(() => {
    loadGameInfo();
  }, [loadGameInfo]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ListItemsParams = { limit, offset };
      if (filterCategory !== "all") params.category = filterCategory as ItemCategory;
      if (filterRarity !== "all") params.rarity = filterRarity as ItemRarity;
      if (selectedTagKeys.length > 0) params.tags = selectedTagKeys;
      if (filterAllowClientUpdateQty !== "all") params.allow_client_update_qty = filterAllowClientUpdateQty === "true";

      const trimmedQuery = debouncedName.trim();
      const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmedQuery);
      const isCodeLike = /^[A-Za-z0-9_-]+$/.test(trimmedQuery) && !trimmedQuery.includes("--");

      let result;
      if (!trimmedQuery) {
        result = await listItemDefinitions({ gameId }, params);
      } else if (isUuidLike) {
        result = await listItemDefinitions({ gameId }, { ...params, id: trimmedQuery });
      } else if (isCodeLike) {
        result = await listItemDefinitions({ gameId }, { ...params, item_code: trimmedQuery });
        if ((result.items?.length ?? 0) === 0) {
          result = await listItemDefinitions({ gameId }, { ...params, name: trimmedQuery });
        }
      } else {
        result = await listItemDefinitions({ gameId }, { ...params, name: trimmedQuery });
      }

      setItems(result.items ?? []);
      setTotal(result.total);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setItems([]);
        setTotal(0);
      } else {
        setError(err?.message ?? "Failed to load items");
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedName, filterAllowClientUpdateQty, filterCategory, filterRarity, gameId, limit, offset, selectedTagKeys, setError, setItems, setLoading, setTotal]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedName, filterAllowClientUpdateQty, filterCategory, filterRarity, selectedTagKeys, setOffset]);

  useEffect(() => {
    Promise.all([fetchItemCategories(), fetchItemRarities()])
      .then(([cats, rars]) => {
        setCategories(cats);
        setRarities(rars);
      })
      .catch(() => {});
  }, [setCategories, setRarities]);

  useEffect(() => {
    if (!gameId) return;
    listItemTags({ gameId }, { limit: 200, offset: 0 })
      .then((res) => setItemTags(res.tags ?? []))
      .catch(() => {});
  }, [gameId, setItemTags]);

  const handleUpdateItemField = useCallback(async (itemId: string, patch: Partial<ItemDefinition>) => {
    setUpdatingItemId(itemId);
    try {
      const updated = await updateItemDefinition({ gameId }, itemId, patch as UpdateItemRequest);
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updated.item } : item)));
      toast({ title: t("items.itemUpdated") });
    } catch (err: any) {
      toast({ variant: "destructive", title: t("items.failedToUpdateItem"), description: err?.message ?? "Unknown error" });
    } finally {
      setUpdatingItemId(null);
    }
  }, [gameId, setItems, setUpdatingItemId, t, toast]);

  const handleLinkItemToConversation = useCallback(async (item: ItemDefinition) => {
    setLinkingItemId(item.id);
    try {
      let convId: string | null = convActiveId;
      if (!convId) {
        const newConv = await createConversation(gameId, {
          title: `Item: ${item.name}`,
          goal: t("items.linkToConvGoal").replace("{name}", item.name),
        });
        convId = newConv.ID;
      }
      safeSetItem(`ss_conv_active_${gameId}`, convId);
      setConvActiveId(convId);
      await linkConversationContent(gameId, convId, "item_definition", item.id);
      window.dispatchEvent(new CustomEvent("ss:conv-external-created", { detail: { convId, gameId } }));
      window.dispatchEvent(new CustomEvent("ss:conv-content-linked", { detail: { convId, gameId, contentType: "item_definition", contentId: item.id, contentName: item.name } }));
      toast({ title: t("items.linkToConvSuccess"), description: item.name });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("items.linkToConvFailed"),
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLinkingItemId(null);
    }
  }, [convActiveId, gameId, setConvActiveId, setLinkingItemId, t, toast]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return {
    loadGameInfo,
    fetchItems,
    handleUpdateItemField,
    handleLinkItemToConversation,
    totalPages,
    currentPage,
  };
}

