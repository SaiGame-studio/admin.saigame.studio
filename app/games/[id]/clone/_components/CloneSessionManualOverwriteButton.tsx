"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { createCloneSessionManualOverwritePair, type CloneSessionIgnoreContentType } from "@/lib/game-api";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

type CloneSessionManualOverwriteButtonProps = {
    id: string;
    sessionId?: string;
    contentType: CloneSessionIgnoreContentType;
    sourceId: string;
    targetId?: string | null;
    t: TranslationFn;
    onSuccess?: () => Promise<void>;
};

export function CloneSessionManualOverwriteButton({
    id,
    sessionId,
    contentType,
    sourceId,
    targetId,
    t,
    onSuccess,
}: CloneSessionManualOverwriteButtonProps) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    if (!targetId) {
        return null;
    }

    const handleClick = async () => {
        if (!sessionId || saving) {
            return;
        }

        setSaving(true);
        setError(false);

        try {
            setOpen(false);
            await createCloneSessionManualOverwritePair(sessionId, {
                content_type: contentType,
                source_id: sourceId,
                target_id: targetId,
            });

            await onSuccess?.();
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id={`${id}-wrap`} className="flex flex-col items-start gap-1">
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!sessionId || saving}
                        className="h-7 border-amber-500/40 bg-amber-500/10 px-2 text-xs text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
                    >
                        {saving ? <Loader2 id={`${id}-loading-icon`} className="h-3.5 w-3.5 animate-spin" /> : null}
                        {saving ? t("common.loading") : t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent id={`${id}-confirm-dialog`}>
                    <AlertDialogHeader id={`${id}-confirm-dialog-header`}>
                        <AlertDialogTitle id={`${id}-confirm-dialog-title`}>
                            {t("cloneGame.sourceGameCurrentSessionOverwriteConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription id={`${id}-confirm-dialog-description`}>
                            {t("cloneGame.sourceGameCurrentSessionOverwriteConfirmDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter id={`${id}-confirm-dialog-footer`}>
                        <AlertDialogCancel id={`${id}-confirm-dialog-cancel`}>
                            {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            id={`${id}-confirm-dialog-confirm`}
                            onClick={(event) => {
                                event.preventDefault();
                                void handleClick();
                            }}
                            className="bg-amber-600 text-white hover:bg-amber-500"
                        >
                            {saving ? t("common.loading") : t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {error ? (
                <span id={`${id}-error`} className="text-[10px] text-destructive">
                    {t("common.error")}
                </span>
            ) : null}
        </div>
    );
}
