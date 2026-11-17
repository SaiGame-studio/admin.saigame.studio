import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/structured-data";
import { STATIC_SECTIONS } from "@/lib/tutorial-static-sections";
import { listTutorialPaths } from "@/lib/tutorials/server";

// Rebuilt at most once an hour, from the Learning Center categories and articles.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const tutorials = await listTutorialPaths();
    const paths = [
        "/why-sai-server",
        "/download-sdk",
        "/tutorials",
        ...tutorials.map((path) => `/tutorials/${path}`),
        // a static tab's own URL canonicalizes to its first article, so only article URLs are listed
        ...STATIC_SECTIONS.flatMap((section) => section.articles.map((article) => `/tutorials/${section.path}/${article.slug}`)),
    ];
    return paths.map((path) => ({ url: `${APP_URL}${path}` }));
}
