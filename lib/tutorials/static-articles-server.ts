/**
 * Server-side read of the static Learning Center articles (Tutorials, Tips): titles in the English translations,
 * bodies in public/{bodyDir}/{slug}.en.md. next.config.mjs traces those folders into the tutorials route.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import en from "@/lib/i18n/translations/en.json";
import type { StaticArticle, StaticSection } from "@/lib/tutorial-static-sections";

function translate(key: string): string {
    const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
    return typeof value === "string" ? value : key;
}

/** "#1 Import Unity Package", as the panel shows it. */
export function getStaticArticleTitle(article: StaticArticle): string {
    return `#${article.number} ${translate(article.titleKey)}`;
}

/** The article named by the slug, or the section's first article (the panel shows it when none is selected). */
export async function getStaticArticleForServer(section: StaticSection, slug: string | null): Promise<{ article: StaticArticle; title: string; body: string } | null> {
    const article = section.articles.find((item) => item.slug === slug) ?? section.articles[0];
    try {
        const body = await readFile(path.join(process.cwd(), "public", section.bodyDir, `${article.slug}.en.md`), "utf8");
        return { article, title: getStaticArticleTitle(article), body };
    }
    catch {
        return null;
    }
}
