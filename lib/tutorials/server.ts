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
        throw new Error("NEXT_PUBLIC_API_URL is required to render public tutorials.");
    const res = await fetch(`${API_URL}${endpoint}`, { headers: { Accept: "application/json" }, next: { revalidate } });
    if (res.status === 404)
        return null;
    if (!res.ok)
        throw new Error(`Public tutorial request failed (${res.status}): ${endpoint}`);
    return (await res.json()) as T;
}

export async function getTutorialRoots(): Promise<Category[]> {
    const res = await getJson<{ data: Category[] }>("/api/v1/categories", TREE_REVALIDATE);
    if (!res || !Array.isArray(res.data))
        throw new Error("The public tutorial category response is unavailable or invalid.");
    return getActiveRoots(res.data);
}

export async function getCategoryContents(categoryId: string): Promise<ContentItem[]> {
    const res = await getJson<unknown>(`/api/v1/categories/${categoryId}/contents?language=${LANGUAGE}`, TREE_REVALIDATE);
    if (!res)
        throw new Error(`Public tutorial category contents are unavailable: ${categoryId}`);
    return extractContentItems(res);
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

/** Every leaf category with its articles (in English), in menu order. One request per leaf: bounded by the size of the category tree, cached for an hour. */
export async function getTutorialLeaves(): Promise<{ roots: Category[]; leaves: { category: Category; items: ContentItem[] }[] }> {
    const roots = await getTutorialRoots();
    const leafCategories = getAllLeafCategories(roots);
    const contents = await Promise.all(leafCategories.map((leaf) => getCategoryContents(leaf.id)));
    return { roots, leaves: leafCategories.map((category, i) => ({ category, items: contents[i] })) };
}

/** Every public tutorial URL path (without the /tutorials prefix): categories and their articles. */
export async function listTutorialPaths(): Promise<string[]> {
    const { roots, leaves } = await getTutorialLeaves();
    const paths: string[] = [];
    const addCategories = (categories: Category[]) => {
        for (const cat of categories) {
            paths.push(cat.path);
            addCategories(getActiveChildren(cat));
        }
    };
    addCategories(roots);
    leaves.forEach(({ category, items }) => items.forEach((item) => paths.push(`${category.path}/${item.slug}`)));
    return paths;
}
