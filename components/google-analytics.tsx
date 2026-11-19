"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { GA_ID, initializeAnalytics, trackEvent } from "@/lib/analytics";

export function GoogleAnalytics() {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        if (!initializeAnalytics()) return;
        setEnabled(true);
        const onClick = (event: MouseEvent) => {
            const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
            if (!(link instanceof HTMLAnchorElement)) return;
            if (link.id === "download-sdk-unity-package-link") trackEvent("sdk_download_click", { sdk: "unity" });
        };
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, []);
    // Enhanced measurement owns initial/history page views; do not emit a second page_view here.
    return enabled ? <Script id="google-analytics-loader" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" /> : null;
}
