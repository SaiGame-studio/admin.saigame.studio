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

// JavaScript cannot inspect the HttpOnly refresh cookie. Only attempt restoration
// for a session established by a successful login on either web app.
export function hasSharedLoginSession(): boolean {
    return typeof document !== "undefined" && (readRevision()?.startsWith("login-") ?? false);
}

export function isSharedSessionSignedOut(): boolean {
    return readRevision()?.startsWith("logout-") ?? false;
}

// While one-time secrets (2FA recovery codes) are on screen, a session change made by
// another tab must not reload this page; the reload happens after the hold is released.
let reloadHolds = 0;

export function holdSharedSessionReload(): () => void {
    reloadHolds++;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        reloadHolds--;
    };
}

export function watchSharedSession(): () => void {
    localRevision();
    const check = () => {
        if (reloadHolds > 0) return;
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

// Keep a rejected cookie from being retried by every API call or page reload.
const rejectedRefreshKey = `rejectedRefresh:${scope}`;
let rejectedRefreshRevision: string | null | undefined;

export function isSessionRefreshRejected(): boolean {
    try {
        const stored = sessionStorage.getItem(rejectedRefreshKey);
        if (stored !== null) rejectedRefreshRevision = JSON.parse(stored);
    } catch {
        // The in-memory guard still works when session storage is unavailable.
    }
    return rejectedRefreshRevision !== undefined && rejectedRefreshRevision === getSharedSessionRevision();
}

export function rejectSessionRefresh() {
    rejectedRefreshRevision = getSharedSessionRevision();
    try {
        sessionStorage.setItem(rejectedRefreshKey, JSON.stringify(rejectedRefreshRevision));
    } catch {
        // The in-memory guard still works when session storage is unavailable.
    }
}

export function allowSessionRefresh() {
    rejectedRefreshRevision = undefined;
    try {
        sessionStorage.removeItem(rejectedRefreshKey);
    } catch {
        // The in-memory guard still works when session storage is unavailable.
    }
}

// The login hint cookie outlives the HttpOnly refresh cookie. When the server reports the
// shared refresh cookie as missing or expired, mark the shared session as signed out so no
// tab or app keeps sending refresh requests without a token.
const ENDED_SESSION_CODES = new Set(["REFRESH_TOKEN_MISSING", "TOKEN_EXPIRED"]);

export async function endExpiredSharedSession(response: Response): Promise<void> {
    if (response.status !== 401 || !hasSharedLoginSession()) return;
    let code: unknown;
    try {
        code = ((await response.json()) as { message_code?: unknown }).message_code;
    } catch {
        return;
    }
    if (typeof code === "string" && ENDED_SESSION_CODES.has(code) && isSharedSessionCurrent()) {
        publishSharedSession(false);
    }
}
