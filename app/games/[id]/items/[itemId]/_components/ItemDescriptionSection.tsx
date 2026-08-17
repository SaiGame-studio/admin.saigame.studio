"use client";

import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ItemDescriptionSectionProps = {
    itemId: string;
    description: string;
    saving: boolean;
    onSave: (description: string) => Promise<boolean>;
    t: (key: string) => string;
};

export function ItemDescriptionSection({ itemId, description, saving, onSave, t }: ItemDescriptionSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(description);

    useEffect(() => {
        if (!isEditing)
            setDraft(description);
    }, [description, isEditing]);

    async function handleSave() {
        if (await onSave(draft))
            setIsEditing(false);
    }

    return (
        <section id={`item-description-${itemId}`} className="border-t border-muted/50 pt-3 space-y-2">
            <div id={`item-description-${itemId}-header`} className="flex items-center justify-between gap-3">
                <span id={`item-description-${itemId}-label`} className="text-muted-foreground">
                    {t("items.description")}
                </span>
                {!isEditing && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button id={`item-description-${itemId}-edit-btn`} size="icon" variant="outline" className="h-6 w-6" aria-label={t("common.edit")} onClick={() => setIsEditing(true)}>
                                    <Pencil id={`item-description-${itemId}-edit-icon`} className="h-3 w-3"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent id={`item-description-${itemId}-edit-tooltip`} side="top">
                                {t("common.edit")}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            {isEditing ? (
                <div id={`item-description-${itemId}-editor`} className="space-y-2">
                    <Textarea id={`item-description-${itemId}-input`} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={saving} rows={4} autoFocus/>
                    <div id={`item-description-${itemId}-actions`} className="flex justify-end gap-2">
                        <Button id={`item-description-${itemId}-cancel-btn`} size="sm" variant="outline" disabled={saving} onClick={() => {
                            setDraft(description);
                            setIsEditing(false);
                        }}>
                            <X id={`item-description-${itemId}-cancel-icon`} className="h-3.5 w-3.5"/>
                            {t("common.cancel")}
                        </Button>
                        <Button id={`item-description-${itemId}-save-btn`} size="sm" disabled={saving} onClick={handleSave}>
                            <Save id={`item-description-${itemId}-save-icon`} className="h-3.5 w-3.5"/>
                            {t("common.save")}
                        </Button>
                    </div>
                </div>
            ) : (
                <p id={`item-description-${itemId}-value`} className="whitespace-pre-wrap text-sm">
                    {description || "—"}
                </p>
            )}
        </section>
    );
}
