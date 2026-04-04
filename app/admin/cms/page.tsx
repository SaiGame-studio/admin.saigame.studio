"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCapabilities } from "@/hooks/use-capabilities"
import { PenSquare, ShieldAlert, Search, RefreshCw, Star, Globe, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { listCmsContents, CmsContent } from "@/lib/admin-api"
import { Suspense } from "react"

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "tutorial", label: "Tutorial" },
  { value: "guide", label: "Guide" },
  { value: "faq", label: "FAQ" },
  { value: "documentation", label: "Documentation" },
]

const LANGUAGES = [
  { value: "all", label: "All Languages" },
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
]

const SORT_OPTIONS = [
  { value: "created_at", label: "Created At" },
  { value: "updated_at", label: "Updated At" },
  { value: "title", label: "Title" },
]

function statusBadgeVariant(status: string) {
  switch (status) {
    case "published": return "default" as const
    case "draft": return "secondary" as const
    case "archived": return "outline" as const
    default: return "secondary" as const
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function CmsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const capabilities = useCapabilities()

  const [contents, setContents] = useState<CmsContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [category, setCategory] = useState(searchParams.get("category") || "all")
  const [language, setLanguage] = useState(searchParams.get("language") || "all")
  const [searchName, setSearchName] = useState(searchParams.get("search") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(searchName)
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "created_at")
  const [sortOrder, setSortOrder] = useState(searchParams.get("sort_order") || "desc")
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1)
  const perPage = 20

  // debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchName); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchName])

  const updateUrl = useCallback((params: Record<string, string | number>) => {
    const sp = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(params)) {
      if (v && v !== "all") sp.set(k, String(v))
      else sp.delete(k)
    }
    router.replace(`?${sp.toString()}`, { scroll: false })
  }, [router, searchParams])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listCmsContents({
        category: category !== "all" ? category : undefined,
        language: language !== "all" ? language : undefined,
        search: debouncedSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        per_page: perPage,
      })
      setContents(result.data ?? [])
      setTotal(result.pagination?.total ?? 0)
      setTotalPages(result.pagination?.total_pages ?? 1)
    } catch (err) {
      console.error("Failed to load contents", err)
      setError("Failed to load contents")
    } finally {
      setLoading(false)
    }
  }, [category, language, debouncedSearch, sortBy, sortOrder, page])

  useEffect(() => {
    if (capabilities.is_super_admin) {
      load()
      updateUrl({ category, language, search: debouncedSearch, sort_by: sortBy, sort_order: sortOrder, page })
    }
  }, [capabilities.is_super_admin, load])

  useEffect(() => {
    if (!capabilities.is_super_admin) {
      router.push("/")
    }
  }, [capabilities, router])

  // reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [category, language, sortBy, sortOrder])

  const hasActiveFilters = category !== "all" || language !== "all" || searchName || sortBy !== "created_at" || sortOrder !== "desc"

  if (!capabilities.is_super_admin) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <PenSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">CMS Contents</h1>
          <p className="text-sm text-muted-foreground">Manage all content entries</p>
        </div>
      </div>

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
          {hasActiveFilters && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={() => { setSearchName(""); setCategory("all"); setLanguage("all"); setSortBy("created_at"); setSortOrder("desc") }}
            >
              Clear
            </button>
          )}
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search title/description..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="h-8 w-52 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {searchName && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchName("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {/* Category */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="capitalize">{c.label}</option>
            ))}
          </select>
          {/* Language */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          {/* Sort */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            className="h-8 w-8 rounded-md border border-input bg-background text-sm flex items-center justify-center hover:bg-muted"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          >
            {sortOrder === "desc" ? "\u2193" : "\u2191"}
          </button>
          {/* Refresh */}
          <Button variant="outline" size="sm" className="h-8" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Contents Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-destructive text-sm">{error}</div>
          ) : contents.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No contents found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contents.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/admin/cms/${item.id}?language=${item.language}`)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.featured && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                        <div>
                          <div className="font-medium text-sm">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">{item.category_path}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs uppercase">{item.language}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(item.status)} className="text-xs">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {item.tags?.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{item.tags.length - 3}</span>
                        )}
                      </div>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default function CmsPage() {
  return (
    <Suspense>
      <CmsPageInner />
    </Suspense>
  )
}
