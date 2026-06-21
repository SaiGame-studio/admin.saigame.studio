"use client";

import { Badge } from "@/components/ui/badge";
import type { CloneSessionCurrentItemContainer, CloneSessionCurrentItemDefinition } from "@/lib/game-api";

type TranslationFn = (key: string) => string;

function getItemBadgeVariant(rarity?: string) {
    const normalized = (rarity ?? "").toLowerCase();

    if (normalized === "common") {
        return "outline" as const;
    }

    if (normalized === "uncommon") {
        return "secondary" as const;
    }

    if (normalized === "rare" || normalized === "epic" || normalized === "legendary") {
        return "default" as const;
    }

    return "outline" as const;
}

function getContainerTypeBadgeVariant(containerType?: string) {
    const normalized = (containerType ?? "").toLowerCase();

    if (normalized === "inventory") {
        return "default" as const;
    }

    if (normalized === "equipment") {
        return "secondary" as const;
    }

    if (normalized === "vault" || normalized === "shulker_box") {
        return "destructive" as const;
    }

    return "outline" as const;
}

export function CurrentCloneSessionItemList({ items, t }: { items: CloneSessionCurrentItemDefinition[]; t: TranslationFn; }) {
    if (items.length === 0) {
        return (
            <div id="clone-game-source-current-session-items-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    return (
        <div id="clone-game-source-current-session-items-list" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
                <div id={`clone-game-source-current-session-item-${item.id}`} key={item.id} className="rounded-md border bg-background px-3 py-2">
                    <div id={`clone-game-source-current-session-item-header-${item.id}`} className="space-y-1">
                        <div id={`clone-game-source-current-session-item-title-row-${item.id}`} className="flex items-start justify-between gap-2">
                            <p id={`clone-game-source-current-session-item-name-${item.id}`} className="font-medium">
                                {item.name}
                            </p>
                            <Badge id={`clone-game-source-current-session-item-rarity-${item.id}`} variant={getItemBadgeVariant(item.rarity)}>
                                {item.rarity || t("common.unknown")}
                            </Badge>
                        </div>
                        <p id={`clone-game-source-current-session-item-code-${item.id}`} className="font-mono text-xs text-muted-foreground">
                            {item.item_code}
                        </p>
                    </div>
                    <div id={`clone-game-source-current-session-item-meta-${item.id}`} className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div id={`clone-game-source-current-session-item-category-${item.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-category-label-${item.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemCategoryLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-category-value-${item.id}`} className="text-foreground">
                                {item.category || t("common.unknown")}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CurrentCloneSessionItemContainerList({ itemContainers, t }: { itemContainers: CloneSessionCurrentItemContainer[]; t: TranslationFn; }) {
    if (itemContainers.length === 0) {
        return (
            <div id="clone-game-source-current-session-item-containers-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    return (
        <div id="clone-game-source-current-session-item-containers-list" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {itemContainers.map((container) => (
                <div id={`clone-game-source-current-session-item-container-${container.id}`} key={container.id} className="rounded-md border bg-background px-3 py-2">
                    <div id={`clone-game-source-current-session-item-container-header-${container.id}`} className="space-y-1">
                        <div id={`clone-game-source-current-session-item-container-title-row-${container.id}`} className="flex items-start justify-between gap-2">
                            <p id={`clone-game-source-current-session-item-container-name-${container.id}`} className="font-medium">
                                {container.name}
                            </p>
                            <Badge id={`clone-game-source-current-session-item-container-type-${container.id}`} variant={getContainerTypeBadgeVariant(container.container_type)}>
                                {container.container_type || t("common.unknown")}
                            </Badge>
                        </div>
                        <p id={`clone-game-source-current-session-item-container-code-${container.id}`} className="font-mono text-xs text-muted-foreground">
                            {container.code_name}
                        </p>
                    </div>
                    <div id={`clone-game-source-current-session-item-container-meta-${container.id}`} className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div id={`clone-game-source-current-session-item-container-grid-${container.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-container-grid-label-${container.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemContainerGridLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-container-grid-value-${container.id}`} className="text-foreground">
                                {container.grid_cols} x {container.grid_rows}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-item-container-portable-${container.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-container-portable-label-${container.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemContainerPortableLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-container-portable-value-${container.id}`} className="text-foreground">
                                {container.is_portable ? t("common.yes") : t("common.no")}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-item-container-instanced-${container.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-container-instanced-label-${container.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemContainerInstancedLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-container-instanced-value-${container.id}`} className="text-foreground">
                                {container.instanced_per_item ? t("common.yes") : t("common.no")}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
