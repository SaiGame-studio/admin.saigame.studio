"use client";

import Link from "next/link";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Check, Copy, ExternalLink, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { ItemDefinition } from "@/types/inventory";

type MetadataEntry = {
    key: string;
    value: string;
};

type LinkedContainerInfo = {
    id: string;
    name: string;
} | null;

type CraftRecipeInfo = Record<string, {
    name: string;
    recipe_key: string;
}>;

type GachaPackInfo = Record<string, {
    name: string;
    is_enabled: boolean;
}>;

type MetadataSectionProps = {
    item: ItemDefinition;
    gameId: string;
    editingMeta: boolean;
    saving: boolean;
    tmpMeta: MetadataEntry[];
    setTmpMeta: Dispatch<SetStateAction<MetadataEntry[]>>;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    reservedMetaKeys: string[];
    linkedContainerInfo: LinkedContainerInfo;
    craftInputIds: string[];
    craftOutputIds: string[];
    linkedPackIds: string[];
    craftRecipeInfo: CraftRecipeInfo;
    gachaPackInfo: GachaPackInfo;
};

function MetadataCopyButton({ value, id }: { value: string; id: string }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        if (navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(value);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = value;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        }

        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button id={id} type="button" onClick={copy} className="inline-flex items-center opacity-0 transition-opacity group-hover:opacity-100" title="Copy">
            {copied ? <Check className="h-3 w-3 shrink-0 text-green-500" /> : <Copy className="h-3 w-3 shrink-0 text-muted-foreground hover:text-foreground" />}
        </button>
    );
}

function formatMetadataValue(value: unknown) {
    return typeof value === "boolean" ? (value ? "true" : "false") : String(value);
}

export function MetadataSection({
    item,
    gameId,
    editingMeta,
    saving,
    tmpMeta,
    setTmpMeta,
    onStartEdit,
    onSave,
    onCancel,
    reservedMetaKeys,
    linkedContainerInfo,
    craftInputIds,
    craftOutputIds,
    linkedPackIds,
    craftRecipeInfo,
    gachaPackInfo,
}: MetadataSectionProps) {
    const { t } = useTranslation();
    const visibleMetadataEntries = Object.entries(item.metadata ?? {}).filter(([key]) => !reservedMetaKeys.includes(key));
    const hasVisibleMetadata = visibleMetadataEntries.length > 0 || item.metadata?._clone !== undefined;

    return (
        <Card id="item-metadata-card">
            <CardHeader id="item-metadata-header" className="flex flex-row items-center justify-between pb-2">
                <CardTitle id="item-metadata-title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("items.metadata")}
                </CardTitle>
                {!editingMeta ? (
                    <Button id="item-metadata-edit" size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={onStartEdit}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                ) : (
                    <div id="item-metadata-actions" className="flex gap-1">
                        <Button id="item-metadata-save" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={onSave}>
                            <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button id="item-metadata-cancel" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={onCancel}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent id="item-metadata-content">
                {item.metadata?._clone !== undefined ? (
                    <div id="item-metadata-clone" className="mb-3 space-y-1 border-b border-muted/50 pb-2">
                        <div id="item-metadata-clone-badge-row" className="ml-1 flex items-center gap-2">
                            <Badge id="item-metadata-clone-badge" variant="secondary" className="text-[11px]">
                                {t("items.cloneItemBadge")}
                            </Badge>
                        </div>
                    </div>
                ) : null}

                {linkedContainerInfo ? (
                    <div id="item-metadata-linked-container" className="mb-3 space-y-1 border-b border-muted/50 pb-2">
                        <span id="item-metadata-linked-container-label" className="font-mono text-xs text-muted-foreground">
                            linked_container_definition_id
                        </span>
                        <div id="item-metadata-linked-container-value" className="ml-1 flex items-center gap-1.5">
                            <Link
                                id="item-metadata-linked-container-link"
                                href={`/games/${gameId}/items?tab=containers&q=${linkedContainerInfo.id}`}
                                title={t("items.goToItemDef")}
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                            >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span id="item-metadata-linked-container-name" className="font-medium">
                                    {linkedContainerInfo.name || t("items.detailUnknownContainer")}
                                </span>
                                <span id="item-metadata-linked-container-id" className="font-mono text-[10px] opacity-60">
                                    {linkedContainerInfo.id.slice(0, 8)}...
                                </span>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {craftInputIds.length > 0 ? (
                    <div id="item-metadata-craft-inputs" className="mb-3 space-y-1 border-b border-muted/50 pb-2">
                        <span id="item-metadata-craft-inputs-label" className="font-mono text-xs text-muted-foreground">
                            craft_recipe_input_ids
                        </span>
                        <div id="item-metadata-craft-inputs-list" className="ml-1 flex flex-col gap-1">
                            {craftInputIds.map((recipeId, index) => {
                                const recipe = craftRecipeInfo[recipeId];

                                return (
                                    <div id={`item-metadata-craft-input-${index}`} key={recipeId} className="inline-flex items-center gap-1.5 text-xs">
                                        <Link
                                            id={`item-metadata-craft-input-link-${index}`}
                                            href={`/games/${gameId}/items?tab=crafting&expanded=${recipeId}`}
                                            title={t("items.detailOpenRecipe")}
                                            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                                        >
                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                            <span id={`item-metadata-craft-input-name-${index}`} className="font-medium">
                                                {recipe?.name || "..."}
                                            </span>
                                            <span id={`item-metadata-craft-input-id-${index}`} className="font-mono text-[10px] opacity-60">
                                                {recipeId.slice(0, 8)}...
                                            </span>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {craftOutputIds.length > 0 ? (
                    <div id="item-metadata-craft-outputs" className="mb-3 space-y-1 border-b border-muted/50 pb-2">
                        <span id="item-metadata-craft-outputs-label" className="font-mono text-xs text-muted-foreground">
                            craft_recipe_output_ids
                        </span>
                        <div id="item-metadata-craft-outputs-list" className="ml-1 flex flex-col gap-1">
                            {craftOutputIds.map((recipeId, index) => {
                                const recipe = craftRecipeInfo[recipeId];

                                return (
                                    <div id={`item-metadata-craft-output-${index}`} key={recipeId} className="inline-flex items-center gap-1.5 text-xs">
                                        <Link
                                            id={`item-metadata-craft-output-link-${index}`}
                                            href={`/games/${gameId}/items?tab=crafting&expanded=${recipeId}`}
                                            title={t("items.detailOpenRecipe")}
                                            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                                        >
                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                            <span id={`item-metadata-craft-output-name-${index}`} className="font-medium">
                                                {recipe?.name || "..."}
                                            </span>
                                            <span id={`item-metadata-craft-output-id-${index}`} className="font-mono text-[10px] opacity-60">
                                                {recipeId.slice(0, 8)}...
                                            </span>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {linkedPackIds.length > 0 ? (
                    <div id="item-metadata-gacha-packs" className="mb-3 space-y-1 border-b border-muted/50 pb-2">
                        <span id="item-metadata-gacha-packs-label" className="font-mono text-xs text-muted-foreground">
                            gacha_pack_ids
                        </span>
                        <div id="item-metadata-gacha-packs-list" className="ml-1 flex flex-col gap-1">
                            {linkedPackIds.map((packId, index) => {
                                const pack = gachaPackInfo[packId];

                                return (
                                    <div id={`item-metadata-gacha-pack-${index}`} key={packId} className="inline-flex items-center gap-1.5 text-xs">
                                        {pack ? (
                                            <span
                                                id={`item-metadata-gacha-pack-status-${index}`}
                                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${pack.is_enabled ? "border border-green-500/30 bg-green-500/15 text-green-500" : "border border-red-500/30 bg-red-500/15 text-red-500"}`}
                                            >
                                                {pack.is_enabled ? t("items.enabled") : t("items.disabled")}
                                            </span>
                                        ) : null}
                                        <Link
                                            id={`item-metadata-gacha-pack-link-${index}`}
                                            href={`/games/${gameId}/items?tab=gacha&editPack=${packId}`}
                                            title={t("items.detailOpenGachaPackEditor")}
                                            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                                        >
                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                            <span id={`item-metadata-gacha-pack-name-${index}`} className="font-medium">
                                                {pack?.name || "..."}
                                            </span>
                                            <span id={`item-metadata-gacha-pack-id-${index}`} className="font-mono text-[10px] opacity-60">
                                                {packId.slice(0, 8)}...
                                            </span>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {editingMeta ? (
                    <div id="item-metadata-editor" className="space-y-2">
                        {tmpMeta.map((entry, index) => (
                            <div id={`item-metadata-row-${index}`} key={index} className="flex items-center gap-1">
                                <Input
                                    id={`item-metadata-key-${index}`}
                                    className="h-7 flex-1 font-mono text-xs"
                                    placeholder="key"
                                    value={entry.key}
                                    onChange={(e) => {
                                        const next = [...tmpMeta];
                                        next[index] = { ...next[index], key: e.target.value };
                                        setTmpMeta(next);
                                    }}
                                />
                                <span id={`item-metadata-separator-${index}`} className="text-xs text-muted-foreground">
                                    =
                                </span>
                                <Input
                                    id={`item-metadata-value-${index}`}
                                    className="h-7 flex-1 text-xs"
                                    placeholder="value"
                                    value={entry.value}
                                    onChange={(e) => {
                                        const next = [...tmpMeta];
                                        next[index] = { ...next[index], value: e.target.value };
                                        setTmpMeta(next);
                                    }}
                                />
                                <Button
                                    id={`item-metadata-remove-${index}`}
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => setTmpMeta(tmpMeta.filter((_, itemIndex) => itemIndex !== index))}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            id="item-metadata-add"
                            size="sm"
                            variant="outline"
                            className="mt-1 h-7 w-full text-xs"
                            onClick={() => setTmpMeta([...tmpMeta, { key: "", value: "" }])}
                        >
                            <Plus className="mr-1 h-3 w-3" /> {t("items.addEntry")}
                        </Button>
                    </div>
                ) : !hasVisibleMetadata ? (
                    <p id="item-metadata-empty" className="text-sm text-muted-foreground">
                        {t("items.detailNoMetadata")}
                    </p>
                ) : (
                    <div id="item-metadata-list" className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                        {visibleMetadataEntries.map(([key, value], index) => (
                            <div id={`item-metadata-item-${index}`} key={key} className="group flex justify-between border-b border-muted/50 pb-1.5 text-sm">
                                <span id={`item-metadata-item-key-${index}`} className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                                    {key}
                                    <MetadataCopyButton id={`item-metadata-copy-${index}`} value={key} />
                                </span>
                                <span id={`item-metadata-item-value-${index}`} className="max-w-[200px] truncate text-right text-xs font-medium" title={String(value)}>
                                    {formatMetadataValue(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
