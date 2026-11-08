"use client";

import { useRef, useState, type ReactNode } from "react";
import { SheetContent } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n/use-translation";

interface ShopItemSheetContentProps {
    id: string;
    children: ReactNode;
}

export function ShopItemSheetContent({ id, children }: ShopItemSheetContentProps) {
    const { t } = useTranslation();
    const [width, setWidth] = useState(800);
    const drag = useRef<{ x: number; width: number } | null>(null);

    function resize(next: number) {
        setWidth(Math.min(Math.max(560, next), window.innerWidth - 32));
    }

    return (
        <SheetContent id={id} side="right" className="flex flex-col overflow-hidden" style={{ width: `min(100vw, ${width}px)`, maxWidth: "100vw" }}>
            <div
                id={`${id}-resize`}
                role="separator"
                tabIndex={0}
                aria-label={t("shopItemTranslations.resizePanel")}
                aria-orientation="vertical"
                aria-valuemin={560}
                aria-valuenow={width}
                className="absolute inset-y-0 left-0 z-10 hidden w-3 touch-none cursor-ew-resize select-none items-center justify-center hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none sm:flex"
                onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    drag.current = { x: event.clientX, width: event.currentTarget.parentElement!.getBoundingClientRect().width };
                    event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                    if (drag.current) resize(drag.current.width + drag.current.x - event.clientX);
                }}
                onPointerUp={(event) => {
                    drag.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={() => { drag.current = null; }}
                onLostPointerCapture={() => { drag.current = null; }}
                onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    resize(width + (event.key === "ArrowLeft" ? 40 : -40));
                }}
            >
                <span id={`${id}-resize-grip`} className="h-10 w-1 rounded-full bg-border" />
            </div>
            {children}
        </SheetContent>
    );
}
