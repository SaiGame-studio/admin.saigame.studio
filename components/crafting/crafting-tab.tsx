"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Plus, RefreshCw, Hammer, ExternalLink, Dices, Save, X, ChevronRight, ChevronDown, Loader2, Check, ChevronsUpDown, Wand2, ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { CopyButton } from "@/components/CopyButton"
import { useToast } from "@/hooks/use-toast"
import { listItemDefinitions, type TenantCtx } from "@/lib/inventory-api"
import { listCraftingRecipes, createCraftingRecipe, getCraftingRecipe } from "@/lib/crafting-api"
import type { ItemDefinition, ItemCategory } from "@/types/inventory"
import type {
  CraftingRecipe,
  CreateCraftingRecipeRequest,
  CraftingRecipeInput,
  CraftingRecipeOutput,
} from "@/types/crafting"

function ItemSelector({ 
  value, 
  onChange, 
  items, 
  loading,
  placeholder = "Select item"
}: { 
  value: string; 
  onChange: (v: string) => void; 
  items: ItemDefinition[]; 
  loading: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false)
  
  const selectedItem = items.find(i => i.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={`w-full justify-between h-8 text-xs font-normal border-dashed ${!value ? "text-muted-foreground" : ""}`}>
          <span className="truncate">{selectedItem ? selectedItem.name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search items..." className="h-9 text-xs" />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            {loading ? (
              <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <CommandGroup>
                {items.map(it => (
                  <CommandItem
                    key={it.id}
                    value={`${it.name} ${it.id}`}
                    onSelect={() => {
                      onChange(it.id)
                      setOpen(false)
                    }}
                    className="text-xs"
                  >
                    <div className="flex-1 truncate">{it.name} <span className="text-muted-foreground">({it.id.slice(0, 8)})</span></div>
                    <Check className={`h-3 w-3 ml-2 shrink-0 transition-opacity ${value === it.id ? "opacity-100" : "opacity-0"}`} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function CraftingTab({ gameId, studioId }: { gameId: string; studioId: string }) {
  const { toast } = useToast()
  
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)

  const [detailCache, setDetailCache] = useState<Record<string, CraftingRecipe>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<Record<string, string>>({})

  function toggleExpand(recipeId: string) {
    if (expandedRecipe === recipeId) {
      setExpandedRecipe(null)
      return
    }
    setExpandedRecipe(recipeId)
    if (!detailCache[recipeId]) {
      setDetailLoading(recipeId)
      getCraftingRecipe({ gameId }, recipeId)
        .then(res => setDetailCache(prev => ({ ...prev, [recipeId]: res })))
        .catch(err => setDetailError(prev => ({ ...prev, [recipeId]: err.message ?? "Failed to load details" })))
        .finally(() => setDetailLoading(null))
    }
  }

  const [allItems, setAllItems] = useState<ItemDefinition[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)

  function getDefaultForm(): CreateCraftingRecipeRequest {
    return {
      recipe_key: "",
      name: "",
      description: "",
      category: "weapons",
      success_rate: 10000000, // 100%
      bonus_rate: 0,
      is_active: true,
      metadata: {},
      inputs: [{ item_definition_id: "", quantity: 1, is_consumed: true }],
      outputs: [{ item_definition_id: "", quantity_min: 1, quantity_max: 1, output_type: "main", sort_order: 0 }],
    }
  }

  const [form, setForm] = useState<CreateCraftingRecipeRequest>(getDefaultForm())
  const [formMetaEntries, setFormMetaEntries] = useState<{ key: string; value: string }[]>([])

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listCraftingRecipes(
        { gameId },
        { 
          page, 
          page_size: pageSize,
          category: categoryFilter === "all" ? undefined : categoryFilter 
        }
      )
      setRecipes(res.recipes || [])
      setTotal(res.total || 0)
    } catch (err: any) {
      setError(err?.message || "Failed to load crafting recipes")
    } finally {
      setLoading(false)
    }
  }, [gameId, page, pageSize, categoryFilter])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  // Load all items when creating for the first time or expanding
  useEffect(() => {
    if ((createOpen || expandedRecipe) && allItems.length === 0 && !itemsLoading) {
      setItemsLoading(true)
      listItemDefinitions({ gameId, studioId }, { limit: 1000 })
        .then((res) => setAllItems(res.items ?? []))
        .catch((err) => console.error("Failed to fetch items:", err))
        .finally(() => setItemsLoading(false))
    }
  }, [createOpen, expandedRecipe, allItems.length, itemsLoading, gameId, studioId])

  function handleCreateOpen() {
    setForm(getDefaultForm())
    setFormMetaEntries([])
    setAutoSlug(true)
    setCreateOpen(true)
  }

  async function handleSaveRecipe() {
    if (!form.name.trim() || !form.recipe_key.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Name and Recipe Key are required." })
      return
    }
    
    // Validate inputs
    const validInputs = form.inputs.filter(i => !!i.item_definition_id)
    if (validInputs.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "At least one input material is required." })
      return
    }
    
    // Validate outputs
    const validOutputs = form.outputs.filter(o => !!o.item_definition_id)
    if (validOutputs.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "At least one output item is required." })
      return
    }

    setFormSaving(true)
    try {
      const metadata: Record<string, unknown> = {}
      formMetaEntries.forEach(({ key, value }) => {
        if (key.trim()) metadata[key.trim()] = value
      })

      const payload: CreateCraftingRecipeRequest = {
        ...form,
        inputs: validInputs.map(i => ({ ...i, quantity: Number(i.quantity) })),
        outputs: validOutputs.map(o => ({
          ...o,
          quantity_min: Number(o.quantity_min),
          quantity_max: Number(o.quantity_max),
          sort_order: Number(o.sort_order),
        })),
        success_rate: Number(form.success_rate),
        bonus_rate: Number(form.bonus_rate),
        metadata,
      }

      await createCraftingRecipe({ gameId }, payload)
      toast({ title: "Success", description: "Crafting recipe created successfully." })
      setCreateOpen(false)
      fetchRecipes()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to create", description: err?.message || "Unknown error" })
    } finally {
      setFormSaving(false)
    }
  }

  // Helpers for formatting rates
  function formatRate(rateNum: number) {
    if (rateNum === 10000000) return "100%"
    return Number((rateNum / 100000).toFixed(5)).toString() + "%"
  }

  function getItemName(id: string) {
    const item = allItems.find(i => i.id === id)
    return item ? item.name : id.slice(0, 8) + '...'
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Crafting Recipes</h2>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${total} recipe${total !== 1 ? "s" : ""} configured`
              : "No recipes yet"}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Category Filter */}
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          >
            <option value="all">All categories</option>
            <option value="weapons">Weapons</option>
            <option value="armor">Armor</option>
            <option value="consumables">Consumables</option>
            <option value="materials">Materials</option>
          </select>
          <Button variant="outline" size="icon" onClick={fetchRecipes} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleCreateOpen} disabled={!studioId}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Recipe
          </Button>
        </div>
      </div>

      {/* RECIPE LIST */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      ) : recipes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Hammer className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No crafting recipes found</p>
            <Button onClick={handleCreateOpen}><Plus className="h-4 w-4 mr-2" />Create first recipe</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => {
            const isExpanded = expandedRecipe === recipe.id
            const detail = detailCache[recipe.id]
            return (
              <Card key={recipe.id} className={`transition-all ${!recipe.is_active ? "opacity-70" : ""}`}>
                {/* Header Row */}
                <div
                  className="cursor-pointer select-none border-b border-transparent"
                  onClick={() => toggleExpand(recipe.id)}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}

                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base truncate">{recipe.name}</CardTitle>
                          <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md border shrink-0">
                            <span className="truncate max-w-[160px]" title={recipe.recipe_key}>{recipe.recipe_key}</span>
                            <CopyButton text={recipe.recipe_key} size="h-3 w-3" />
                          </div>
                          <Badge variant={recipe.is_active ? "default" : "secondary"} className="text-xs shrink-0 font-normal">
                            {recipe.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-xs shrink-0 capitalize text-muted-foreground">
                            {recipe.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="w-24 shrink-0 text-sm text-center">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatRate(recipe.success_rate)}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase">Success</p>
                      </div>

                      <div className="w-24 shrink-0 text-sm text-center">
                        <span className="font-medium text-amber-500">
                          {formatRate(recipe.bonus_rate)}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase">Bonus</p>
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <>
                    <Separator />
                    <CardContent className="p-4 bg-muted/10">
                      {detailLoading === recipe.id ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Loading full recipe details...</span>
                        </div>
                      ) : detailError[recipe.id] ? (
                        <div className="text-center font-medium text-sm text-destructive py-8">
                          {detailError[recipe.id]}
                        </div>
                      ) : detail ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recipe Details</p>
                              <div className="space-y-1 text-sm bg-background border rounded-md p-3">
                                {detail.description && <p className="text-muted-foreground mb-2 italic">{detail.description}</p>}
                                <div className="grid grid-cols-[120px_1fr] gap-1">
                                  <span className="text-muted-foreground">ID:</span>
                                  <span className="font-mono text-xs">{detail.id} <CopyButton text={detail.id} /></span>
                                  <span className="text-muted-foreground">Success Rate:</span>
                                  <span className="text-emerald-600 dark:text-emerald-400">{formatRate(detail.success_rate)}</span>
                                  <span className="text-muted-foreground">Bonus Rate:</span>
                                  <span className="text-amber-500">{formatRate(detail.bonus_rate)}</span>
                                </div>
                              </div>
                            </div>

                            {detail.metadata && Object.keys(detail.metadata).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Metadata</p>
                                <pre className="text-xs font-mono bg-background border rounded-md p-3 overflow-auto max-h-[150px]">
                                  {JSON.stringify(detail.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <ArrowDownRight className="h-4 w-4 text-rose-500" />
                                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Input Materials</p>
                              </div>
                              <div className="border border-rose-500/20 rounded-md overflow-hidden bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                      <TableHead className="h-8 text-xs text-center w-24">Consumed</TableHead>
                                      <TableHead className="h-8 text-xs">Item</TableHead>
                                      <TableHead className="h-8 text-xs text-right w-16">Qty</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {detail.inputs?.map((input, idx) => {
                                      const def = allItems.find(i => i.id === input.item_definition_id)
                                      return (
                                        <TableRow key={idx}>
                                          <TableCell className="text-center py-1.5">
                                            <Badge variant={input.is_consumed ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 font-normal">
                                              {input.is_consumed ? 'Yes' : 'No'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="py-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <Link href={`/games/${gameId}/items/${input.item_definition_id}`} className="font-mono text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]" title={def?.name || input.item_definition_id}>
                                                {def?.name || input.item_definition_id}
                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                              </Link>
                                              <CopyButton text={input.item_definition_id} size="h-3 w-3" />
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right py-1.5">{input.quantity}</TableCell>
                                        </TableRow>
                                      )
                                    })}
                                    {(!detail.inputs || detail.inputs.length === 0) && (
                                      <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-3 italic">None</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Output Results</p>
                              </div>
                              <div className="border border-emerald-500/20 rounded-md overflow-hidden bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                      <TableHead className="h-8 text-xs w-16 text-center">Type</TableHead>
                                      <TableHead className="h-8 text-xs">Item</TableHead>
                                      <TableHead className="h-8 text-xs text-right w-20">Qty Range</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {detail.outputs?.map((out, idx) => {
                                      const def = allItems.find(i => i.id === out.item_definition_id)
                                      return (
                                        <TableRow key={idx}>
                                          <TableCell className="text-center py-1.5">
                                            <Badge variant={out.output_type === 'main' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 font-normal capitalize">
                                              {out.output_type}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="py-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <Link href={`/games/${gameId}/items/${out.item_definition_id}`} className="font-mono text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]" title={def?.name || out.item_definition_id}>
                                                {def?.name || out.item_definition_id}
                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                              </Link>
                                              <CopyButton text={out.item_definition_id} size="h-3 w-3" />
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right py-1.5 text-xs text-muted-foreground font-medium">
                                            {out.quantity_min === out.quantity_max ? out.quantity_max : `${out.quantity_min} - ${out.quantity_max}`}
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                    {(!detail.outputs || detail.outputs.length === 0) && (
                                      <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-3 italic">None</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </>
                )}
              </Card>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground px-2">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE RECIPE SHEET */}
      <Sheet open={createOpen} onOpenChange={(val) => { if (!val) setCreateOpen(false) }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col p-0">
          <SheetHeader className="p-6 pb-2 shrink-0">
            <SheetTitle>New Crafting Recipe</SheetTitle>
            <SheetDescription>Create a new recipe that allows players to combine items into others.</SheetDescription>
          </SheetHeader>
          
          <div className="px-6 py-4 flex-1 overflow-y-auto space-y-6 bg-muted/5">
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-tight">General Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name <span className="text-destructive">*</span></Label>
                  <Input 
                    value={form.name} 
                    onChange={e => {
                      const v = e.target.value
                      if (autoSlug) {
                        setForm({ 
                          ...form, 
                          name: v, 
                          recipe_key: v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") 
                        })
                      } else {
                        setForm({ ...form, name: v })
                      }
                    }} 
                    placeholder="Iron Sword" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Recipe Key <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Input 
                      value={form.recipe_key} 
                      onChange={e => {
                        setAutoSlug(false)
                        setForm({ ...form, recipe_key: e.target.value })
                      }} 
                      placeholder="iron_sword" 
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant={autoSlug ? "default" : "outline"}
                      size="icon"
                      className="shrink-0"
                      title={autoSlug ? "Auto-slug is ON" : "Auto-slug is OFF — click to re-enable"}
                      onClick={() => {
                        setAutoSlug(true)
                        setForm({
                          ...form,
                          recipe_key: form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
                        })
                      }}
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Combine 3 iron ingots..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="weapons" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.is_active} onCheckedChange={c => setForm({ ...form, is_active: c })} />
                  <Label>Active</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Rates & Limits */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-tight">Rates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 bg-muted/30 p-3 rounded-md border">
                  <Label className="flex justify-between items-center">
                    Success Rate (Raw)
                    <span className="text-emerald-600 max-w-[50px] text-right font-mono tabular-nums">{formatRate(form.success_rate)}</span>
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input type="number" min={0} max={10000000} step={1} value={form.success_rate} onChange={e => setForm({ ...form, success_rate: Number(e.target.value) })} className="font-mono text-left" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">10000000 = 100%, 1 = 0.00001%. Chance for the craft to succeed and yield main outputs.</p>
                </div>
                
                <div className="space-y-1.5 bg-muted/30 p-3 rounded-md border">
                  <Label className="flex justify-between items-center">
                    Bonus Rate (Raw)
                    <span className="text-amber-500 max-w-[50px] text-right font-mono tabular-nums">{formatRate(form.bonus_rate)}</span>
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input type="number" min={0} max={10000000} step={1} value={form.bonus_rate} onChange={e => setForm({ ...form, bonus_rate: Number(e.target.value) })} className="font-mono text-left" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Chance to yield bonus outputs when crafting succeeds.</p>
                </div>
              </div>


            </div>

            <Separator />

            {/* Inputs */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold tracking-tight">Input Materials <span className="text-destructive">*</span></h3>
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, inputs: [...form.inputs, { item_definition_id: "", quantity: 1, is_consumed: true }] })}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.inputs.map((inp, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-background p-2 rounded-md border shadow-sm">
                    <div className="flex-1">
                      <ItemSelector
                        value={inp.item_definition_id}
                        onChange={v => {
                          const newInps = [...form.inputs]
                          newInps[idx].item_definition_id = v
                          setForm({ ...form, inputs: newInps })
                        }}
                        items={allItems}
                        loading={itemsLoading}
                        placeholder="Select component item"
                      />
                    </div>
                    <Input type="number" min={1} value={inp.quantity} className="w-16 h-8 text-xs text-center" onChange={e => {
                      const newInps = [...form.inputs]; newInps[idx].quantity = Number(e.target.value); setForm({ ...form, inputs: newInps })
                    }} title="Quantity" />
                    <div className="flex items-center gap-1.5 px-2" title="Is Consumed?">
                      <Switch className="scale-75 data-[state=checked]:bg-destructive" checked={inp.is_consumed} onCheckedChange={c => {
                        const newInps = [...form.inputs]; newInps[idx].is_consumed = c; setForm({ ...form, inputs: newInps })
                      }} />
                      <span className="text-[10px] text-muted-foreground w-6">{inp.is_consumed ? 'Burn' : 'Keep'}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => {
                      const newInps = [...form.inputs]; newInps.splice(idx, 1); setForm({ ...form, inputs: newInps })
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.inputs.length === 0 && <p className="text-xs text-muted-foreground italic pl-2">No input materials added.</p>}
              </div>
            </div>

            <Separator />

            {/* Outputs */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold tracking-tight">Output Results <span className="text-destructive">*</span></h3>
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, outputs: [...form.outputs, { item_definition_id: "", quantity_min: 1, quantity_max: 1, output_type: "main", sort_order: form.outputs.length }] })}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.outputs.map((out, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-background p-2 rounded-md border shadow-sm">
                    <Select 
                      value={out.output_type} 
                      onValueChange={v => {
                        const newOuts = [...form.outputs]; newOuts[idx].output_type = v; setForm({ ...form, outputs: newOuts })
                      }}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Result</SelectItem>
                        <SelectItem value="bonus">Bonus Result</SelectItem>
                        <SelectItem value="refund">Refund/Byproduct</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex-1">
                      <ItemSelector
                        value={out.item_definition_id}
                        onChange={v => {
                          const newOuts = [...form.outputs]
                          newOuts[idx].item_definition_id = v
                          setForm({ ...form, outputs: newOuts })
                        }}
                        items={allItems}
                        loading={itemsLoading}
                        placeholder="Select output item"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <Input type="number" min={1} value={out.quantity_min} className="w-14 h-8 text-xs text-center px-1" title="Min Qty" onChange={e => {
                        const newOuts = [...form.outputs]; newOuts[idx].quantity_min = Number(e.target.value); setForm({ ...form, outputs: newOuts })
                      }} />
                      <span className="text-muted-foreground text-[10px]">-</span>
                      <Input type="number" min={1} value={out.quantity_max} className="w-14 h-8 text-xs text-center px-1" title="Max Qty" onChange={e => {
                        const newOuts = [...form.outputs]; newOuts[idx].quantity_max = Number(e.target.value); setForm({ ...form, outputs: newOuts })
                      }} />
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => {
                      const newOuts = [...form.outputs]; newOuts.splice(idx, 1); setForm({ ...form, outputs: newOuts })
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.outputs.length === 0 && <p className="text-xs text-muted-foreground italic pl-2">No output items added.</p>}
              </div>
            </div>

            <Separator />
            
            {/* Metadata KV */}
            <div className="space-y-3 pb-6">
              <h3 className="text-sm font-semibold tracking-tight">Metadata</h3>
              <div className="space-y-2">
                {formMetaEntries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input className="h-8 text-xs" placeholder="key (e.g. icon)" value={entry.key} onChange={e => {
                      const newM = [...formMetaEntries]; newM[idx].key = e.target.value; setFormMetaEntries(newM)
                    }} />
                    <Input className="h-8 text-xs w-2/3" placeholder="value" value={entry.value} onChange={e => {
                      const newM = [...formMetaEntries]; newM[idx].value = e.target.value; setFormMetaEntries(newM)
                    }} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => {
                      const newM = [...formMetaEntries]; newM.splice(idx, 1); setFormMetaEntries(newM)
                    }}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setFormMetaEntries([...formMetaEntries, { key: "", value: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add key/value
                </Button>
              </div>
            </div>
            
          </div>
          
          <SheetFooter className="p-4 shrink-0 border-t bg-background">
            <Button variant="outline" disabled={formSaving} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={formSaving || itemsLoading} onClick={handleSaveRecipe}>
              {formSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Create Recipe
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
