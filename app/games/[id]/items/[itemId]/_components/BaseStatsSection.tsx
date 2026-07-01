"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Check, Copy, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { ItemDefinition } from "@/types/inventory";

type BaseStatEntry = {
    key: string;
    value: string;
};

type BaseStatsSectionProps = {
    item: ItemDefinition;
    editingStats: boolean;
    tmpStats: BaseStatEntry[];
    setTmpStats: Dispatch<SetStateAction<BaseStatEntry[]>>;
    saving: boolean;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
};

function formatBaseStatValue(value: unknown) {
    const numericValue = typeof value === "number" ? value : Number(value);

    if (Number.isFinite(numericValue)) {
        return numericValue.toLocaleString();
    }

    return String(value);
}

function BaseStatsCopyButton({ value }: { value: string }) {
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
        <button
            id={`item-base-stats-copy-${value}`}
            type="button"
            onClick={copy}
            className="inline-flex items-center opacity-0 transition-opacity group-hover:opacity-100"
            title="Copy"
        >
            {copied ? (
                <Check className="h-3 w-3 shrink-0 text-green-500" />
            ) : (
                <Copy className="h-3 w-3 shrink-0 text-muted-foreground hover:text-foreground" />
            )}
        </button>
    );
}

export function BaseStatsSection({
    item,
    editingStats,
    tmpStats,
    setTmpStats,
    saving,
    onStartEdit,
    onSave,
    onCancel,
}: BaseStatsSectionProps) {
    const { t } = useTranslation();

    return (
        <Card id="item-base-stats-card">
            <CardHeader id="item-base-stats-header" className="flex flex-row items-center justify-between pb-2">
                <CardTitle id="item-base-stats-title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("items.baseStats")}
                </CardTitle>
                {!editingStats ? (
                    <Button id="item-base-stats-edit" size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={onStartEdit}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                ) : (
                    <div id="item-base-stats-actions" className="flex gap-1">
                        <Button id="item-base-stats-save" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={onSave}>
                            <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button id="item-base-stats-cancel" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={onCancel}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent id="item-base-stats-content">
                {editingStats ? (
                    <div id="item-base-stats-editor" className="space-y-2">
                        {tmpStats.map((entry, i) => (
                            <div id={`item-base-stats-row-${i}`} key={i} className="flex items-center gap-1">
                                <Input
                                    id={`item-base-stats-key-${i}`}
                                    className="h-7 flex-1 text-xs"
                                    placeholder="key"
                                    value={entry.key}
                                    onChange={(e) => {
                                        const next = [...tmpStats];
                                        next[i] = { ...next[i], key: e.target.value };
                                        setTmpStats(next);
                                    }}
                                />
                                <span id={`item-base-stats-separator-${i}`} className="text-xs text-muted-foreground">
                                    =
                                </span>
                                <Input
                                    id={`item-base-stats-value-${i}`}
                                    className="h-7 w-20 text-xs"
                                    placeholder="0"
                                    type="number"
                                    value={entry.value}
                                    onChange={(e) => {
                                        const next = [...tmpStats];
                                        next[i] = { ...next[i], value: e.target.value };
                                        setTmpStats(next);
                                    }}
                                />
                                <Button
                                    id={`item-base-stats-remove-${i}`}
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => setTmpStats(tmpStats.filter((_, j) => j !== i))}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            id="item-base-stats-add"
                            size="sm"
                            variant="outline"
                            className="mt-1 h-7 w-full text-xs"
                            onClick={() => setTmpStats([...tmpStats, { key: "", value: "0" }])}
                        >
                            <Plus className="mr-1 h-3 w-3" /> {t("items.detailAddStat")}
                        </Button>
                    </div>
                ) : Object.keys(item.base_stats ?? {}).length === 0 ? (
                    <p id="item-base-stats-empty" className="text-sm text-muted-foreground">
                        {t("items.detailNoBaseStats")}
                    </p>
                ) : (
                    <div id="item-base-stats-list" className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                        {Object.entries(item.base_stats).map(([key, value]) => (
                            <div id={`item-base-stats-item-${key}`} key={key} className="group flex justify-between border-b border-muted/50 pb-1.5 text-sm">
                                <span id={`item-base-stats-item-key-${key}`} className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                                    {key}
                                    <BaseStatsCopyButton value={key} />
                                </span>
                                <span id={`item-base-stats-item-value-${key}`} className="text-xs font-semibold">
                                    {formatBaseStatValue(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
