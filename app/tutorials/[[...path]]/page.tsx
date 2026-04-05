"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, ChevronRight, Download, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { useLanguage } from "@/lib/i18n/LanguageContext"

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
  children?: Category[]
}

interface ContentItem {
  id: string
  title: string
  description: string
  metadata?: Record<string, string>
}

function ContentList({ categoryId }: { categoryId: string }) {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const { locale } = useLanguage()

  useEffect(() => {
    setLoading(true)
    api.get(`/api/v1/categories/${categoryId}/contents?language=${locale}`)
      .then((res) => setContents((res.data?.data ?? res.data ?? []) as ContentItem[]))
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
    <div className="space-y-2">
      {contents.map((item) => {
        const metaEntries = Object.entries(item.metadata ?? {})
        const metaCol1 = metaEntries.slice(0, 2)
        const metaCol2 = metaEntries.slice(2, 4)
        const metaCol3 = metaEntries.slice(4, 5)

        return (
          <div key={item.id} className="grid grid-cols-6 gap-4 border rounded-lg p-4 items-start">
            <div className="col-span-3">
              <h3 className="font-medium">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              )}
            </div>
            <div className="space-y-1">
              {metaCol1.map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="text-muted-foreground">{key}:</span> {value}
                </p>
              ))}
            </div>
            <div className="space-y-1">
              {metaCol2.map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="text-muted-foreground">{key}:</span> {value}
                </p>
              ))}
            </div>
            <div className="space-y-1">
              {metaCol3.map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="text-muted-foreground">{key}:</span> {value}
                </p>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CategoryMenuItem({
  category,
  selectedId,
  onSelect,
  level = 0,
}: {
  category: Category
  selectedId: string | null
  onSelect: (cat: Category) => void
  level?: number
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
        {category.name}
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
}: {
  category: Category
  selectedId: string | null
  onSelect: (cat: Category) => void
}) {
  const children = (category.children ?? [])
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)

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
          />
        ))}
      </nav>
      <div className="flex-1 min-w-0">
        {selectedId ? (
          <ContentList categoryId={selectedId} />
        ) : (
          <p className="text-muted-foreground text-sm">Select a topic from the menu.</p>
        )}
      </div>
    </div>
  )
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

  const currentPath = params.path
    ? (Array.isArray(params.path) ? params.path.join("/") : params.path)
    : null

  const navigateTo = useCallback((path: string | null) => {
    if (path) {
      router.replace(`/tutorials/${path}`, { scroll: false })
    } else {
      router.replace("/tutorials", { scroll: false })
    }
  }, [router])

  useEffect(() => {
    api.get("/api/v1/categories")
      .then((res) => {
        const roots = (res.data as Category[])
          .filter((c) => c.parent_id === null && c.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)
        setCategories(roots)

        if (currentPath) {
          const matched = findCategoryByPath(roots, currentPath)
          const root = findRootForPath(roots, currentPath)
          if (root) setActiveTab(root.slug)
          if (matched) setSelectedChildId(matched.id)
        }
        if (!currentPath || !findRootForPath(roots, currentPath)) {
          setActiveTab(roots[0]?.slug ?? null)
        }
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  const handleTabChange = (slug: string) => {
    setActiveTab(slug)
    setSelectedChildId(null)
    const root = categories.find((c) => c.slug === slug)
    navigateTo(root?.path ?? null)
  }

  const handleSelectCategory = (cat: Category) => {
    setSelectedChildId(cat.id)
    navigateTo(cat.path)
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
                {cat.name}
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
