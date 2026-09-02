export const LOGIN_RETURN_TO_PARAM = "returnTo";

const AUTH_PAGE_PATHS = new Set([
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
]);

export function getSafeReturnTo(value: string | null): string {
    if (!value) {
        return "/";
    }

    let decodedValue: string;
    try {
        decodedValue = decodeURIComponent(value);
    }
    catch {
        return "/";
    }

    if (!decodedValue.startsWith("/") || decodedValue.startsWith("//") || decodedValue.startsWith("/\\")) {
        return "/";
    }

    const path = decodedValue.split(/[?#]/, 1)[0];
    return AUTH_PAGE_PATHS.has(path) ? "/" : value;
}

export function getLoginUrl(returnTo: string): string {
    return `/login?${LOGIN_RETURN_TO_PARAM}=${encodeURIComponent(getSafeReturnTo(returnTo))}`;
}

export function getReturnToFromLocation(): string {
    if (typeof window === "undefined") {
        return "/";
    }

    return getSafeReturnTo(new URLSearchParams(window.location.search).get(LOGIN_RETURN_TO_PARAM));
}

export function getCurrentRelativeUrl(): string {
    if (typeof window === "undefined") {
        return "/";
    }

    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
