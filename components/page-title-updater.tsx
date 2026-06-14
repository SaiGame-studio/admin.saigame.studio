"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/utils/site-config";
function formatPathToTitle(pathname: string): string {
    if (pathname === "/")
        return "Dashboard";
    const segments = pathname
        .split("/")
        .filter(Boolean)
        .filter((seg) => {
        // Skip dynamic ID segments (UUIDs, numeric IDs, etc.)
        if (/^[0-9a-f-]{8,}$/i.test(seg))
            return false;
        if (/^\d+$/.test(seg))
            return false;
        return true;
    });
    if (segments.length === 0)
        return "Dashboard";
    return segments
        .map((seg) => seg
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(" > ");
}
export function PageTitleUpdater() {
    const pathname = usePathname();
    useEffect(() => {
        const pageTitle = formatPathToTitle(pathname);
        document.title = `${pageTitle} | ${SITE_NAME}`;
    }, [pathname]);
    return null;
}
