"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";

const MIN_SIZE = 12;
const MAX_SIZE = 40;
const STORAGE_KEY = "tutorials-font-size";

export function useTutorialFontSize() {
    const [fontSize, setFontSize] = useState(25);
    useEffect(() => {
        try {
            const saved = Number(localStorage.getItem(STORAGE_KEY));
            if (Number.isInteger(saved) && saved >= MIN_SIZE && saved <= MAX_SIZE)
                setFontSize(saved);
        }
        catch { /* Browser storage may be unavailable. */ }
    }, []);
    const changeFontSize = (size: number) => {
        const next = Math.max(MIN_SIZE, Math.min(MAX_SIZE, size));
        setFontSize(next);
        try { localStorage.setItem(STORAGE_KEY, String(next)); }
        catch { /* Keep the control usable without storage. */ }
    };
    return { fontSize, changeFontSize };
}

export function TutorialFontSize({ fontSize, onChange }: {
    fontSize: number;
    onChange: (size: number) => void;
}) {
    const { t } = useTranslation();
    return (<div id="tutorials-font-size-controls" role="group" aria-label={t("tutorials.fontSize")} className="ml-auto flex shrink-0 items-center gap-1 rounded-md border p-1">
        <Button id="tutorials-font-size-decrease" type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t("tutorials.decreaseFontSize")} disabled={fontSize <= MIN_SIZE} onClick={() => onChange(fontSize - 1)}>
            <Minus id="tutorials-font-size-decrease-icon" aria-hidden="true" className="h-4 w-4"/>
        </Button>
        <span id="tutorials-font-size-label" aria-live="polite" aria-atomic="true" className="min-w-7 px-1 text-center text-sm tabular-nums">{fontSize}</span>
        <Button id="tutorials-font-size-increase" type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t("tutorials.increaseFontSize")} disabled={fontSize >= MAX_SIZE} onClick={() => onChange(fontSize + 1)}>
            <Plus id="tutorials-font-size-increase-icon" aria-hidden="true" className="h-4 w-4"/>
        </Button>
    </div>);
}
