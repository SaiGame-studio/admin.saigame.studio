"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { updateCloneSessionRunOptions } from "@/lib/game-api";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

type CloneSessionRunOptionsSwitchProps = {
    id: string;
    sessionId?: string;
    initialChecked?: boolean;
    disabled?: boolean;
    t: TranslationFn;
    onUpdated?: () => Promise<void>;
};

export function CloneSessionRunOptionsSwitch({
    id,
    sessionId,
    initialChecked,
    disabled,
    t,
    onUpdated,
}: CloneSessionRunOptionsSwitchProps) {
    const [checked, setChecked] = useState(Boolean(initialChecked));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setChecked(Boolean(initialChecked));
    }, [initialChecked]);

    const handleChange = async (nextChecked: boolean) => {
        if (!sessionId || saving) {
            return;
        }

        const previousChecked = checked;
        setChecked(nextChecked);
        setSaving(true);
        setError(false);

        try {
            await updateCloneSessionRunOptions(sessionId, {
                overwrite_all_conflicting_codes: nextChecked,
            });

            await onUpdated?.();
        } catch {
            setChecked(previousChecked);
            setError(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id={`${id}-wrap`} className="flex flex-wrap items-center gap-2">
            <div id={`${id}-control-wrap`} className="flex items-center gap-2">
                <Switch
                    id={id}
                    checked={checked}
                    disabled={!sessionId || disabled || saving}
                    onCheckedChange={handleChange}
                    aria-label={t("cloneGame.sourceGameCurrentSessionOverwriteConflictingCodesLabel")}
                    className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                />
                <label
                    id={`${id}-label`}
                    htmlFor={id}
                    className="inline-flex items-center self-center text-xs leading-none text-muted-foreground"
                >
                    {t("cloneGame.sourceGameCurrentSessionOverwriteConflictingCodesLabel")}
                </label>
            </div>
            {saving ? (
                <Loader2 id={`${id}-loading-icon`} className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : null}
            {error ? (
                <span id={`${id}-error`} className="text-[10px] text-destructive">
                    {t("common.error")}
                </span>
            ) : null}
        </div>
    );
}
