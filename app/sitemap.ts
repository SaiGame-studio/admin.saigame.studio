import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/structured-data";
import { TIPS_PATH, TUTORIAL_TIPS } from "@/lib/tutorial-tips";
import { listTutorialPaths } from "@/lib/tutorials/server";

// Rebuilt at most once an hour, from the Learning Center categories and articles.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const tutorials = await listTutorialPaths();
    const paths = [
        "/why-sai-server",
        "/tutorials",
        ...tutorials.map((path) => `/tutorials/${path}`),
        `/tutorials/${TIPS_PATH}`,
        ...TUTORIAL_TIPS.map((tip) => `/tutorials/${TIPS_PATH}/${tip.slug}`),
    ];
    return paths.map((path) => ({ url: `${APP_URL}${path}` }));
}
