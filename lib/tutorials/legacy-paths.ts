import { GUIDES_SECTION } from "@/lib/tutorial-static-sections";

/** Basic CMS articles were copied into the static Tutorials tab with the same slugs. */
export function getLegacyTutorialDestination(path: string): string | null {
    if (path === "basic")
        return "guides";
    const article = GUIDES_SECTION.articles.find((item) => path === `basic/${item.group}/${item.slug}`);
    return article ? `guides/${article.slug}` : null;
}
