import { api } from "@/lib/api-client";

export interface EmailBlacklistEntry {
    id: string;
    email: string;
    domain: string;
    reason: string;
    status: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface EmailBlacklistResult {
    data: EmailBlacklistEntry[];
    total: number;
    page: number;
    page_size: number;
}

export interface CmsContent {
    id: string;
    title: string;
    slug: string;
    language: string;
    description: string;
    category_id: string | null;
    status: string;
    featured: boolean;
    tags: string[];
    body: string;
    change_log: string;
    author_id: string;
    edited_by_id: string;
    version_number: number;
    seo_title: string;
    seo_description: string;
    seo_keywords: string[];
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    published_at: string | null;
}

export interface CmsContentsResult {
    data: CmsContent[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
}

export interface ContentTranslationSummary {
    id: string;
    language: string;
    title: string;
    status: string;
    is_root: boolean;
}

export interface CategoryLanguage {
    name: string;
    description: string;
}

export interface ContentCategory {
    id: string;
    parent_id: string | null;
    name: string;
    slug: string;
    description: string;
    path: string;
    depth: number;
    sort_order: number;
    is_active: boolean;
    is_public: boolean;
    languages?: Record<string, CategoryLanguage>;
    created_at: string;
    updated_at: string;
    children: ContentCategory[];
}

export interface CCUGameEntry {
    game_id: string;
    game_name: string;
    studio_id: string;
    current_ccu: number;
    limit: number;
    utilization_pct: number;
    plugin_tier: string;
}

export interface CCUOverviewResult {
    total_games: number;
    total_ccu: number;
    total_capacity: number;
    total_utilization_pct: number;
    games: CCUGameEntry[];
}

export async function listEmailBlacklist(params?: {
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
}): Promise<EmailBlacklistResult> {
    const query = new URLSearchParams();
    if (params?.status)
        query.set("status", params.status);
    if (params?.search)
        query.set("search", params.search);
    if (params?.page)
        query.set("page", String(params.page));
    if (params?.page_size)
        query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return api.get(`/api/v1/admin/email-blacklist${qs ? `?${qs}` : ""}`);
}

export async function addEmailToBlacklist(email: string, reason?: string): Promise<{
    message: string;
}> {
    return api.post("/api/v1/admin/email-blacklist", { email, reason: reason || "manual" });
}

export async function updateEmailBlacklistStatus(id: string, status: string): Promise<void> {
    return api.put(`/api/v1/admin/email-blacklist/${encodeURIComponent(id)}`, { status });
}

export async function listCmsContents(params?: {
    category_id?: string;
    subcategory?: string;
    tags?: string;
    featured?: boolean;
    search?: string;
    language?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    per_page?: number;
}): Promise<CmsContentsResult> {
    const query = new URLSearchParams();
    if (params?.category_id)
        query.set("category", params.category_id);
    if (params?.subcategory)
        query.set("subcategory", params.subcategory);
    if (params?.tags)
        query.set("tags", params.tags);
    if (params?.featured !== undefined)
        query.set("featured", String(params.featured));
    if (params?.search)
        query.set("search", params.search);
    if (params?.language)
        query.set("language", params.language);
    if (params?.sort_by)
        query.set("sort_by", params.sort_by);
    if (params?.sort_order)
        query.set("sort_order", params.sort_order);
    if (params?.page)
        query.set("page", String(params.page));
    if (params?.per_page)
        query.set("per_page", String(params.per_page));
    const qs = query.toString();
    return api.get(`/api/v1/admin/contents${qs ? `?${qs}` : ""}`);
}

export async function getCmsContent(id: string): Promise<CmsContent> {
    return api.get(`/api/v1/admin/contents/${encodeURIComponent(id)}`);
}

export async function getContentTranslations(id: string): Promise<{
    root_id: string;
    translations: ContentTranslationSummary[];
}> {
    return api.get(`/api/v1/admin/contents/${encodeURIComponent(id)}/translations`);
}

export async function updateCmsContent(id: string, data: {
    title?: string;
    slug?: string;
    language?: string;
    description?: string;
    category_id?: string | null;
    featured?: boolean;
    tags?: string[];
    body?: string;
    change_log?: string;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    metadata?: Record<string, unknown>;
}): Promise<CmsContent> {
    return api.patch(`/api/v1/admin/contents/${encodeURIComponent(id)}`, data);
}

export async function createCmsContent(data: {
    title: string;
    slug?: string;
}): Promise<CmsContent> {
    return api.post("/api/v1/admin/contents", data);
}

export async function toggleCmsContentPublish(id: string, action: "publish" | "unpublish"): Promise<CmsContent> {
    return api.post(`/api/v1/admin/contents/${encodeURIComponent(id)}/publish`, { action });
}

export async function autoTranslateCmsContent(id: string, targetLanguages: string[]): Promise<{
    translations: ContentTranslationSummary[];
}> {
    return api.post(`/api/v1/admin/contents/${encodeURIComponent(id)}/auto-translate`, { target_languages: targetLanguages });
}

export async function listCategoryTree(): Promise<ContentCategory[]> {
    const result = await api.get("/api/v1/admin/categories");
    return result.data ?? [];
}

export async function createCategory(data: {
    parent_id?: string | null;
    name: string;
    slug: string;
    description?: string;
    sort_order?: number;
}): Promise<ContentCategory> {
    return api.post("/api/v1/admin/categories", data);
}

export async function updateCategory(id: string, data: {
    parent_id?: string | null;
    name?: string;
    slug?: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
    languages?: Record<string, CategoryLanguage>;
}): Promise<ContentCategory> {
    return api.patch(`/api/v1/admin/categories/${encodeURIComponent(id)}`, data);
}

export async function deleteCategory(id: string): Promise<void> {
    return api.delete(`/api/v1/admin/categories/${encodeURIComponent(id)}`);
}

export async function toggleCategoryPublish(id: string, isPublic: boolean): Promise<ContentCategory> {
    return api.patch(`/api/v1/admin/categories/${encodeURIComponent(id)}/publish`, { is_public: isPublic });
}

export async function getCCUOverview(): Promise<CCUOverviewResult> {
    return api.get("/api/v1/admin/ccu/overview");
}
