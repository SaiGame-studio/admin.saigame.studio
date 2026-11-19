import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/structured-data";
import { STATIC_SECTIONS } from "@/lib/tutorial-static-sections";
import { listTutorialPaths } from "@/lib/tutorials/server";
import { getLegacyTutorialDestination } from "@/lib/tutorials/legacy-paths";

// Rebuilt at most once an hour, from the Learning Center categories and articles.
export const revalidate = 3600;

/** The CMS part is optional: if the Learning Center API is down, the sitemap still lists the static pages instead of failing the build. */
async function getCmsTutorialPaths(): Promise<string[]> {
    try {
        return await listTutorialPaths();
    } catch (error) {
        console.warn("[sitemap] Learning Center API unavailable, listing static pages only:", error);
        return [];
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const tutorials = await getCmsTutorialPaths();
    const paths = [
        "/why-sai-server",
        "/download-sdk",
        "/tutorials",
        ...tutorials.filter((path) => !getLegacyTutorialDestination(path)).map((path) => `/tutorials/${path}`),
        // a static tab's own URL canonicalizes to its first article, so only article URLs are listed
        ...STATIC_SECTIONS.flatMap((section) => section.articles.map((article) => `/tutorials/${section.path}/${article.slug}`)),
    ];
    return [...new Set(paths)].map((path) => ({ url: `${APP_URL}${path}` }));
}
