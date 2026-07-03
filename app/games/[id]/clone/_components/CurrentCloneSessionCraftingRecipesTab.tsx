"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentCraftingRecipe } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionCraftingRecipesTabProps = {
    t: TranslationFn;
    craftingRecipes: CloneSessionCurrentCraftingRecipe[];
    sessionId?: string;
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
    getManualOverwriteTargetId: (contentType: "crafting_recipe", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};

const CRAFTING_RECIPES_PAGE_SIZE = 12;

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

function isIgnored(value: { ignored?: boolean; is_ignored?: boolean }) {
    return Boolean(value.ignored ?? value.is_ignored);
}

function CurrentCloneSessionCraftingRecipeList({
    craftingRecipes,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    craftingRecipes: CloneSessionCurrentCraftingRecipe[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "crafting_recipe", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (craftingRecipes.length === 0) {
        return (
            <div id="clone-game-source-current-session-crafting-recipes-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(
        craftingRecipes.map((recipe) => [recipe.id, getManualOverwriteTargetId("crafting_recipe", recipe.id)]),
    );
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-crafting-recipes-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-crafting-recipes-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-crafting-recipes-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-crafting-recipes-table-head-row">
                        <th id="clone-game-source-current-session-crafting-recipes-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-crafting-recipes-table-recipe-key-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionCraftingRecipeKeyLabel")}
                        </th>
                        <th id="clone-game-source-current-session-crafting-recipes-table-category-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionCategoryLabel")}
                        </th>
                        <th id="clone-game-source-current-session-crafting-recipes-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}
                        </th>
                        <th id="clone-game-source-current-session-crafting-recipes-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-crafting-recipes-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-crafting-recipes-table-body">
                    {craftingRecipes.map((recipe) => {
                        const overwriteTargetId = overwriteTargetIds.get(recipe.id) ?? null;

                        return (
                            <tr id={`clone-game-source-current-session-crafting-recipe-row-${recipe.id}`} key={recipe.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                <td id={`clone-game-source-current-session-crafting-recipe-name-cell-${recipe.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-crafting-recipe-name-${recipe.id}`} className="font-medium">
                                        {recipe.name}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-crafting-recipe-recipe-key-cell-${recipe.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-crafting-recipe-recipe-key-${recipe.id}`} className="font-mono text-xs text-muted-foreground">
                                        {recipe.recipe_key || t("common.unknown")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-crafting-recipe-category-cell-${recipe.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-crafting-recipe-category-${recipe.id}`} className="text-xs text-muted-foreground">
                                        {recipe.category || t("common.none")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-crafting-recipe-previously-cloned-cell-${recipe.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionPreviouslyClonedStatus
                                        id={`clone-game-source-current-session-crafting-recipe-previously-cloned-${recipe.id}`}
                                        iconId={`clone-game-source-current-session-crafting-recipe-previously-cloned-icon-${recipe.id}`}
                                        labelId={`clone-game-source-current-session-crafting-recipe-previously-cloned-label-${recipe.id}`}
                                        previouslyCloned={recipe.previously_cloned}
                                        t={t}
                                    />
                                </td>
                                <td id={`clone-game-source-current-session-crafting-recipe-ignore-cell-${recipe.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionIgnoreSwitch
                                        id={`clone-game-source-current-session-crafting-recipe-ignore-${recipe.id}`}
                                        sessionId={sessionId}
                                        contentType="crafting_recipe"
                                        sourceId={recipe.id}
                                        initialIgnored={isIgnored(recipe)}
                                        t={t}
                                    />
                                </td>
                                {hasOverwriteColumn ? (
                                    <td id={`clone-game-source-current-session-crafting-recipe-overwrite-cell-${recipe.id}`} className="px-3 py-2 align-middle">
                                        <CloneSessionManualOverwriteButton
                                            id={`clone-game-source-current-session-crafting-recipe-overwrite-${recipe.id}`}
                                            sessionId={sessionId}
                                            contentType="crafting_recipe"
                                            sourceId={recipe.id}
                                            targetId={overwriteTargetId}
                                            t={t}
                                            onSuccess={onManualOverwriteSuccess}
                                        />
                                    </td>
                                ) : null}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function CurrentCloneSessionCraftingRecipesTab({
    t,
    craftingRecipes,
    sessionId,
    craftingRecipesTotal,
    craftingRecipesOffset,
    craftingRecipesSearchInput,
    craftingRecipesSearchName,
    craftingRecipesLoading,
    craftingRecipesError,
    onCraftingRecipesSearchInputChange,
    onCraftingRecipesSearch,
    onCraftingRecipesClearSearch,
    onCraftingRecipesPreviousPage,
    onCraftingRecipesNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionCraftingRecipesTabProps) {
    const currentCraftingRecipesCurrentPage = craftingRecipesTotal > 0 ? Math.floor(craftingRecipesOffset / CRAFTING_RECIPES_PAGE_SIZE) + 1 : 0;
    const currentCraftingRecipesTotalPages = craftingRecipesTotal > 0 ? Math.ceil(craftingRecipesTotal / CRAFTING_RECIPES_PAGE_SIZE) : 0;
    const currentCraftingRecipesStart = craftingRecipesTotal > 0 ? craftingRecipesOffset + 1 : 0;
    const currentCraftingRecipesEnd = craftingRecipesTotal > 0 ? Math.min(craftingRecipesOffset + CRAFTING_RECIPES_PAGE_SIZE, craftingRecipesTotal) : 0;
    const hasPreviousCraftingRecipesPage = craftingRecipesOffset > 0;
    const hasNextCraftingRecipesPage = craftingRecipesOffset + CRAFTING_RECIPES_PAGE_SIZE < craftingRecipesTotal;

    return (
        <div id="clone-game-source-current-session-crafting-recipes-section" className="space-y-3">
            <div id="clone-game-source-current-session-crafting-recipes-controls" className="space-y-2">
                <div id="clone-game-source-current-session-crafting-recipes-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-crafting-recipes-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-crafting-recipes-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-crafting-recipes-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-crafting-recipes-search-input"
                                value={craftingRecipesSearchInput}
                                onChange={(event) => onCraftingRecipesSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onCraftingRecipesSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionCraftingRecipeSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {craftingRecipesSearchInput || craftingRecipesSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-crafting-recipes-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onCraftingRecipesClearSearch}
                                >
                                    <X id="clone-game-source-current-session-crafting-recipes-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-crafting-recipes-search-btn"
                        type="button"
                        onClick={onCraftingRecipesSearch}
                        disabled={craftingRecipesLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-crafting-recipes-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-crafting-recipes-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-crafting-recipes-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onCraftingRecipesPreviousPage}
                                disabled={!hasPreviousCraftingRecipesPage || craftingRecipesLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-crafting-recipes-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-crafting-recipes-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-crafting-recipes-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentCraftingRecipesCurrentPage, currentCraftingRecipesTotalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-crafting-recipes-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onCraftingRecipesNextPage}
                                disabled={!hasNextCraftingRecipesPage || craftingRecipesLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-crafting-recipes-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-crafting-recipes-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-crafting-recipes-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(currentCraftingRecipesStart, currentCraftingRecipesEnd, craftingRecipesTotal)}
                        </p>
                        <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-crafting-recipes-refresh-btn" iconId="clone-game-source-current-session-crafting-recipes-refresh-icon" loading={craftingRecipesLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                    </div>
                </div>
            </div>

            {craftingRecipesLoading ? (
                <div id="clone-game-source-current-session-crafting-recipes-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-crafting-recipes-loading-header" className="grid min-w-[700px] grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-crafting-recipe-skeleton-head-${index}`} key={`clone-game-source-current-session-crafting-recipe-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-crafting-recipe-skeleton-row-${index}`} key={`clone-game-source-current-session-crafting-recipe-skeleton-row-${index}`} className="grid min-w-[700px] grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-crafting-recipe-skeleton-name-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-crafting-recipe-skeleton-key-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-crafting-recipe-skeleton-category-${index}`} className="h-4 w-20" />
                            <Skeleton id={`clone-game-source-current-session-crafting-recipe-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-crafting-recipe-skeleton-ignore-${index}`} className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            ) : craftingRecipesError ? (
                <div id="clone-game-source-current-session-crafting-recipes-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {craftingRecipesError}
                </div>
            ) : (
                <CurrentCloneSessionCraftingRecipeList craftingRecipes={craftingRecipes} sessionId={sessionId} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId as any} onManualOverwriteSuccess={onManualOverwriteSuccess} />
            )}
        </div>
    );
}
