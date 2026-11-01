// Non-secret change signal. Authentication comes only from the shared HttpOnly cookie.
const scope = encodeURIComponent(process.env.NEXT_PUBLIC_API_URL ?? "default");
const cookieName = `ss_web_session_${scope}`;
const storageKey = `sharedSessionRevision:${scope}`;
let revision: string | null | undefined;

function readRevision(): string | null {
    const prefix = `${cookieName}=`;
    return document.cookie.split("; ").find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function localRevision(): string | null {
    if (revision === undefined) {
        try {
            revision = localStorage.getItem(storageKey);
        } catch {
            revision = null;
        }
        // Adopt the shared revision once for sessions created before this feature.
        if (revision === null) rememberRevision(readRevision());
    }
    return revision ?? null;
}

function rememberRevision(value: string | null) {
    revision = value;
    try {
        if (value === null) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, value);
    } catch {
        // In-memory synchronization still works when storage is unavailable.
    }
}

export function isSharedSessionCurrent(): boolean {
    if (typeof document === "undefined") return true;
    return localRevision() === readRevision();
}

export function publishSharedSession(signedIn = true) {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const value = `${signedIn ? "login" : "logout"}-${nonce}`;
    const hostname = window.location.hostname;
    const domain = hostname === "saigame.studio" || hostname.endsWith(".saigame.studio")
        ? "; Domain=saigame.studio" : "";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${cookieName}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure}`;
    rememberRevision(readRevision());
}

export function acceptSharedSession() {
    rememberRevision(readRevision());
}

export function getSharedSessionRevision(): string | null {
    return localRevision();
}

export function isSharedSessionSignedOut(): boolean {
    return readRevision()?.startsWith("logout-") ?? false;
}

export function watchSharedSession(): () => void {
    localRevision();
    const check = () => {
        if (!isSharedSessionCurrent()) {
            acceptSharedSession();
            // Reload clears account-specific state before restoring the new shared session.
            window.location.reload();
        }
    };
    const interval = window.setInterval(check, 1000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
        window.clearInterval(interval);
        window.removeEventListener("focus", check);
        document.removeEventListener("visibilitychange", check);
    };
}
