"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"

/** Pre-process markdown: convert ![alt](url =WxH) to <img> tags */
function preprocessImgSize(md: string): string {
  return md.replace(
    /!\[([^\]]*)\]\((\S+?)\s+=(\d+)?[x×](\d+)?\)/g,
    (_match, alt, url, w, h) => {
      const attrs = [`src="${url}"`, `alt="${alt}"`]
      if (w) attrs.push(`width="${w}"`)
      if (h) attrs.push(`height="${h}"`)
      return `<img ${attrs.join(" ")} />`
    }
  )
}
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, ChevronRight, Download, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useTheme } from "next-themes"

interface Category {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description: string
  path: string
  depth: number
  sort_order: number
  is_active: boolean
  languages?: Record<string, { name?: string; description?: string }>
  children?: Category[]
}

function getCatName(cat: Category, locale: string): string {
  if (locale !== "en" && cat.languages?.[locale]?.name) {
    return cat.languages[locale].name!
  }
  return cat.name
}

interface ContentItem {
  id: string
  title: string
  slug: string
  description: string
  version_number?: number
  metadata?: Record<string, string>
}

interface ContentDetail {
  id: string
  title: string
  slug: string
  language: string
  description: string
  body: string
  status: string
  version_number: number
  metadata: Record<string, string>
  created_at: string
  updated_at: string
  published_at: string
}

function ContentList({ categoryId, categoryPath, initialContentSlug, onSlugNotFound }: { categoryId: string; categoryPath: string; initialContentSlug?: string | null; onSlugNotFound?: (slug: string) => void }) {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const { resolvedTheme } = useTheme()
  const [detailLoading, setDetailLoading] = useState(false)
  const { locale } = useLanguage()
  const router = useRouter()

  const loadContent = (item: ContentItem) => {
    setSelectedContentId(item.id)
    setDetailLoading(true)
    setDetail(null)
    router.replace(`/tutorials/${categoryPath}/${item.slug}`, { scroll: false })
    api.get(`/api/v1/contents/${item.id}?language=${locale}`)
      .then((res) => setDetail(res as ContentDetail))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }

  useEffect(() => {
    if (detail) {
      // Delay to override Next.js metadata reset after router.replace
      const timer = setTimeout(() => {
        document.title = `${detail.title} | Sai Game`
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [detail])

  useEffect(() => {
    setLoading(true)
    setSelectedContentId(null)
    setDetail(null)
    api.get(`/api/v1/categories/${categoryId}/contents?language=${locale}`)
      .then((res) => {
        const data = res?.data ?? res
        const items: ContentItem[] = Array.isArray(data) ? data : (data?.items ?? data?.contents ?? data?.data ?? [])
        setContents(items)
        if (initialContentSlug) {
          const match = items.find((i) => i.slug === initialContentSlug)
          if (match) loadContent(match)
          else onSlugNotFound?.(initialContentSlug)
        }
      })
      .catch(() => setContents([]))
      .finally(() => setLoading(false))
  }, [categoryId, locale])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (contents.length === 0) {
    return <p className="text-muted-foreground text-sm">No content available.</p>
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contents.map((item) => {
          const metaEntries = Object.entries(item.metadata ?? {})
          return (
            <div
              key={item.id}
              className={cn(
                "border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors",
                selectedContentId === item.id && "border-primary bg-accent"
              )}
              onClick={() => loadContent(item)}
            >
              <h3 className="font-medium">{item.title}</h3>
              {metaEntries.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t">
                  {metaEntries.map(([key, value]) => (
                    <p key={key} className="text-sm">
                      <span className="text-muted-foreground">{key}:</span> {value}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {detailLoading && (
        <div className="flex items-center gap-2 text-muted-foreground mt-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading content...</span>
        </div>
      )}

      {detail && (
        <div className="mt-6 border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold mb-2">{detail.title}</h2>
            <span className="text-xs text-muted-foreground shrink-0">v{detail.version_number}</span>
          </div>
          {detail.description && (
            <p className="text-sm text-muted-foreground mb-3">{detail.description}</p>
          )}
          {detail.body && (
            <div className={cn("prose prose-sm max-w-none", resolvedTheme?.includes("dark") && "prose-invert")}>
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                >{preprocessImgSize(detail.body)}</ReactMarkdown>
              </div>
          )}
          {Object.keys(detail.metadata ?? {}).length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-4 border-t">
              {Object.entries(detail.metadata).map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="text-muted-foreground">{key}:</span> {value}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CategoryMenuItem({
  category,
  selectedId,
  onSelect,
  level = 0,
  locale,
}: {
  category: Category
  selectedId: string | null
  onSelect: (cat: Category) => void
  level?: number
  locale: string
}) {
  const children = (category.children ?? [])
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div>
      <button
        onClick={() => onSelect(category)}
        className={cn(
          "w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent transition-colors",
          selectedId === category.id && "bg-accent font-medium"
        )}
        style={{ paddingLeft: `${level * 30 + 12}px` }}
      >
        {children.length > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
        {getCatName(category, locale)}
      </button>
      {children.length > 0 && (
        <div>
          {children.map((child) => (
            <CategoryMenuItem
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategorySidebar({
  category,
  selectedId,
  onSelect,
  locale,
  initialContentSlug,
  onSlugNotFound,
}: {
  category: Category
  selectedId: string | null
  onSelect: (cat: Category) => void
  locale: string
  initialContentSlug?: string | null
  onSlugNotFound?: (slug: string) => void
}) {
  const children = (category.children ?? [])
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)

  // Find the selected child's path to pass to ContentList
  const selectedChild = selectedId
    ? children.find((c) => c.id === selectedId) ?? findCategoryById(children, selectedId)
    : null

  if (children.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {category.description || `${category.name} tutorials content coming soon.`}
      </p>
    )
  }

  return (
    <div className="flex gap-6">
      <nav className="w-56 flex-shrink-0 space-y-1 border-r pr-4">
        {children.map((child) => (
          <CategoryMenuItem
            key={child.id}
            category={child}
            selectedId={selectedId}
            onSelect={onSelect}
            locale={locale}
          />
        ))}
      </nav>
      <div className="flex-1 min-w-0">
        {selectedId && selectedChild ? (
          <ContentList categoryId={selectedId} categoryPath={selectedChild.path} initialContentSlug={initialContentSlug} onSlugNotFound={onSlugNotFound} />
        ) : (
          <p className="text-muted-foreground text-sm">Select a topic from the menu.</p>
        )}
      </div>
    </div>
  )
}

function getAllLeafCategories(categories: Category[]): Category[] {
  const leaves: Category[] = []
  for (const cat of categories) {
    const children = (cat.children ?? []).filter((c) => c.is_active)
    if (children.length === 0) {
      leaves.push(cat)
    } else {
      leaves.push(...getAllLeafCategories(children))
    }
  }
  return leaves
}

function findCategoryById(categories: Category[], id: string): Category | null {
  for (const cat of categories) {
    if (cat.id === id) return cat
    if (cat.children) {
      const found = findCategoryById(cat.children, id)
      if (found) return found
    }
  }
  return null
}

function findCategoryByPath(categories: Category[], path: string): Category | null {
  for (const cat of categories) {
    if (cat.path === path) return cat
    if (cat.children) {
      const found = findCategoryByPath(cat.children, path)
      if (found) return found
    }
  }
  return null
}

function findRootForPath(categories: Category[], path: string): Category | null {
  for (const root of categories) {
    if (path === root.path || path.startsWith(root.path + "/")) return root
  }
  return null
}

function TutorialsTabs() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const params = useParams()
  const router = useRouter()
  const { locale } = useLanguage()

  const fullPath = params.path
    ? (Array.isArray(params.path) ? params.path.join("/") : params.path)
    : null

  // Will be resolved after categories load: split fullPath into categoryPath + contentSlug
  const [contentSlug, setContentSlug] = useState<string | null>(null)

  const navigateTo = useCallback((path: string | null, slug?: string | null) => {
    const base = path ? `/tutorials/${path}` : "/tutorials"
    const url = slug ? `${base}/${slug}` : base
    router.replace(url, { scroll: false })
  }, [router])

  useEffect(() => {
    api.get("/api/v1/categories")
      .then((res) => {
        const roots = (res.data as Category[])
          .filter((c) => c.parent_id === null && c.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)
        setCategories(roots)

        if (fullPath) {
          // Try exact category match first
          let matched = findCategoryByPath(roots, fullPath)
          let root = findRootForPath(roots, fullPath)
          let detectedSlug: string | null = null

          if (!matched) {
            // Last segment might be content slug
            const lastSlash = fullPath.lastIndexOf("/")
            if (lastSlash > 0) {
              const catPath = fullPath.substring(0, lastSlash)
              detectedSlug = fullPath.substring(lastSlash + 1)
              matched = findCategoryByPath(roots, catPath)
              root = findRootForPath(roots, catPath)
            }
          }

          if (root) setActiveTab(root.slug)
          if (matched) {
            setSelectedChildId(matched.id)
            if (!detectedSlug) setTimeout(() => { document.title = `${getCatName(matched!, locale)} | Sai Game` }, 100)
          }
          if (detectedSlug) setContentSlug(detectedSlug)
        }
        if (!fullPath || !findRootForPath(roots, fullPath)) {
          // Also check without last segment
          const lastSlash = fullPath?.lastIndexOf("/") ?? -1
          const catPath = lastSlash > 0 ? fullPath!.substring(0, lastSlash) : null
          if (catPath && findRootForPath(roots, catPath)) {
            // already handled above
          } else {
            setActiveTab(roots[0]?.slug ?? null)
          }
        }
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  const handleTabChange = (slug: string) => {
    setActiveTab(slug)
    setSelectedChildId(null)
    setContentSlug(null)
    const root = categories.find((c) => c.slug === slug)
    navigateTo(root?.path ?? null)
  }

  // When content slug not found in current category, search all leaf categories
  const handleSlugNotFound = useCallback(async (slug: string) => {
    const allLeaves = getAllLeafCategories(categories)
    for (const leaf of allLeaves) {
      if (leaf.id === selectedChildId) continue // already checked
      try {
        const res = await api.get(`/api/v1/categories/${leaf.id}/contents?language=${locale}`)
        const data = (res as any)?.data ?? res
        const items: ContentItem[] = Array.isArray(data) ? data : (data?.items ?? data?.contents ?? data?.data ?? [])
        const match = items.find((i) => i.slug === slug)
        if (match) {
          // Found — redirect to correct category
          const root = findRootForPath(categories, leaf.path)
          if (root) setActiveTab(root.slug)
          setSelectedChildId(leaf.id)
          setContentSlug(slug)
          navigateTo(leaf.path, slug)
          return
        }
      } catch { /* skip */ }
    }
  }, [categories, selectedChildId, locale, navigateTo])

  const handleSelectCategory = (cat: Category) => {
    setSelectedChildId(cat.id)
    setContentSlug(null)
    navigateTo(cat.path)
    setTimeout(() => { document.title = `${getCatName(cat, locale)} | Sai Game` }, 100)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Learning Center</h1>
          <p className="text-sm text-muted-foreground">Tutorials and resources to get started</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : activeTab ? (
        <Tabs
          value={activeTab}
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="mb-4">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.slug} className="flex items-center gap-2">
                {getCatName(cat, locale)}
              </TabsTrigger>
            ))}
            <TabsTrigger
              value="_download"
              className="flex items-center gap-2"
              onClick={(e) => {
                e.preventDefault()
                window.open("https://github.com/SaiGame-studio/ss-unity/releases", "_blank")
              }}
            >
              <Download className="h-4 w-4" />
              Unity Package
              <ExternalLink className="h-3 w-3 opacity-50" />
            </TabsTrigger>
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.slug} className="mt-0">
              <CategorySidebar
                category={cat}
                selectedId={selectedChildId}
                onSelect={handleSelectCategory}
                locale={locale}
                initialContentSlug={contentSlug}
                onSlugNotFound={handleSlugNotFound}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : null}
    </div>
  )
}

export default function TutorialsPage() {
  return (
    <Suspense>
      <TutorialsTabs />
    </Suspense>
  )
}
