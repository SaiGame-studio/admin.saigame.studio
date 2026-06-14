"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
// next-themes@0.4.6 renders an inline <script> for FOUC prevention which React 19 warns about.
// This is intentional behavior — suppress until upstream fixes it.
if (typeof window !== "undefined") {
    const _err = console.error.bind(console);
    console.error = (...a: unknown[]) => {
        if (typeof a[0] === "string" && a[0].includes("script tag while rendering"))
            return;
        // Google GSI origin mismatch on local dev — not a code issue, suppress noise
        if (typeof a[0] === "string" && a[0].includes("[GSI_LOGGER]"))
            return;
        _err(...a);
    };
}
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (<NextThemesProvider attribute="class" defaultTheme="dark-green" enableSystem storageKey="game-server-admin-theme" {...props}>
      {children}
    </NextThemesProvider>);
}
