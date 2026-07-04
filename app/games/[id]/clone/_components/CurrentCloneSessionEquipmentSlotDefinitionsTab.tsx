"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentEquipmentSlotDefinition } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionEquipmentSlotDefinitionsTabProps = {
    t: TranslationFn;
    equipmentSlotDefinitions: CloneSessionCurrentEquipmentSlotDefinition[];
    sessionId?: string;
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
    getManualOverwriteTargetId: (contentType: "equipment_slot_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};

const EQUIPMENT_SLOT_DEFINITIONS_PAGE_SIZE = 12;

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

function getAllowedCategoriesLabel(slot: CloneSessionCurrentEquipmentSlotDefinition, t: TranslationFn) {
    if (!Array.isArray(slot.allowed_categories) || slot.allowed_categories.length === 0) {
        return t("common.none");
    }

    return slot.allowed_categories.join(", ");
}

function getAllowedItemDefinitionsCount(slot: CloneSessionCurrentEquipmentSlotDefinition) {
    return Array.isArray(slot.allowed_item_definition_ids) ? slot.allowed_item_definition_ids.length : 0;
}

function CurrentCloneSessionEquipmentSlotDefinitionList({
    equipmentSlotDefinitions,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    equipmentSlotDefinitions: CloneSessionCurrentEquipmentSlotDefinition[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "equipment_slot_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (equipmentSlotDefinitions.length === 0) {
        return (
            <div id="clone-game-source-current-session-equipment-slot-definitions-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(
        equipmentSlotDefinitions.map((slotDefinition) => [slotDefinition.id, getManualOverwriteTargetId("equipment_slot_definition", slotDefinition.id)]),
    );
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-equipment-slot-definitions-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-equipment-slot-definitions-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-equipment-slot-definitions-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-equipment-slot-definitions-table-head-row">
                        <th id="clone-game-source-current-session-equipment-slot-definitions-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-equipment-slot-definitions-table-slot-key-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionEquipmentSlotKeyLabel")}
                        </th>
                        <th id="clone-game-source-current-session-equipment-slot-definitions-table-categories-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionEquipmentAllowedCategoriesLabel")}
                        </th>
                        <th id="clone-game-source-current-session-equipment-slot-definitions-table-items-head" className="h-9 px-3 text-right align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionEquipmentAllowedItemsLabel")}
                        </th>
                        <th id="clone-game-source-current-session-equipment-slot-definitions-table-status-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionEquipmentStatusLabel")}
                        </th>
                        <th id="clone-game-source-current-session-equipment-slot-definitions-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}
                        </th>
                        <th id="clone-game-source-current-session-equipment-slot-definitions-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-equipment-slot-definitions-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-equipment-slot-definitions-table-body">
                    {equipmentSlotDefinitions.map((slotDefinition) => {
                        const overwriteTargetId = overwriteTargetIds.get(slotDefinition.id) ?? null;

                        return (
                            <tr id={`clone-game-source-current-session-equipment-slot-definition-row-${slotDefinition.id}`} key={slotDefinition.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                <td id={`clone-game-source-current-session-equipment-slot-definition-name-cell-${slotDefinition.id}`} className="px-3 py-2 align-middle">
                                    <div id={`clone-game-source-current-session-equipment-slot-definition-name-wrap-${slotDefinition.id}`} className="space-y-1">
                                        <span id={`clone-game-source-current-session-equipment-slot-definition-name-${slotDefinition.id}`} className="font-medium">
                                            {slotDefinition.name}
                                        </span>
                                        {slotDefinition.description ? (
                                            <p id={`clone-game-source-current-session-equipment-slot-definition-description-${slotDefinition.id}`} className="text-xs text-muted-foreground">
                                                {slotDefinition.description}
                                            </p>
                                        ) : null}
                                    </div>
                                </td>
                                <td id={`clone-game-source-current-session-equipment-slot-definition-slot-key-cell-${slotDefinition.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-equipment-slot-definition-slot-key-${slotDefinition.id}`} className="font-mono text-xs text-muted-foreground">
                                        {slotDefinition.slot_key || t("common.unknown")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-equipment-slot-definition-categories-cell-${slotDefinition.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-equipment-slot-definition-categories-${slotDefinition.id}`} className="text-xs text-muted-foreground">
                                        {getAllowedCategoriesLabel(slotDefinition, t)}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-equipment-slot-definition-items-cell-${slotDefinition.id}`} className="px-3 py-2 text-right align-middle tabular-nums">
                                    <span id={`clone-game-source-current-session-equipment-slot-definition-items-${slotDefinition.id}`}>
                                        {getAllowedItemDefinitionsCount(slotDefinition).toLocaleString("en-US")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-equipment-slot-definition-status-cell-${slotDefinition.id}`} className="px-3 py-2 align-middle">
                                    <Badge id={`clone-game-source-current-session-equipment-slot-definition-status-${slotDefinition.id}`} variant={slotDefinition.is_active ? "default" : "secondary"}>
                                        {slotDefinition.is_active ? t("common.active") : t("common.inactive")}
                                    </Badge>
                                </td>
                                <td id={`clone-game-source-current-session-equipment-slot-definition-previously-cloned-cell-${slotDefinition.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionPreviouslyClonedStatus
                                        id={`clone-game-source-current-session-equipment-slot-definition-previously-cloned-${slotDefinition.id}`}
                                        iconId={`clone-game-source-current-session-equipment-slot-definition-previously-cloned-icon-${slotDefinition.id}`}
                                        labelId={`clone-game-source-current-session-equipment-slot-definition-previously-cloned-label-${slotDefinition.id}`}
                                        previouslyCloned={slotDefinition.previously_cloned}
                                        t={t}
                                    />
                                </td>
                                <td id={`clone-game-source-current-session-equipment-slot-definition-ignore-cell-${slotDefinition.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionIgnoreSwitch
                                        id={`clone-game-source-current-session-equipment-slot-definition-ignore-${slotDefinition.id}`}
                                        sessionId={sessionId}
                                        contentType="equipment_slot_definition"
                                        sourceId={slotDefinition.id}
                                        initialIgnored={isIgnored(slotDefinition)}
                                        t={t}
                                    />
                                </td>
                                {hasOverwriteColumn ? (
                                    <td id={`clone-game-source-current-session-equipment-slot-definition-overwrite-cell-${slotDefinition.id}`} className="px-3 py-2 align-middle">
                                        <CloneSessionManualOverwriteButton
                                            id={`clone-game-source-current-session-equipment-slot-definition-overwrite-${slotDefinition.id}`}
                                            sessionId={sessionId}
                                            contentType="equipment_slot_definition"
                                            sourceId={slotDefinition.id}
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

export function CurrentCloneSessionEquipmentSlotDefinitionsTab({
    t,
    equipmentSlotDefinitions,
    sessionId,
    equipmentSlotDefinitionsTotal,
    equipmentSlotDefinitionsOffset,
    equipmentSlotDefinitionsSearchInput,
    equipmentSlotDefinitionsSearchName,
    equipmentSlotDefinitionsLoading,
    equipmentSlotDefinitionsError,
    onEquipmentSlotDefinitionsSearchInputChange,
    onEquipmentSlotDefinitionsSearch,
    onEquipmentSlotDefinitionsClearSearch,
    onEquipmentSlotDefinitionsPreviousPage,
    onEquipmentSlotDefinitionsNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionEquipmentSlotDefinitionsTabProps) {
    const currentPage = equipmentSlotDefinitionsTotal > 0 ? Math.floor(equipmentSlotDefinitionsOffset / EQUIPMENT_SLOT_DEFINITIONS_PAGE_SIZE) + 1 : 0;
    const totalPages = equipmentSlotDefinitionsTotal > 0 ? Math.ceil(equipmentSlotDefinitionsTotal / EQUIPMENT_SLOT_DEFINITIONS_PAGE_SIZE) : 0;
    const start = equipmentSlotDefinitionsTotal > 0 ? equipmentSlotDefinitionsOffset + 1 : 0;
    const end = equipmentSlotDefinitionsTotal > 0 ? Math.min(equipmentSlotDefinitionsOffset + EQUIPMENT_SLOT_DEFINITIONS_PAGE_SIZE, equipmentSlotDefinitionsTotal) : 0;
    const hasPreviousPage = equipmentSlotDefinitionsOffset > 0;
    const hasNextPage = equipmentSlotDefinitionsOffset + EQUIPMENT_SLOT_DEFINITIONS_PAGE_SIZE < equipmentSlotDefinitionsTotal;

    return (
        <div id="clone-game-source-current-session-equipment-slot-definitions-section" className="space-y-3">
            <div id="clone-game-source-current-session-equipment-slot-definitions-controls" className="space-y-2">
                <div id="clone-game-source-current-session-equipment-slot-definitions-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-equipment-slot-definitions-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-equipment-slot-definitions-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-equipment-slot-definitions-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-equipment-slot-definitions-search-input"
                                value={equipmentSlotDefinitionsSearchInput}
                                onChange={(event) => onEquipmentSlotDefinitionsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onEquipmentSlotDefinitionsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionEquipmentSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {equipmentSlotDefinitionsSearchInput || equipmentSlotDefinitionsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-equipment-slot-definitions-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onEquipmentSlotDefinitionsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-equipment-slot-definitions-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-equipment-slot-definitions-search-btn"
                        type="button"
                        onClick={onEquipmentSlotDefinitionsSearch}
                        disabled={equipmentSlotDefinitionsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-equipment-slot-definitions-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-equipment-slot-definitions-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-equipment-slot-definitions-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onEquipmentSlotDefinitionsPreviousPage}
                                disabled={!hasPreviousPage || equipmentSlotDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-equipment-slot-definitions-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-equipment-slot-definitions-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-equipment-slot-definitions-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentPage, totalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-equipment-slot-definitions-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onEquipmentSlotDefinitionsNextPage}
                                disabled={!hasNextPage || equipmentSlotDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-equipment-slot-definitions-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-equipment-slot-definitions-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-equipment-slot-definitions-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(start, end, equipmentSlotDefinitionsTotal)}
                        </p>
                        <CurrentCloneSessionTableRefreshButton
                            id="clone-game-source-current-session-equipment-slot-definitions-refresh-btn"
                            iconId="clone-game-source-current-session-equipment-slot-definitions-refresh-icon"
                            loading={equipmentSlotDefinitionsLoading}
                            t={t}
                            onRefresh={onManualOverwriteSuccess}
                        />
                    </div>
                </div>
            </div>

            {equipmentSlotDefinitionsLoading ? (
                <div id="clone-game-source-current-session-equipment-slot-definitions-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-equipment-slot-definitions-loading-header" className="grid min-w-[1040px] grid-cols-[1.5fr_1.2fr_1.3fr_0.7fr_0.8fr_0.8fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-equipment-slot-definition-skeleton-head-${index}`} key={`clone-game-source-current-session-equipment-slot-definition-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-equipment-slot-definition-skeleton-row-${index}`} key={`clone-game-source-current-session-equipment-slot-definition-skeleton-row-${index}`} className="grid min-w-[1040px] grid-cols-[1.5fr_1.2fr_1.3fr_0.7fr_0.8fr_0.8fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-equipment-slot-definition-skeleton-name-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-equipment-slot-definition-skeleton-slot-key-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-equipment-slot-definition-skeleton-categories-${index}`} className="h-4 w-4/5" />
                            <Skeleton id={`clone-game-source-current-session-equipment-slot-definition-skeleton-items-${index}`} className="ml-auto h-4 w-10" />
                            <Skeleton id={`clone-game-source-current-session-equipment-slot-definition-skeleton-status-${index}`} className="h-4 w-14" />
                            <Skeleton id={`clone-game-source-current-session-equipment-slot-definition-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-equipment-slot-definition-skeleton-overwrite-${index}`} className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            ) : equipmentSlotDefinitionsError ? (
                <div id="clone-game-source-current-session-equipment-slot-definitions-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {equipmentSlotDefinitionsError}
                </div>
            ) : (
                <CurrentCloneSessionEquipmentSlotDefinitionList
                    equipmentSlotDefinitions={equipmentSlotDefinitions}
                    sessionId={sessionId}
                    t={t}
                    getManualOverwriteTargetId={getManualOverwriteTargetId}
                    onManualOverwriteSuccess={onManualOverwriteSuccess}
                />
            )}
        </div>
    );
}
