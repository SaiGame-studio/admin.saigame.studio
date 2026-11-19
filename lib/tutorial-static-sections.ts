/**
 * Static tabs of the Learning Center (Tutorials and Tips). They are not managed by the CMS:
 * titles live in the translation files and bodies in public/{bodyDir}/{slug}.{locale}.md
 * (a body's images live in public/{bodyDir}/{slug}/).
 */

import { BASIC_GUIDE_ARTICLES, BASIC_GUIDE_GROUPS } from "./tutorials/basic-guides";
import { LUA_GUIDE_ARTICLES, LUA_GUIDE_GROUPS } from "./tutorials/lua-guides";

export interface StaticArticle {
    /** Optional number shown in the menu and title. */
    number?: number;
    slug: string;
    titleKey: string;
    /** Shows a "chat with us" line under the article for signed-in users. */
    supportChat?: boolean;
    /** Key of the collapsible menu group the article sits in; ungrouped articles are listed at the top level. */
    group?: string;
}

/** A collapsible parent entry in a static tab's left menu. */
export interface StaticArticleGroup {
    key: string;
    titleKey: string;
    parent?: string;
}

export interface StaticSection {
    /** Tab value; the leading underscores keep it from clashing with a CMS category slug. */
    tab: string;
    /** URL segment: /tutorials/{path} and /tutorials/{path}/{slug}. */
    path: string;
    /** Folder under public/ holding the markdown bodies. */
    bodyDir: string;
    tabLabelKey: string;
    loadFailedKey: string;
    /** Prefix of the panel's element ids. */
    idPrefix: string;
    /** Draws the article inside a bordered card. */
    bordered: boolean;
    groups?: StaticArticleGroup[];
    articles: StaticArticle[];
}

export const GUIDES_SECTION: StaticSection = {
    tab: "__guides",
    path: "guides",
    bodyDir: "tutorial-guides",
    tabLabelKey: "tutorials.guidesTab",
    loadFailedKey: "tutorials.guideLoadFailed",
    idPrefix: "tutorial-guides",
    bordered: false,
    groups: [
        { key: "get-started", titleKey: "tutorials.guideGroups.getStarted" },
        ...BASIC_GUIDE_GROUPS,
    ],
    articles: [
        { slug: "create-a-studio", titleKey: "tutorials.guides.createAStudio", group: "get-started" },
        { slug: "import-unity-package", titleKey: "tutorials.guides.importUnityPackage", group: "get-started" },
        { slug: "unity-google-login", titleKey: "tutorials.guides.unity-google-login", group: "get-started" },
        ...BASIC_GUIDE_ARTICLES,
    ],
};

export const LUA_SECTION: StaticSection = {
    tab: "__lua",
    path: "lua-guides",
    bodyDir: "tutorial-lua",
    tabLabelKey: "tutorials.luaTab",
    loadFailedKey: "tutorials.guideLoadFailed",
    idPrefix: "tutorial-lua",
    bordered: false,
    groups: LUA_GUIDE_GROUPS,
    articles: LUA_GUIDE_ARTICLES,
};

export const TIPS_SECTION: StaticSection = {
    tab: "__tips",
    path: "tips",
    bodyDir: "tutorial-tips",
    tabLabelKey: "tutorials.tipsTab",
    loadFailedKey: "tutorials.tipLoadFailed",
    idPrefix: "tutorial-tips",
    bordered: true,
    articles: [
        { number: 1, slug: "game-expect-user", titleKey: "tutorials.tips.gameExpectUser" },
        { number: 2, slug: "keep-sdk-unmodified", titleKey: "tutorials.tips.keepSdkUnmodified", supportChat: true },
    ],
};

/** In tab order, after the CMS categories. */
export const STATIC_SECTIONS: StaticSection[] = [GUIDES_SECTION, LUA_SECTION, TIPS_SECTION];

/** The static section a /tutorials path belongs to, if any. */
export function findStaticSection(path: string | null): StaticSection | null {
    if (!path)
        return null;
    return STATIC_SECTIONS.find((section) => path === section.path || path.startsWith(`${section.path}/`)) ?? null;
}

export function findStaticSectionByTab(tab: string | null): StaticSection | null {
    return STATIC_SECTIONS.find((section) => section.tab === tab) ?? null;
}

/** The article slug in a section path, or null when the path names no known article. */
export function getStaticArticleSlugFromPath(section: StaticSection, path: string): string | null {
    const slug = path.slice(section.path.length + 1);
    return section.articles.some((article) => article.slug === slug) ? slug : null;
}

export function getStaticArticleBodyUrl(section: StaticSection, slug: string, locale: string): string {
    return `/${section.bodyDir}/${slug}.${locale}.md`;
}
