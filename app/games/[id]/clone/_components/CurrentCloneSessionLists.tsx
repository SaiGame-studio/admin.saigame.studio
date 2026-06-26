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
        <div id="clone-game-source-current-session-items-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-items-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-items-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-items-table-head-row">
                        <th id="clone-game-source-current-session-items-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-items-table-code-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionCodeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-items-table-rarity-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemRarityLabel")}
                        </th>
                        <th id="clone-game-source-current-session-items-table-category-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemCategoryLabel")}
                        </th>
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-items-table-body">
                    {items.map((item) => (
                        <tr id={`clone-game-source-current-session-item-row-${item.id}`} key={item.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td id={`clone-game-source-current-session-item-name-cell-${item.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-name-${item.id}`} className="font-medium">
                                    {item.name}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-code-cell-${item.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-code-${item.id}`} className="font-mono text-xs text-muted-foreground">
                                    {item.item_code}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-rarity-cell-${item.id}`} className="px-3 py-2 align-middle">
                                <Badge id={`clone-game-source-current-session-item-rarity-${item.id}`} variant={getItemBadgeVariant(item.rarity)}>
                                    {item.rarity || t("common.unknown")}
                                </Badge>
                            </td>
                            <td id={`clone-game-source-current-session-item-category-cell-${item.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-category-value-${item.id}`}>
                                    {item.category || t("common.unknown")}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
        <div id="clone-game-source-current-session-item-containers-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-item-containers-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-item-containers-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-item-containers-table-head-row">
                        <th id="clone-game-source-current-session-item-containers-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-containers-table-code-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionCodeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-containers-table-type-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemContainerTypeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-containers-table-grid-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemContainerGridLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-containers-table-portable-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemContainerPortableLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-containers-table-instanced-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemContainerInstancedLabel")}
                        </th>
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-item-containers-table-body">
                    {itemContainers.map((container) => (
                        <tr id={`clone-game-source-current-session-item-container-row-${container.id}`} key={container.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td id={`clone-game-source-current-session-item-container-name-cell-${container.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-container-name-${container.id}`} className="font-medium">
                                    {container.name}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-container-code-cell-${container.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-container-code-${container.id}`} className="font-mono text-xs text-muted-foreground">
                                    {container.code_name}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-container-type-cell-${container.id}`} className="px-3 py-2 align-middle">
                                <Badge id={`clone-game-source-current-session-item-container-type-${container.id}`} variant={getContainerTypeBadgeVariant(container.container_type)}>
                                    {container.container_type || t("common.unknown")}
                                </Badge>
                            </td>
                            <td id={`clone-game-source-current-session-item-container-grid-cell-${container.id}`} className="px-3 py-2 align-middle tabular-nums">
                                <span id={`clone-game-source-current-session-item-container-grid-value-${container.id}`}>
                                    {container.grid_cols} x {container.grid_rows}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-container-portable-cell-${container.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-container-portable-value-${container.id}`}>
                                    {container.is_portable ? t("common.yes") : t("common.no")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-container-instanced-cell-${container.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-container-instanced-value-${container.id}`}>
                                    {container.instanced_per_item ? t("common.yes") : t("common.no")}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
