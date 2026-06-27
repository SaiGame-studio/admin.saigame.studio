"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
    ignoreCloneSessionContent,
    unignoreCloneSessionContent,
    type CloneSessionIgnoreContentType,
} from "@/lib/game-api";

type CloneSessionIgnoreSwitchProps = {
    id: string;
    sessionId?: string;
    contentType: CloneSessionIgnoreContentType;
    sourceId: string;
    initialIgnored?: boolean;
    t: (key: string) => string;
};

export function CloneSessionIgnoreSwitch({
    id,
    sessionId,
    contentType,
    sourceId,
    initialIgnored,
    t,
}: CloneSessionIgnoreSwitchProps) {
    const [ignored, setIgnored] = useState(Boolean(initialIgnored));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setIgnored(Boolean(initialIgnored));
    }, [initialIgnored]);

    const handleChange = async (checked: boolean) => {
        if (!sessionId || saving) return;
        const previous = ignored;
        setIgnored(checked);
        setSaving(true);
        setError(false);

        try {
            if (checked) {
                await ignoreCloneSessionContent(sessionId, contentType, sourceId);
            } else {
                await unignoreCloneSessionContent(sessionId, contentType, sourceId);
            }
        } catch {
            setIgnored(previous);
            setError(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id={`${id}-wrap`} className="inline-flex items-center gap-2">
            <Switch
                id={id}
                checked={ignored}
                disabled={!sessionId || saving}
                onCheckedChange={handleChange}
                aria-label={t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
            />
            {error ? (
                <span id={`${id}-error`} className="text-[10px] text-destructive">
                    {t("common.error")}
                </span>
            ) : null}
        </div>
    );
}
