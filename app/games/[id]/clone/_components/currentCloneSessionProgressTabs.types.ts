"use client";

import type {
    CloneSessionCurrentGachaPack,
    CloneSessionCurrentEquipmentSlotDefinition,
    CloneSessionCurrentItemContainer,
    CloneSessionCurrentItemDefinition,
    CloneSessionCurrentItemTag,
    CloneSessionCurrentPresetDefinition,
    CloneSessionCurrentQuestDefinition,
    CloneSessionCurrentShopDefinition,
    CloneSessionSnapshot,
    CloneSessionCurrentCraftingRecipe,
    CloneSessionCurrentEntityDefinition,
} from "@/lib/game-api";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

export type CurrentCloneSessionProgressTabsProps = {
    t: TranslationFn;
    currentSession: CloneSessionSnapshot;
    activeProgressTab: string | null;
    onActiveProgressTabChange: (value: string) => void;
    currentSessionProgressEntries: Array<[string, { total?: number; processed?: number; completed?: boolean }]>;
    currentSessionEstimatedCost?: { currency?: string; amount?: number };
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
    itemContainersSearchInput: string;
    itemContainersSearchName: string;
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
    equipmentSlotDefinitions: CloneSessionCurrentEquipmentSlotDefinition[];
    equipmentSlotDefinitionsTotal: number;
    equipmentSlotDefinitionsOffset: number;
    equipmentSlotDefinitionsSearchInput: string;
    equipmentSlotDefinitionsSearchName: string;
    equipmentSlotDefinitionsLoading: boolean;
    equipmentSlotDefinitionsError: string | null;
    onEquipmentSlotDefinitionsSearchInputChange: (value: string) => void;
    onEquipmentSlotDefinitionsSearch: () => void;
    onEquipmentSlotDefinitionsClearSearch: () => void;
    onEquipmentSlotDefinitionsPreviousPage: () => void;
    onEquipmentSlotDefinitionsNextPage: () => void;
    quests: CloneSessionCurrentQuestDefinition[];
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
    shopDefinitions: CloneSessionCurrentShopDefinition[];
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
    presetDefinitions: CloneSessionCurrentPresetDefinition[];
    presetDefinitionsTotal: number;
    presetDefinitionsOffset: number;
    presetDefinitionsSearchInput: string;
    presetDefinitionsSearchName: string;
    presetDefinitionsLoading: boolean;
    presetDefinitionsError: string | null;
    onPresetDefinitionsSearchInputChange: (value: string) => void;
    onPresetDefinitionsSearch: () => void;
    onPresetDefinitionsClearSearch: () => void;
    onPresetDefinitionsPreviousPage: () => void;
    onPresetDefinitionsNextPage: () => void;
    gachaPacks: CloneSessionCurrentGachaPack[];
    gachaPacksSessionId?: string;
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
    craftingRecipes: CloneSessionCurrentCraftingRecipe[];
    craftingRecipesTotal: number;
    craftingRecipesOffset: number;
    craftingRecipesSearchInput: string;
    craftingRecipesSearchName: string;
    craftingRecipesLoading: boolean;
    craftingRecipesError: string | null;
    onCraftingRecipesSearchInputChange: (value: string) => void;
    onCraftingRecipesSearch: () => void;
    onCraftingRecipesClearSearch: () => void;
    onCraftingRecipesPreviousPage: () => void;
    onCraftingRecipesNextPage: () => void;
    entityDefinitions: CloneSessionCurrentEntityDefinition[];
    entityDefinitionsTotal: number;
    entityDefinitionsOffset: number;
    entityDefinitionsSearchInput: string;
    entityDefinitionsSearchName: string;
    entityDefinitionsLoading: boolean;
    entityDefinitionsError: string | null;
    onEntityDefinitionsSearchInputChange: (value: string) => void;
    onEntityDefinitionsSearch: () => void;
    onEntityDefinitionsClearSearch: () => void;
    onEntityDefinitionsPreviousPage: () => void;
    onEntityDefinitionsNextPage: () => void;
    getManualOverwriteTargetId: (
        contentType: "item_definition" | "item_container_definition" | "equipment_slot_definition" | "item_tag" | "quest_definition" | "shop_definition" | "preset_definition" | "crafting_recipe" | "entity_definition",
        sourceId: string,
    ) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};
