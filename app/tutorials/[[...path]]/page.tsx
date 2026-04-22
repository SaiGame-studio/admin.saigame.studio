"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"

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
import { BookOpen, ChevronDown, ChevronRight, Clock, Download, ExternalLink, Eye, Loader2, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getToken } from "@/lib/auth-utils"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useTranslation } from "@/lib/i18n/use-translation"
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

function UpvoteButton({ contentId, count }: { contentId: string; count?: string | number }) {
  const [upvoteCount, setUpvoteCount] = useState(Number(count ?? 0))
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { t } = useTranslation()

  const handleClick = () => {
    const token = getToken()
    if (!token) {
      window.open("/login", "_blank")
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    setConfirmOpen(false)
    if (loading) return
    setLoading(true)
    try {
      const res = await api.post(`/api/v1/contents/${contentId}/upvote`) as { upvote_count?: number }
      if (res?.upvote_count != null) setUpvoteCount(res.upvote_count)
      else setUpvoteCount((c) => c + 1)
      window.dispatchEvent(new Event("wallet:refresh"))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
        title="Upvote"
      >
        <ThumbsUp className="h-5 w-5" />
        <span className="text-xs font-medium">{upvoteCount}</span>
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('content.confirmUpvoteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('content.confirmUpvoteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>{t('content.confirmUpvoteBtn')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ContentList({ categoryId, categoryPath, initialContentSlug, onSlugNotFound }: { categoryId: string; categoryPath: string; initialContentSlug?: string | null; onSlugNotFound?: (slug: string) => void }) {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const { resolvedTheme } = useTheme()
  const [detailLoading, setDetailLoading] = useState(false)
  const { locale } = useLanguage()
  const { t } = useTranslation()

  const loadContent = (item: ContentItem) => {
    setSelectedContentId(item.id)
    setDetailLoading(true)
    setDetail(null)
    window.history.replaceState(null, "", `/tutorials/${categoryPath}/${item.slug}`)
    api.get(`/api/v1/contents/${item.id}?language=${locale}`, { requireAuth: false })
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
    api.get(`/api/v1/categories/${categoryId}/contents?language=${locale}`, { requireAuth: false })
      .then((res) => {
        const data = res?.data ?? res
        const items: ContentItem[] = Array.isArray(data) ? data : (data?.items ?? data?.contents ?? data?.data ?? [])
        items.sort((a, b) => a.title.localeCompare(b.title))
        setContents(items)
        if (initialContentSlug) {
          const match = items.find((i) => i.slug === initialContentSlug)
          if (match) loadContent(match)
          else onSlugNotFound?.(initialContentSlug)
        } else if (items.length > 0) {
          loadContent(items[0])
        }
      })
      .catch(() => setContents([]))
      .finally(() => setLoading(false))
  }, [categoryId, locale])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('tutorials.loading')}</span>
      </div>
    )
  }

  if (contents.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('tutorials.noContent')}</p>
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contents.map((item) => {
          return (
            <a
              key={item.id}
              href={`/tutorials/${categoryPath}/${item.slug}`}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return
                e.preventDefault()
                loadContent(item)
              }}
              className={cn(
                "border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors no-underline text-inherit block",
                selectedContentId === item.id && "border-primary bg-accent"
              )}
            >
              <h3 className="font-medium">{item.title}</h3>
            </a>
          )
        })}
      </div>

      {detailLoading && (
        <div className="flex items-center gap-2 text-muted-foreground mt-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('tutorials.loadingContent')}</span>
        </div>
      )}

      {detail && (
        <div className="mt-6 border rounded-lg p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UpvoteButton contentId={detail.id} count={detail.metadata?.upvote_count} />
              <h2 className="text-2xl font-bold break-words min-w-0 sm:text-3xl lg:text-4xl">{detail.title}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              {detail.metadata?.view_count != null && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {detail.metadata.view_count}
                </span>
              )}
              <span>v{detail.version_number}</span>
            </div>
          </div>
          {detail.metadata?.learn_time && (
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {detail.metadata.learn_time}
            </p>
          )}
          {detail.body && (
            <div className={cn("prose prose-sm max-w-none", resolvedTheme?.includes("dark") && "prose-invert")}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >{preprocessImgSize(detail.body)}</ReactMarkdown>
              </div>
          )}
          <div className="flex justify-start mt-4">
            <UpvoteButton contentId={detail.id} count={detail.metadata?.upvote_count} />
          </div>
        </div>
      )}
    </div>
  )
}

function isCategoryDescendantSelected(category: Category, selectedId: string): boolean {
  for (const child of category.children ?? []) {
    if (child.id === selectedId) return true
    if (isCategoryDescendantSelected(child, selectedId)) return true
  }
  return false
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

  const hasChildren = children.length > 0

  const descendantSelected = hasChildren && selectedId
    ? isCategoryDescendantSelected(category, selectedId)
    : false

  const [isOpen, setIsOpen] = useState(() => descendantSelected)

  useEffect(() => {
    if (descendantSelected) setIsOpen(true)
  }, [descendantSelected])

  return (
    <div>
      <a
        href={`/tutorials/${category.path}`}
        onClick={(e) => {
          // Allow Ctrl/Cmd+click or middle-click to open in a new tab natively
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return
          e.preventDefault()
          if (hasChildren) {
            setIsOpen((prev) => !prev)
          } else {
            onSelect(category)
          }
        }}
        className={cn(
          "w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent transition-colors no-underline text-inherit",
          selectedId === category.id && "bg-accent font-medium"
        )}
        style={{ paddingLeft: `${level * 30 + 12}px` }}
      >
        {hasChildren && (
          isOpen
            ? <ChevronDown className="h-3 w-3 flex-shrink-0" />
            : <ChevronRight className="h-3 w-3 flex-shrink-0" />
        )}
        {getCatName(category, locale)}
        {hasChildren && (
          <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 leading-none">
            {children.length}
          </span>
        )}
      </a>
      {hasChildren && isOpen && (
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

  const { t } = useTranslation()

  if (children.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {category.description || `${category.name} ${t('tutorials.comingSoon')}`}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <nav className="space-y-1 border-b pb-4 md:w-56 md:flex-shrink-0 md:border-b-0 md:border-r md:pb-0 md:pr-4">
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
          <p className="text-muted-foreground text-sm">{t('tutorials.selectTopic')}</p>
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
  const { locale } = useLanguage()
  const { t } = useTranslation()

  const fullPath = params.path
    ? (Array.isArray(params.path) ? params.path.join("/") : params.path)
    : null

  // Will be resolved after categories load: split fullPath into categoryPath + contentSlug
  const [contentSlug, setContentSlug] = useState<string | null>(null)

  const navigateTo = useCallback((path: string | null, slug?: string | null) => {
    const base = path ? `/tutorials/${path}` : "/tutorials"
    const url = slug ? `${base}/${slug}` : base
    window.history.replaceState(null, "", url)
  }, [])

  useEffect(() => {
    api.get("/api/v1/categories", { requireAuth: false })
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
        const res = await api.get(`/api/v1/categories/${leaf.id}/contents?language=${locale}`, { requireAuth: false })
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
    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <BookOpen className="h-6 w-6 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl truncate">{t('tutorials.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('tutorials.subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('tutorials.loading')}</span>
        </div>
      ) : activeTab ? (
        <Tabs
          value={activeTab}
          className="w-full"
          onValueChange={handleTabChange}
        >
          <div className="-mx-4 px-4 overflow-x-auto mb-4 sm:mx-0 sm:px-0">
            <TabsList className="w-auto inline-flex">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.slug} className="flex items-center gap-2 whitespace-nowrap">
                  {getCatName(cat, locale)}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="_download"
                className="flex items-center gap-2 whitespace-nowrap"
                onClick={(e) => {
                  e.preventDefault()
                  window.open("https://github.com/SaiGame-studio/ss-unity/releases", "_blank")
                }}
              >
                <Download className="h-4 w-4 shrink-0" />
                {t('tutorials.unityPackage')}
                <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
              </TabsTrigger>
            </TabsList>
          </div>

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
