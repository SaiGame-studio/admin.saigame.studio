/** Learning Center (CMS) shapes returned by the public /api/v1/categories and /api/v1/contents endpoints. */

export interface Category {
    id: string;
    parent_id: string | null;
    name: string;
    slug: string;
    description: string;
    path: string;
    depth: number;
    sort_order: number;
    is_active: boolean;
    languages?: Record<string, {
        name?: string;
        description?: string;
    }>;
    children?: Category[];
}

export interface ContentItem {
    id: string;
    title: string;
    slug: string;
    description: string;
    version_number?: number;
    metadata?: Record<string, string>;
}

export interface ContentDetail {
    id: string;
    title: string;
    slug: string;
    language: string;
    description: string;
    body: string;
    status: string;
    version_number: number;
    metadata: Record<string, string>;
    seo_title?: string;
    seo_description?: string;
    created_at: string;
    updated_at: string;
    published_at: string;
}
