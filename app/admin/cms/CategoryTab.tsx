"use client"

import { useState, useCallback, useEffect } from "react"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, DragStartEvent, DragEndEvent, DragMoveEvent, DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  listCategoryTree, createCategory, updateCategory, deleteCategory,
  toggleCategoryPublish, ContentCategory, CategoryLanguage,
} from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import {
  ChevronRight, ChevronDown, Plus, RefreshCw, Pencil, Trash2,
  FolderTree, Loader2, FolderPlus, GripVertical, Globe, X as XIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CopyButton } from "@/components/CopyButton"
import { useLanguage } from "@/lib/i18n/LanguageContext"

function getCategoryName(cat: ContentCategory, locale: string): string {
  if (locale !== "en" && cat.languages?.[locale]?.name) {
    return cat.languages[locale].name
  }
  return cat.name
}

const INDENT_PX = 20

import { toSlug } from "@/lib/utils"

function slugify(name: string): string {
  return toSlug(name)
}

// ─── Flatten ─────────────────────────────────────────────────────────────────

interface FlatNode {
  id: string
  category: ContentCategory
  depth: number
  parentId: string | null
}

function flattenVisible(
  cats: ContentCategory[],
  collapsed: Set<string>,
  depth = 0,
  parentId: string | null = null,
): FlatNode[] {
  const result: FlatNode[] = []
  const sorted = [...cats].sort((a, b) => a.sort_order - b.sort_order)
  for (const cat of sorted) {
    result.push({ id: cat.id, category: cat, depth, parentId })
    if (!collapsed.has(cat.id) && cat.children?.length) {
      result.push(...flattenVisible(cat.children, collapsed, depth + 1, cat.id))
    }
  }
  return result
}

function countAll(cats: ContentCategory[]): number {
  let n = 0
  for (const c of cats) { n++; if (c.children?.length) n += countAll(c.children) }
  return n
}

// ─── Projection ──────────────────────────────────────────────────────────────

interface Projected {
  depth: number
  parentId: string | null
  sortOrder: number
}

function getProjection(
  items: FlatNode[],
  activeId: string,
  overId: string,
  deltaX: number,
): Projected {
  const activeIndex = items.findIndex(i => i.id === activeId)
  const overIndex = items.findIndex(i => i.id === overId)
  if (activeIndex === -1 || overIndex === -1) {
    const a = items.find(i => i.id === activeId)
    return { depth: a?.depth ?? 0, parentId: a?.parentId ?? null, sortOrder: 0 }
  }

  const newItems = arrayMove(items, activeIndex, overIndex)
  const prevItem = newItems[overIndex - 1]
  const nextItem = newItems[overIndex + 1]

  const projectedDepth = items[activeIndex].depth + Math.round(deltaX / INDENT_PX)
  const maxDepth = prevItem ? Math.min(prevItem.depth + 1, 3) : 0
  const minDepth = nextItem ? nextItem.depth : 0
  const depth = Math.min(Math.max(projectedDepth, minDepth), maxDepth)

  let parentId: string | null = null
  if (depth > 0) {
    for (let i = overIndex - 1; i >= 0; i--) {
      if (newItems[i].id !== activeId && newItems[i].depth === depth - 1) {
        parentId = newItems[i].id
        break
      }
    }
  }

  const sortOrder = newItems
    .slice(0, overIndex)
    .filter(i => i.id !== activeId && i.parentId === parentId)
    .length

  return { depth, parentId, sortOrder }
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────

interface RowProps {
  node: FlatNode
  isOverTarget: boolean
  isProjectedParent: boolean
  showInsertLine: boolean
  insertDepth: number
  onEdit: (cat: ContentCategory) => void
  onDelete: (cat: ContentCategory) => void
  onAddChild: (cat: ContentCategory) => void
  onToggle: (id: string) => void
  onTogglePublish: (cat: ContentCategory, isPublic: boolean) => void
  togglingPublishIds: Set<string>
  collapsed: Set<string>
  locale: string
}

function SortableRow({ node, isOverTarget, isProjectedParent, showInsertLine, insertDepth, onEdit, onDelete, onAddChild, onToggle, onTogglePublish, togglingPublishIds, collapsed, locale }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const hasChildren = (node.category.children?.length ?? 0) > 0
  const isCollapsed = collapsed.has(node.id)
  const canAddChild = node.category.depth < 3

  return (
    <>
    {showInsertLine && (
      <tr className="h-0">
        <td colSpan={7} className="p-0 border-0 relative">
          <div
            className="absolute top-0 h-0.5 bg-primary z-10"
            style={{ left: `${insertDepth * INDENT_PX + 16}px`, right: 0 }}
          />
          <div
            className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-primary z-10"
            style={{ left: `${insertDepth * INDENT_PX + 12}px` }}
          />
        </td>
      </tr>
    )}
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={`border-b transition-colors hover:bg-muted/40 ${isProjectedParent ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""}`}
    >
      <td className="py-2 px-4">
        <div className="flex items-center gap-1" style={{ paddingLeft: `${node.depth * INDENT_PX}px` }}>
          <button
            {...listeners}
            {...attributes}
            className="h-5 w-5 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
            title="Drag to reorder / nest"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            className={`w-5 h-5 flex items-center justify-center text-muted-foreground shrink-0 ${!hasChildren ? "invisible" : ""}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onToggle(node.id)}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{getCategoryName(node.category, locale)}</span>
              {!node.category.is_active && (
                <Badge variant="outline" className="text-xs ml-1 text-muted-foreground">inactive</Badge>
              )}
              {isProjectedParent && (
                <Badge variant="default" className="text-xs ml-1 animate-pulse">parent</Badge>
              )}
            </div>
            <div className="flex items-center gap-0.5 text-muted-foreground/60" onPointerDown={e => e.stopPropagation()}>
              <span className="text-[11px] font-mono leading-tight">{node.category.id}</span>
              <CopyButton text={node.category.id} size="h-3 w-3" />
            </div>
          </div>
        </div>
      </td>
      <td className="py-2 px-4">
        <span className="text-xs font-mono text-muted-foreground">{node.category.path}</span>
      </td>
      <td className="py-2 px-4">
        <span className="text-xs font-mono text-muted-foreground">{node.category.slug}</span>
      </td>
      <td className="py-2 px-4 text-center" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <Switch
          checked={node.category.is_public ?? false}
          disabled={togglingPublishIds.has(node.id)}
          onCheckedChange={(checked) => onTogglePublish(node.category, checked)}
        />
      </td>
      <td className="py-2 px-4 text-center">
        <span className="text-xs text-muted-foreground">{node.category.sort_order}</span>
      </td>
      <td className="py-2 px-4 text-center">
        <span className="text-xs text-muted-foreground">{node.category.depth}</span>
      </td>
      <td className="py-2 px-4">
        <div className="flex items-center gap-0.5 justify-end">
          {canAddChild && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"
              onPointerDown={e => e.stopPropagation()} onClick={() => onAddChild(node.category)} title="Add child">
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"
            onPointerDown={e => e.stopPropagation()} onClick={() => onEdit(node.category)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onPointerDown={e => e.stopPropagation()} onClick={() => onDelete(node.category)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CategoryTab() {
  const { toast } = useToast()
  const { locale } = useLanguage()
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [moving, setMoving] = useState(false)

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [deltaX, setDeltaX] = useState(0)

  // Sheet / Dialog state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ContentCategory | null>(null)
  const [parentCat, setParentCat] = useState<ContentCategory | null>(null)
  const [formName, setFormName] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formOrder, setFormOrder] = useState(0)
  const [formActive, setFormActive] = useState(true)
  const [slugManual, setSlugManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContentCategory | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingPublishIds, setTogglingPublishIds] = useState<Set<string>>(new Set())

  // Translation state
  const SUPPORTED_LANGS = ["vi", "ja"]
  const LANG_LABELS: Record<string, string> = { en: "English", vi: "Tiếng Việt", ja: "日本語" }
  const [formLanguages, setFormLanguages] = useState<Record<string, CategoryLanguage>>({})

  const updateLang = (lang: string, field: "name" | "description", value: string) => {
    setFormLanguages(prev => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }))
  }

  const addLang = (lang: string) => {
    setFormLanguages(prev => ({ ...prev, [lang]: { name: "", description: "" } }))
  }

  const removeLang = (lang: string) => {
    setFormLanguages(prev => {
      const next = { ...prev }
      delete next[lang]
      return next
    })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setCategories(await listCategoryTree()) }
    catch { setError("Failed to load categories") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const flatItems = flattenVisible(categories, collapsed)
  const activeNode = activeId ? flatItems.find(i => i.id === activeId) ?? null : null
  const projected = (activeId && overId)
    ? getProjection(flatItems, activeId, overId, deltaX)
    : null

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // ─── DnD handlers ───
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id)); setOverId(String(active.id)); setDeltaX(0)
  }
  function handleDragMove({ delta }: DragMoveEvent) { setDeltaX(delta.x) }
  function handleDragOver({ over }: DragOverEvent) { setOverId(over ? String(over.id) : null) }

  // Helper: get children of a parentId from the tree
  function getSiblings(tree: ContentCategory[], parentId: string | null): ContentCategory[] {
    if (parentId === null) return tree
    const find = (cats: ContentCategory[]): ContentCategory[] | null => {
      for (const c of cats) {
        if (c.id === parentId) return c.children ?? []
        if (c.children?.length) {
          const found = find(c.children)
          if (found) return found
        }
      }
      return null
    }
    return find(tree) ?? []
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    // Capture snapshot before clearing state
    const snap = activeId && overId ? getProjection(flatItems, activeId, overId, deltaX) : null
    const currentNode = activeId ? flatItems.find(i => i.id === activeId) ?? null : null
    setActiveId(null); setOverId(null); setDeltaX(0)

    // over === null means dropped outside any droppable; allow active===over (same position + slide right to nest)
    if (!over || !snap || !currentNode) return

    const parentChanged = snap.parentId !== currentNode.parentId
    const orderChanged = snap.sortOrder !== currentNode.category.sort_order
    if (!parentChanged && !orderChanged) return

    setMoving(true)
    try {
      const draggedId = String(active.id)
      const oldParentId = currentNode.parentId
      const newParentId = snap.parentId
      const newOrder = snap.sortOrder

      // Build the new sibling order for the target parent
      const targetSiblings = getSiblings(categories, newParentId)
        .filter(c => c.id !== draggedId)
        .sort((a, b) => a.sort_order - b.sort_order)

      // Insert dragged item at the new position
      targetSiblings.splice(newOrder, 0, currentNode.category)

      // Update all siblings in the target parent with sequential sort_order
      const updates: Promise<any>[] = []
      for (let i = 0; i < targetSiblings.length; i++) {
        const sibling = targetSiblings[i]
        const data: Parameters<typeof updateCategory>[1] = {}
        const needsOrderUpdate = sibling.sort_order !== i
        const needsParentUpdate = sibling.id === draggedId && parentChanged

        if (needsOrderUpdate) data.sort_order = i
        if (needsParentUpdate) data.parent_id = newParentId

        if (Object.keys(data).length > 0) {
          updates.push(updateCategory(sibling.id, data))
        }
      }

      // If parent changed, also reorder old parent's siblings (fill the gap)
      if (parentChanged) {
        const oldSiblings = getSiblings(categories, oldParentId)
          .filter(c => c.id !== draggedId)
          .sort((a, b) => a.sort_order - b.sort_order)

        for (let i = 0; i < oldSiblings.length; i++) {
          if (oldSiblings[i].sort_order !== i) {
            updates.push(updateCategory(oldSiblings[i].id, { sort_order: i }))
          }
        }
      }

      await Promise.all(updates)
      toast({ title: "Category moved", description: `${updates.length} item(s) updated` })
      load()
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally { setMoving(false) }
  }

  function handleDragCancel() { setActiveId(null); setOverId(null); setDeltaX(0) }

  // ─── CRUD ───
  const openCreate = (parent?: ContentCategory) => {
    setEditing(null); setParentCat(parent ?? null)
    setFormName(""); setFormSlug(""); setFormDesc("")
    setFormOrder(parent ? (parent.children?.length ?? 0) : categories.length)
    setFormActive(true); setSlugManual(false); setFormLanguages({}); setSheetOpen(true)
  }

  const openEdit = (cat: ContentCategory) => {
    setEditing(cat); setParentCat(null)
    setFormName(cat.name); setFormSlug(cat.slug); setFormDesc(cat.description ?? "")
    setFormOrder(cat.sort_order); setFormActive(cat.is_active); setSlugManual(true)
    setFormLanguages(cat.languages ? JSON.parse(JSON.stringify(cat.languages)) : {})
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formSlug.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing.id, {
          name: formName.trim(), slug: formSlug.trim(),
          description: formDesc.trim() || undefined, sort_order: formOrder, is_active: formActive,
          languages: Object.keys(formLanguages).length > 0 ? formLanguages : undefined,
        })
        toast({ title: "Category updated" })
      } else {
        const created = await createCategory({
          parent_id: parentCat?.id ?? null,
          name: formName.trim(), slug: formSlug.trim(),
          description: formDesc.trim() || undefined, sort_order: formOrder,
        })
        if (Object.keys(formLanguages).length > 0) {
          await updateCategory(created.id, { languages: formLanguages })
        }
        toast({ title: "Category created" })
      }
      setSheetOpen(false); load()
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCategory(deleteTarget.id)
      toast({ title: "Category deleted" }); setDeleteTarget(null); load()
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally { setDeleting(false) }
  }

  const handleTogglePublish = async (cat: ContentCategory, isPublic: boolean) => {
    setTogglingPublishIds(prev => new Set(prev).add(cat.id))
    try {
      await toggleCategoryPublish(cat.id, isPublic)
      // Update local state recursively
      const update = (cats: ContentCategory[]): ContentCategory[] =>
        cats.map(c => c.id === cat.id
          ? { ...c, is_public: isPublic }
          : c.children?.length ? { ...c, children: update(c.children) } : c
        )
      setCategories(update)
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    } finally {
      setTogglingPublishIds(prev => { const s = new Set(prev); s.delete(cat.id); return s })
    }
  }

  const total = countAll(categories)

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Max 4 levels deep.{total > 0 ? ` ${total} total.` : ""}{" "}
            Drag <GripVertical className="inline h-3 w-3 align-text-bottom" /> to reorder — slide right to nest, left to unnest.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={load} disabled={loading || moving}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading || moving ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => openCreate()}>
            <Plus className="h-3.5 w-3.5" /> Add Root
          </Button>
        </div>
      </div>

      {/* Tree Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-6 text-destructive text-sm">{error}</div>
          ) : categories.length === 0 ? (
            <div className="p-10 flex flex-col items-center gap-2 text-muted-foreground">
              <FolderTree className="h-8 w-8 opacity-40" />
              <p className="text-sm">No categories yet. Add a root category to get started.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Path</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Slug</th>
                    <th className="py-2 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
                    <th className="py-2 px-4 text-center text-xs font-medium text-muted-foreground">Order</th>
                    <th className="py-2 px-4 text-center text-xs font-medium text-muted-foreground">Depth</th>
                    <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={flatItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {flatItems.map(node => (
                      <SortableRow
                        key={node.id}
                        node={node}
                        isOverTarget={node.id === overId && node.id !== activeId}
                        isProjectedParent={!!projected && projected.parentId === node.id && node.id !== activeId}
                        showInsertLine={!!projected && node.id === overId && node.id !== activeId}
                        insertDepth={projected?.depth ?? 0}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                        onAddChild={openCreate}
                        onToggle={toggleCollapse}
                        onTogglePublish={handleTogglePublish}
                        togglingPublishIds={togglingPublishIds}
                        collapsed={collapsed}
                        locale={locale}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>

              <DragOverlay dropAnimation={null}>
                {activeNode && (
                  <div
                    className="bg-background border rounded shadow-xl text-sm font-medium py-2 flex items-center gap-2 min-w-[200px] ring-1 ring-primary/30"
                    style={{
                      paddingLeft: `${(projected?.depth ?? activeNode.depth) * INDENT_PX + 16}px`,
                      paddingRight: "16px",
                    }}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{getCategoryName(activeNode.category, locale)}</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {projected && (
                        <Badge variant="outline" className="text-xs font-mono">
                          #{projected.sortOrder}
                        </Badge>
                      )}
                      {projected && projected.parentId !== activeNode.parentId && (
                        <Badge variant="secondary" className="text-xs">
                          {projected.parentId
                            ? `→ ${flatItems.find(i => i.id === projected.parentId)?.category.name ?? "..."}`
                            : "→ root"}
                        </Badge>
                      )}
                      {projected && projected.depth !== activeNode.depth && (
                        <Badge variant="secondary" className="text-xs">L{projected.depth}</Badge>
                      )}
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Sheet (slides from right) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {editing ? "Edit Category" : parentCat ? `Add Child to "${parentCat.name}"` : "Add Root Category"}
            </SheetTitle>
            {!editing && parentCat && (
              <p className="text-sm text-muted-foreground">
                Path prefix: <span className="font-mono text-foreground">{parentCat.path}/</span>
              </p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-5 py-4">
            {/* Basic fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  value={formName}
                  onChange={e => { setFormName(e.target.value); if (!slugManual) setFormSlug(slugify(e.target.value)) }}
                  placeholder="e.g. Game Setup"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug <span className="text-destructive">*</span></Label>
                <Input
                  value={formSlug}
                  onChange={e => { setFormSlug(e.target.value); setSlugManual(true) }}
                  placeholder="e.g. game-setup"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Lowercase, hyphens only (a-z, 0-9, -)</p>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Optional..."
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={formOrder} onChange={e => setFormOrder(Number(e.target.value))} className="w-28" />
              </div>
              {editing && (
                <div className="flex items-center gap-2">
                  <Switch checked={formActive} onCheckedChange={setFormActive} id="cat-active" />
                  <Label htmlFor="cat-active">Active</Label>
                </div>
              )}
            </div>

            {/* Translations */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4" /> Translations
                </Label>
                {(() => {
                  const available = SUPPORTED_LANGS.filter(l => !(l in formLanguages))
                  if (available.length === 0) return null
                  return (
                    <select
                      className="h-8 text-xs border rounded px-2 bg-background"
                      value=""
                      onChange={e => { if (e.target.value) addLang(e.target.value) }}
                    >
                      <option value="">+ Add language</option>
                      {available.map(l => (
                        <option key={l} value={l}>{LANG_LABELS[l] ?? l}</option>
                      ))}
                    </select>
                  )
                })()}
              </div>

              {Object.keys(formLanguages).length === 0 && (
                <p className="text-xs text-muted-foreground">No translations added yet.</p>
              )}

              {Object.entries(formLanguages).map(([lang, val]) => (
                <Card key={lang} className="p-0">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">{LANG_LABELS[lang] ?? lang} ({lang})</Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeLang(lang)} title="Remove translation">
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={val.name}
                        onChange={e => updateLang(lang, "name", e.target.value)}
                        placeholder={`Name in ${LANG_LABELS[lang] ?? lang}`}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={val.description}
                        onChange={e => updateLang(lang, "description", e.target.value)}
                        placeholder={`Description in ${LANG_LABELS[lang] ?? lang}`}
                        className="h-8 text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <SheetFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim() || !formSlug.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              {(deleteTarget?.children?.length ?? 0) > 0 ? (
                <>Cannot delete <strong>{deleteTarget?.name}</strong> — it has children. Delete children first.</>
              ) : (
                <>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || (deleteTarget?.children?.length ?? 0) > 0}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
