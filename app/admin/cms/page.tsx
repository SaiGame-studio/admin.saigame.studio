"use client";
import { useEffect, useState, useCallback } from "react";
import { toSlug } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCapabilities } from "@/hooks/use-capabilities";
import { PenSquare, ShieldAlert, Search, RefreshCw, Star, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import Link from "next/link";
import { listCmsContents, createCmsContent, listCategoryTree, toggleCmsContentPublish, CmsContent, ContentCategory } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryTab } from "./CategoryTab";
import { locales } from "@/lib/i18n/config";
import ReactCountryFlag from "react-country-flag";
const LANGUAGE_STORAGE_KEY = "admin.cms.languageFilter";
const LANGUAGE_LABELS: Record<string, string> = { en: "English", vi: "Tiếng Việt", ja: "日本語" };
const LANGUAGE_COUNTRY: Record<string, string> = { en: "US", vi: "VN", ja: "JP" };
function flattenCategoryTree(cats: ContentCategory[], depth = 0): {
    value: string;
    label: string;
    depth: number;
}[] {
    const result: {
        value: string;
        label: string;
        depth: number;
    }[] = [];
    const sorted = [...cats].sort((a, b) => a.sort_order - b.sort_order);
    for (const cat of sorted) {
        result.push({ value: cat.id, label: cat.name, depth });
        if (cat.children?.length)
            result.push(...flattenCategoryTree(cat.children, depth + 1));
    }
    return result;
}
const SORT_OPTIONS = [
    { value: "created_at", label: "Created At" },
    { value: "updated_at", label: "Updated At" },
    { value: "title", label: "Title" },
];
function statusBadgeVariant(status: string) {
    switch (status) {
        case "published": return "default" as const;
        case "draft": return "secondary" as const;
        case "archived": return "outline" as const;
        default: return "secondary" as const;
    }
}
function formatDate(iso?: string | null): string {
    if (!iso)
        return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function CmsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const capabilities = useCapabilities();
    const [contents, setContents] = useState<CmsContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
    // Filters
    const [category, setCategory] = useState(searchParams.get("category") || "all");
    const [searchName, setSearchName] = useState(searchParams.get("search") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(searchName);
    const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "created_at");
    const [sortOrder, setSortOrder] = useState(searchParams.get("sort_order") || "desc");
    const [language, setLanguage] = useState<string>(() => {
        const fromUrl = searchParams.get("language");
        if (fromUrl && (fromUrl === "all" || (locales as readonly string[]).includes(fromUrl)))
            return fromUrl;
        if (typeof window !== "undefined") {
            const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
            if (stored && (stored === "all" || (locales as readonly string[]).includes(stored)))
                return stored;
        }
        return "all";
    });
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const perPage = 20;
    const { toast } = useToast();
    const [categoryOptions, setCategoryOptions] = useState<{
        value: string;
        label: string;
        depth: number;
    }[]>([]);
    const categoryMap = Object.fromEntries(categoryOptions.map(c => [c.value, c.label]));
    useEffect(() => {
        listCategoryTree().then(tree => setCategoryOptions(flattenCategoryTree(tree))).catch(() => { });
    }, []);
    const [activeTab, setActiveTab] = useState(["content", "category"].includes(searchParams.get("tab") ?? "") ? searchParams.get("tab")! : "content");
    const handleTabChange = useCallback((value: string) => {
        setActiveTab(value);
        const sp = new URLSearchParams(searchParams.toString());
        sp.set("tab", value);
        router.replace(`?${sp.toString()}`, { scroll: false });
    }, [router, searchParams]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createTitle, setCreateTitle] = useState("");
    const [creating, setCreating] = useState(false);
    // debounce search
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchName); setPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [searchName]);
    const updateUrl = useCallback((params: Record<string, string | number>) => {
        const sp = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(params)) {
            if (v && v !== "all")
                sp.set(k, String(v));
            else
                sp.delete(k);
        }
        router.replace(`?${sp.toString()}`, { scroll: false });
    }, [router, searchParams]);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await listCmsContents({
                category_id: category !== "all" ? category : undefined,
                search: debouncedSearch || undefined,
                language: language !== "all" ? language : undefined,
                sort_by: sortBy,
                sort_order: sortOrder,
                page,
                per_page: perPage,
            });
            setContents(result.data ?? []);
            setTotal(result.pagination?.total ?? 0);
            setTotalPages(result.pagination?.total_pages ?? 1);
        }
        catch (err) {
            console.error("Failed to load contents", err);
            setError("Failed to load contents");
        }
        finally {
            setLoading(false);
        }
    }, [category, debouncedSearch, language, sortBy, sortOrder, page]);
    useEffect(() => {
        if (capabilities.is_super_admin) {
            load();
            updateUrl({ category, search: debouncedSearch, language, sort_by: sortBy, sort_order: sortOrder, page });
        }
    }, [capabilities.is_super_admin, load]);
    // persist language filter
    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        }
    }, [language]);
    useEffect(() => {
        if (!capabilities.is_super_admin) {
            router.push("/");
        }
    }, [capabilities, router]);
    // reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [category, language, sortBy, sortOrder]);
    const handleCreate = async () => {
        if (!createTitle.trim())
            return;
        setCreating(true);
        const title = createTitle.trim();
        const slug = toSlug(title);
        try {
            const created = await createCmsContent({ title, slug });
            setCreateDialogOpen(false);
            setCreateTitle("");
            router.push(`/admin/cms/${created.id}?language=${created.language || "en"}`);
        }
        catch (err) {
            toast({ title: "Error", description: String(err), variant: "destructive" });
        }
        finally {
            setCreating(false);
        }
    };
    const hasActiveFilters = category !== "all" || language !== "all" || searchName || sortBy !== "created_at" || sortOrder !== "desc";
    if (!capabilities.is_super_admin) {
        return (<div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive"/>
              <CardTitle>Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>);
    }
    return (<div className="container mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <PenSquare className="h-6 w-6 text-primary"/>
        <div>
          <h1 className="text-2xl font-bold">CMS Contents</h1>
          <p className="text-sm text-muted-foreground">Manage all content entries</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="category">Category</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <h2 className="text-lg font-semibold">Contents</h2>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} items` : "No items yet"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Clear all */}
          {hasActiveFilters && (<button className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" onClick={() => { setSearchName(""); setCategory("all"); setLanguage("all"); setSortBy("created_at"); setSortOrder("desc"); }}>
              Clear
            </button>)}
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
            <input type="text" placeholder="Search title/description..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="h-8 w-52 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"/>
            {searchName && (<button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchName("")}>
                <X className="h-3.5 w-3.5"/>
              </button>)}
          </div>
          {/* Category */}
          <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categoryOptions.map((c) => (<option key={c.value} value={c.value}>
                {"\u00a0\u00a0".repeat(c.depth)}{c.depth > 0 ? "↳ " : ""}{c.label}
              </option>))}
          </select>
          {/* Language */}
          <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="all">All Languages</option>
            {locales.map((lng) => (<option key={lng} value={lng}>{LANGUAGE_LABELS[lng] ?? lng.toUpperCase()}</option>))}
          </select>
          {/* Sort */}
          <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
          <button className="h-8 w-8 rounded-md border border-input bg-background text-sm flex items-center justify-center hover:bg-muted" onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}>
            {sortOrder === "desc" ? "\u2193" : "\u2191"}
          </button>
          {/* Refresh */}
          <Button variant="outline" size="sm" className="h-8" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5"/>
            Add Content
          </Button>
        </div>
      </div>

      {/* Contents Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (<div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-12 w-full"/>))}
            </div>) : error ? (<div className="p-6 text-destructive text-sm">{error}</div>) : contents.length === 0 ? (<div className="p-6 text-center text-muted-foreground">No contents found.</div>) : (<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Translations</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contents.map((item) => {
                const href = `/admin/cms/${item.id}?language=${item.language}`;
                return (<TableRow key={item.id} className="cursor-pointer" onClick={(e) => {
                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                            window.open(href, "_blank");
                        }
                        else {
                            router.push(href);
                        }
                    }} onAuxClick={(e) => {
                        if (e.button === 1) {
                            e.preventDefault();
                            window.open(href, "_blank");
                        }
                    }}>
                    <TableCell>
                      <Link href={href} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                        {item.language && LANGUAGE_COUNTRY[item.language] && (<ReactCountryFlag countryCode={LANGUAGE_COUNTRY[item.language]} svg style={{ width: "1.25em", height: "1.25em" }} title={LANGUAGE_LABELS[item.language] ?? item.language}/>)}
                        {item.featured && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500"/>}
                        <div>
                          <div className="font-medium text-sm">{item.title}</div>
                          {item.description && (<div className="text-xs text-muted-foreground truncate max-w-[300px]">{item.description}</div>)}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {item.category_id ? (categoryMap[item.category_id] ?? <span className="font-mono">{item.category_id.slice(0, 8)}…</span>) : "—"}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch checked={item.status === "published"} disabled={togglingIds.has(item.id)} onCheckedChange={async (checked) => {
                        setTogglingIds(prev => new Set(prev).add(item.id));
                        try {
                            const updated = await toggleCmsContentPublish(item.id, checked ? "publish" : "unpublish");
                            setContents(prev => prev.map(c => c.id === item.id ? { ...c, status: updated.status } : c));
                        }
                        catch (err) {
                            toast({ title: "Error", description: String(err), variant: "destructive" });
                        }
                        finally {
                            setTogglingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
                        }
                    }}/>
                    </TableCell>
                    <TableCell>
                      {item.translations_stats
                        ? <span className="text-xs text-muted-foreground">{item.translations_stats.published}p / {item.translations_stats.total}t</span>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">v{item.version_number}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{formatDate(item.updated_at)}</span>
                    </TableCell>
                  </TableRow>);
            })}
              </TableBody>
            </Table>)}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!error && (<div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(1)}>
            First
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.max(totalPages, page)}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>)}
        </TabsContent>

        <TabsContent value="category">
          <CategoryTab />
        </TabsContent>
      </Tabs>

      {/* Create Content Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Content</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Page title..." onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
            }
        }} autoFocus/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !createTitle.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
export default function CmsPage() {
    return (<Suspense>
      <CmsPageInner />
    </Suspense>);
}
