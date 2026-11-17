/**
 * Server-side reads of the public Learning Center API, used to render tutorials into the HTML
 * (search engines and AI crawlers do not run the client-side loader) and to build the sitemap.
 * Content is read in English: crawlers do not carry the visitor's language choice.
 *
 * GET /api/v1/contents/{id} counts a view on the backend, so content bodies are cached for a day:
 * the server render adds at most about one view per article per day.
 */
import type { Category, ContentDetail, ContentItem } from "./types";
import { extractContentItems, findCategoryByPath, getActiveChildren, getActiveRoots, getAllLeafCategories } from "./categories";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LANGUAGE = "en";
const TREE_REVALIDATE = 60 * 60;
const CONTENT_REVALIDATE = 60 * 60 * 24;

async function getJson<T>(endpoint: string, revalidate: number): Promise<T | null> {
    if (!API_URL)
        return null;
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { headers: { Accept: "application/json" }, next: { revalidate } });
        return res.ok ? (await res.json()) as T : null;
    }
    catch {
        return null;
    }
}

export async function getTutorialRoots(): Promise<Category[]> {
    const res = await getJson<{ data: Category[] }>("/api/v1/categories", TREE_REVALIDATE);
    return res?.data ? getActiveRoots(res.data) : [];
}

export async function getCategoryContents(categoryId: string): Promise<ContentItem[]> {
    const res = await getJson<unknown>(`/api/v1/categories/${categoryId}/contents?language=${LANGUAGE}`, TREE_REVALIDATE);
    return res ? extractContentItems(res) : [];
}

async function getContentDetail(contentId: string): Promise<ContentDetail | null> {
    return getJson<ContentDetail>(`/api/v1/contents/${contentId}?language=${LANGUAGE}`, CONTENT_REVALIDATE);
}

export type ResolvedTutorial =
    | { kind: "category"; roots: Category[]; category: Category; children: Category[]; items: ContentItem[] }
    | { kind: "content"; roots: Category[]; category: Category; content: ContentDetail };

/** Maps /tutorials/{path} to a category or an article, the way the client page does (category path, then category path + slug). */
export async function resolveTutorialPath(path: string): Promise<ResolvedTutorial | null> {
    const roots = await getTutorialRoots();
    const category = findCategoryByPath(roots, path);
    if (category) {
        const children = getActiveChildren(category);
        const items = children.length === 0 ? await getCategoryContents(category.id) : [];
        return { kind: "category", roots, category, children, items };
    }
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash <= 0)
        return null;
    const parent = findCategoryByPath(roots, path.substring(0, lastSlash));
    if (!parent)
        return null;
    const slug = path.substring(lastSlash + 1);
    const item = (await getCategoryContents(parent.id)).find((i) => i.slug === slug);
    const content = item ? await getContentDetail(item.id) : null;
    return content ? { kind: "content", roots, category: parent, content } : null;
}

/** Every public tutorial URL path (without the /tutorials prefix): categories and their articles. */
export async function listTutorialPaths(): Promise<string[]> {
    const roots = await getTutorialRoots();
    const paths: string[] = [];
    const addCategories = (categories: Category[]) => {
        for (const cat of categories) {
            paths.push(cat.path);
            addCategories(getActiveChildren(cat));
        }
    };
    addCategories(roots);
    // one request per leaf category: bounded by the size of the category tree, cached for an hour
    const leaves = getAllLeafCategories(roots);
    const contents = await Promise.all(leaves.map((leaf) => getCategoryContents(leaf.id)));
    leaves.forEach((leaf, i) => contents[i].forEach((item) => paths.push(`${leaf.path}/${item.slug}`)));
    return paths;
}
