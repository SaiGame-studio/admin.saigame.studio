/** Server-side read of the static Tips (titles in the English translations, bodies in public/tutorial-tips/{slug}.en.md). */
import { readFile } from "node:fs/promises";
import path from "node:path";
import en from "@/lib/i18n/translations/en.json";
import { TUTORIAL_TIPS, type TutorialTip } from "@/lib/tutorial-tips";

function translate(key: string): string {
    const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
    return typeof value === "string" ? value : key;
}

/** "#1 Open Sai Play from your game", as the Tips panel shows it. */
export function getTipTitle(tip: TutorialTip): string {
    return `#${tip.number} ${translate(tip.titleKey)}`;
}

/** The tip named by the slug, or the first tip (the panel shows it when none is selected). */
export async function getTipForServer(slug: string | null): Promise<{ tip: TutorialTip; title: string; body: string } | null> {
    const tip = TUTORIAL_TIPS.find((item) => item.slug === slug) ?? TUTORIAL_TIPS[0];
    try {
        const body = await readFile(path.join(process.cwd(), "public", "tutorial-tips", `${tip.slug}.en.md`), "utf8");
        return { tip, title: getTipTitle(tip), body };
    }
    catch {
        return null;
    }
}
