export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-SHR8QL7HZJ";

type AnalyticsEvent = "login" | "sign_up" | "create_studio" | "create_game" | "create_api_key" | "sdk_download_click";
type AnalyticsParameters = { method?: "password" | "google" | "two_factor"; sdk?: "unity" };

type AnalyticsWindow = Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
};
let initialized = false;

export function initializeAnalytics(): boolean {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "production" ||
        !["server.saigame.studio"].includes(window.location.hostname) || !/^G-[A-Z0-9]+$/.test(GA_ID)) return false;
    if (initialized) return true;
    const target = window as AnalyticsWindow;
    target.dataLayer = target.dataLayer || [];
    target.gtag = target.gtag || function () { target.dataLayer!.push(arguments); };
    target.gtag("js", new Date());
    let ignoreReferrer = false;
    try { ignoreReferrer = new URL(document.referrer).hostname === "accounts.google.com"; } catch { /* No referrer. */ }
    target.gtag("config", GA_ID, { cookie_domain: "saigame.studio", ignore_referrer: ignoreReferrer });
    initialized = true;
    return true;
}

/** Never send account data, resource names, credentials, or query strings. */
export function trackEvent(name: AnalyticsEvent, parameters: AnalyticsParameters = {}): void {
    try {
        if (!initializeAnalytics()) return;
        (window as AnalyticsWindow).gtag?.("event", name, { ...parameters, send_to: GA_ID });
    } catch { /* Analytics must never interrupt a product action. */ }
}
