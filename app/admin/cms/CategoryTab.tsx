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
  ContentCategory,
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
  ChevronRight, ChevronDown, Plus, RefreshCw, Pencil, Trash2,
  FolderTree, Loader2, FolderPlus, GripVertical,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CopyButton } from "@/components/CopyButton"

const INDENT_PX = 20

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
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
  for (const cat of cats) {
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
  onEdit: (cat: ContentCategory) => void
  onDelete: (cat: ContentCategory) => void
  onAddChild: (cat: ContentCategory) => void
  onToggle: (id: string) => void
  collapsed: Set<string>
}

function SortableRow({ node, isOverTarget, onEdit, onDelete, onAddChild, onToggle, collapsed }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const hasChildren = (node.category.children?.length ?? 0) > 0
  const isCollapsed = collapsed.has(node.id)
  const canAddChild = node.category.depth < 3

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={`border-b transition-colors hover:bg-muted/40 ${isOverTarget ? "border-t-2 border-t-primary" : ""}`}
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
              <span className="text-sm font-medium">{node.category.name}</span>
              {!node.category.is_active && (
                <Badge variant="outline" className="text-xs ml-1 text-muted-foreground">inactive</Badge>
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
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CategoryTab() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [moving, setMoving] = useState(false)

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [deltaX, setDeltaX] = useState(0)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
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
      const updateData: Parameters<typeof updateCategory>[1] = { sort_order: snap.sortOrder }
      if (parentChanged) updateData.parent_id = snap.parentId
      await updateCategory(String(active.id), updateData)
      toast({ title: "Category moved" })
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
    setFormActive(true); setSlugManual(false); setDialogOpen(true)
  }

  const openEdit = (cat: ContentCategory) => {
    setEditing(cat); setParentCat(null)
    setFormName(cat.name); setFormSlug(cat.slug); setFormDesc(cat.description ?? "")
    setFormOrder(cat.sort_order); setFormActive(cat.is_active); setSlugManual(true); setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formSlug.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing.id, {
          name: formName.trim(), slug: formSlug.trim(),
          description: formDesc.trim() || undefined, sort_order: formOrder, is_active: formActive,
        })
        toast({ title: "Category updated" })
      } else {
        await createCategory({
          parent_id: parentCat?.id ?? null,
          name: formName.trim(), slug: formSlug.trim(),
          description: formDesc.trim() || undefined, sort_order: formOrder,
        })
        toast({ title: "Category created" })
      }
      setDialogOpen(false); load()
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
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                        onAddChild={openCreate}
                        onToggle={toggleCollapse}
                        collapsed={collapsed}
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
                    <span>{activeNode.category.name}</span>
                    {projected && projected.depth !== activeNode.depth && (
                      <Badge variant="secondary" className="text-xs ml-auto">depth {projected.depth}</Badge>
                    )}
                    {projected && projected.parentId !== activeNode.parentId && (
                      <span className="text-xs text-primary ml-1">
                        {projected.parentId
                          ? `→ ${flatItems.find(i => i.id === projected.parentId)?.category.name ?? "..."}`
                          : "→ root"}
                      </span>
                    )}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Category" : parentCat ? `Add Child to "${parentCat.name}"` : "Add Root Category"}
            </DialogTitle>
            {!editing && parentCat && (
              <p className="text-sm text-muted-foreground pt-1">
                Path prefix: <span className="font-mono text-foreground">{parentCat.path}/</span>
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim() || !formSlug.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
