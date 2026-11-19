"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Keep the reading layout stacked on mobile; persist the desktop split locally. */
export function ResizableTutorialLayout({ id, menu, children }: {
    id: string;
    menu: ReactNode;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    const [desktop, setDesktop] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(min-width: 768px)");
        const update = () => setDesktop(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    if (!desktop) {
        return (<div id={id} className="flex min-w-0 flex-col gap-4">
            {menu}
            {children}
        </div>);
    }

    return (<ResizablePanelGroup id={id} direction="horizontal" autoSaveId="tutorials-left-menu" className="!h-auto !overflow-visible items-stretch">
        <ResizablePanel id={`${id}-navigation-panel`} order={1} defaultSize={25} minSize={15} maxSize={45} className="min-w-0 pr-3 !overflow-visible">
            {/* Sticks to the top of the scrolling #protected-layout-main (between the top nav and the footer); scrolls on its own when taller than that area. */}
            <div id={`${id}-navigation-sticky`} className="sticky top-4 max-h-[calc(100vh-9rem)] overflow-y-auto pb-4">
                {menu}
            </div>
        </ResizablePanel>
        <ResizableHandle id={`${id}-resize-handle`} withHandle aria-label={t("tutorials.resizeMenu")} className="!w-3 shrink-0 !bg-transparent before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-border hover:before:bg-primary focus-visible:before:bg-primary [&>div]:sticky [&>div]:top-24 [&>div]:self-start"/>
        <ResizablePanel id={`${id}-content-panel`} order={2} minSize={55} className="min-w-0 pl-5 !overflow-visible">
            {children}
        </ResizablePanel>
    </ResizablePanelGroup>);
}
