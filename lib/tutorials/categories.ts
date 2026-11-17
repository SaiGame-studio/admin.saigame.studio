/** Pure helpers over the Learning Center category tree, shared by the client page and the server render. */
import type { Category, ContentItem } from "./types";

export function getCatName(cat: Category, locale: string): string {
    if (locale !== "en" && cat.languages?.[locale]?.name) {
        return cat.languages[locale].name!;
    }
    return cat.name;
}

/** Active root categories in menu order, from the /api/v1/categories response body. */
export function getActiveRoots(data: Category[]): Category[] {
    return data
        .filter((c) => c.parent_id === null && c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
}

/** Active children in menu order. */
export function getActiveChildren(category: Category): Category[] {
    return (category.children ?? [])
        .filter((c) => c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
}

/** The /api/v1/categories/{id}/contents response comes in several envelopes; returns its items sorted by title. */
export function extractContentItems(res: unknown): ContentItem[] {
    const data = (res as any)?.data ?? res;
    const items: ContentItem[] = Array.isArray(data) ? data : (data?.items ?? data?.contents ?? data?.data ?? []);
    return [...items].sort((a, b) => a.title.localeCompare(b.title));
}

export function getAllLeafCategories(categories: Category[]): Category[] {
    const leaves: Category[] = [];
    for (const cat of categories) {
        const children = (cat.children ?? []).filter((c) => c.is_active);
        if (children.length === 0) {
            leaves.push(cat);
        }
        else {
            leaves.push(...getAllLeafCategories(children));
        }
    }
    return leaves;
}

export function findCategoryById(categories: Category[], id: string): Category | null {
    for (const cat of categories) {
        if (cat.id === id)
            return cat;
        if (cat.children) {
            const found = findCategoryById(cat.children, id);
            if (found)
                return found;
        }
    }
    return null;
}

export function findCategoryByPath(categories: Category[], path: string): Category | null {
    for (const cat of categories) {
        if (cat.path === path)
            return cat;
        if (cat.children) {
            const found = findCategoryByPath(cat.children, path);
            if (found)
                return found;
        }
    }
    return null;
}

export function findRootForPath(categories: Category[], path: string): Category | null {
    for (const root of categories) {
        if (path === root.path || path.startsWith(root.path + "/"))
            return root;
    }
    return null;
}

/** Categories from the root down to the given path, e.g. basic > basic/quest > basic/quest/daily-quest. */
export function getCategoryTrail(categories: Category[], path: string): Category[] {
    const trail: Category[] = [];
    const segments = path.split("/");
    for (let i = 1; i <= segments.length; i++) {
        const found = findCategoryByPath(categories, segments.slice(0, i).join("/"));
        if (found)
            trail.push(found);
    }
    return trail;
}
