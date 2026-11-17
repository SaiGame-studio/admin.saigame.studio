/**
 * schema.org structured data (JSON-LD) for the public pages: /why-sai-server and the tutorials.
 * Sai Server and SaiGame are described once, on saigame.studio (saigame.studio/web/lib/structured-data.ts);
 * these pages point to those entities by @id so search engines and AI crawlers link them together.
 */
export const APP_URL = "https://server.saigame.studio";
const SAI_SERVER = { "@id": "https://saigame.studio/products/sai-server/#software" };
const SAIGAME = { "@id": "https://saigame.studio/#organization" };

export function whySaiServerJsonLd(description: string) {
    return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        url: `${APP_URL}/why-sai-server`,
        name: "Why Sai Server",
        description,
        about: SAI_SERVER,
        publisher: SAIGAME,
    };
}

export function tutorialArticleJsonLd(article: { path: string; title: string; description: string; published?: string; modified?: string }) {
    return {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: article.title,
        description: article.description,
        url: `${APP_URL}${article.path}`,
        mainEntityOfPage: `${APP_URL}${article.path}`,
        inLanguage: "en",
        ...(article.published && { datePublished: article.published }),
        ...(article.modified && { dateModified: article.modified }),
        about: SAI_SERVER,
        author: SAIGAME,
        publisher: SAIGAME,
    };
}

/** Learning Center > ... > current page; each crumb is [name, path] */
export function tutorialBreadcrumbJsonLd(crumbs: [string, string][]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${APP_URL}${path}` })),
    };
}
