"use client"

import { Suspense, useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, ChevronRight, Download, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"

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
        style={{ paddingLeft: `${level * 16 + 12}px` }}
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
          <p className="text-muted-foreground text-sm">Content coming soon.</p>
        ) : (
          <p className="text-muted-foreground text-sm">Select a topic from the menu.</p>
        )}
      </div>
    </div>
  )
}

function TutorialsTabs() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  useEffect(() => {
    api.get("/api/v1/categories")
      .then((res) => {
        const roots = (res.data as Category[])
          .filter((c) => c.parent_id === null && c.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)
        setCategories(roots)
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  const defaultTab = categories[0]?.slug

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
      ) : (
        <Tabs
          defaultValue={defaultTab}
          className="w-full"
          onValueChange={() => setSelectedChildId(null)}
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
                onSelect={(c) => setSelectedChildId(c.id)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
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
