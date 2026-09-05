'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, Wand2, X } from 'lucide-react';
import { toSlugUnderscore } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger, } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { useEscapeLayer } from '@/hooks/use-escape-manager';
import { useTranslation } from '@/lib/i18n/use-translation';
import { listItemDefinitions, createItemDefinition, updateItemDefinition, fetchItemCategories, fetchItemRarities, } from '@/lib/inventory-api';
import type { ItemDefinition, ItemCategory, ItemRarity, CreateItemRequest, } from '@/types/inventory';
import { RARITY_COLORS } from '@/types/inventory';
// ─── Shared types ─────────────────────────────────────────────────────────────
export type KVEntry = {
    key: string;
    value: string;
};
export interface CreateItemInitialGenPoolEntry {
    item_definition_id: string;
    drop_rate: string;
    quantity_min: string;
    quantity_max: string;
    collect_cap: string;
    initial_output: string;
}
export interface CreateItemInitialValues {
    name?: string;
    item_code?: string;
    category?: ItemCategory;
    rarity?: ItemRarity;
    is_stackable?: boolean;
    max_stack_size?: string;
    max_owned_quantity?: string;
    grid_width?: string;
    grid_height?: string;
    /** base_stats as editable KV rows */
    stats?: KVEntry[];
    /** Item definition description. */
    description?: string;
    /** editable metadata key-value rows */
    metadata_entries?: KVEntry[];
    client_writable?: boolean;
    allow_client_update_qty?: boolean;
    /** generator config — only used when category === 'generator' */
    gen_output_pool?: CreateItemInitialGenPoolEntry[];
    gen_interval_seconds?: string;
    gen_tick_capacity?: string;
    gen_collect_destination?: 'mailbox' | 'inventory';
    gen_mailbox_title?: string;
    gen_mailbox_body?: string;
}
type ItemDefinitionDialogMode = 'create' | 'edit';
// ─── Local helpers ────────────────────────────────────────────────────────────
function RarityBadge({ rarity }: {
    rarity: ItemRarity;
}) {
    const c = RARITY_COLORS[rarity];
    if (!c) {
        return (<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border text-gray-400 border-gray-400 bg-gray-400/10 capitalize w-fit">
        {rarity}
      </span>);
    }
    return (<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${c.text} ${c.border} ${c.bg} capitalize w-fit`}>
      {rarity}
    </span>);
}
function prettyCategory(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function KVEditor({ entries, onChange, label, numericValue, }: {
    entries: KVEntry[];
    onChange: (v: KVEntry[]) => void;
    label: string;
    numericValue?: boolean;
}) {
    const addRow = () => onChange([...entries, { key: '', value: '' }]);
    const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
    const update = (i: number, field: 'key' | 'value', val: string) => {
        if (numericValue && field === 'value' && val !== '' && val !== '-' && isNaN(Number(val)))
            return;
        onChange(entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    };
    return (<div id="create-item-kv-editor-root" className="space-y-1">
      <Label id="create-item-kv-editor-label" className="text-xs text-muted-foreground">{label}</Label>
      {entries.map((e, i) => (<div id={`create-item-kv-row-${i}`} key={i} className="flex gap-1 items-center">
          <Input id={`create-item-kv-key-${i}`} className="h-7 text-xs" placeholder="key" value={e.key} onChange={(ev) => update(i, 'key', ev.target.value)}/>
          <span id={`create-item-kv-sep-${i}`} className="text-muted-foreground">=</span>
          <Input id={`create-item-kv-val-${i}`} className="h-7 text-xs" placeholder={numericValue ? '0' : 'value'} inputMode={numericValue ? 'decimal' : undefined} value={e.value} onChange={(ev) => update(i, 'value', ev.target.value)}/>
          <Button id={`create-item-kv-del-${i}`} variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" type="button" onClick={() => remove(i)}>
            ✕
          </Button>
        </div>))}
      <Button id="create-item-kv-add-btn" variant="outline" size="sm" type="button" className="h-7 text-xs mt-1" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1"/> Add
      </Button>
    </div>);
}
// ─── Main component ───────────────────────────────────────────────────────────
export function CreateItemDefinitionDialog({ open, gameId, studioId, onCreated, onClose, mode = 'create', itemId, onUpdated, categories: categoriesProp, rarities: raritiesProp, initialCategory, initialValues, }: {
    open: boolean;
    gameId: string;
    studioId?: string;
    onCreated: (itemId: string) => void;
    onClose: () => void;
    mode?: ItemDefinitionDialogMode;
    itemId?: string;
    onUpdated?: (itemId: string) => void;
    categories?: ItemCategory[];
    rarities?: ItemRarity[];
    initialCategory?: ItemCategory;
    initialValues?: CreateItemInitialValues;
}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const scrollBodyRef = useRef<HTMLDivElement>(null);
    const isEditMode = mode === 'edit';
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [itemCode, setItemCode] = useState('');
    const [autoSlug, setAutoSlug] = useState(true);
    const [category, setCategory] = useState<ItemCategory>(initialCategory ?? 'weapon');
    const [rarity, setRarity] = useState<ItemRarity>('common');
    const [isStackable, setIsStackable] = useState(false);
    const [maxStack, setMaxStack] = useState<string>('99');
    const [maxOwnedQuantity, setMaxOwnedQuantity] = useState<string>('');
    const [gridW, setGridW] = useState('1');
    const [gridH, setGridH] = useState('1');
    const [stats, setStats] = useState<KVEntry[]>([]);
    const [meta, setMeta] = useState<KVEntry[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [clientWritable, setClientWritable] = useState(false);
    const [allowClientUpdateQty, setAllowClientUpdateQty] = useState(false);
    // Generator config
    interface GenPoolEntry {
        item_definition_id: string;
        drop_rate: string;
        quantity_min: string;
        quantity_max: string;
        collect_cap: string;
        initial_output: string;
    }
    const [genOutputPool, setGenOutputPool] = useState<GenPoolEntry[]>([{ item_definition_id: '', drop_rate: '1', quantity_min: '1', quantity_max: '1', collect_cap: '5', initial_output: '0' }]);
    const [genInterval, setGenInterval] = useState('3600');
    const [genTickCapacity, setGenTickCapacity] = useState('24');
    const [genCollectDestination, setGenCollectDestination] = useState<'mailbox' | 'inventory'>('mailbox');
    const [genMailboxTitle, setGenMailboxTitle] = useState('');
    const [genMailboxBody, setGenMailboxBody] = useState('');
    const [genAllItems, setGenAllItems] = useState<ItemDefinition[]>([]);
    const [genItemsLoading, setGenItemsLoading] = useState(false);
    const [genPoolOpen, setGenPoolOpen] = useState<Record<number, boolean>>({});
    const [genPoolSearch, setGenPoolSearch] = useState<Record<number, string>>({});
    const genStackableItems = genAllItems.filter((item) => item.is_stackable);
    // Keep the item editor above the conversation panel in the global Escape stack.
    useEscapeLayer(open, () => {
        resetForm();
        onClose();
    }, 1);
    // Fetch categories/rarities if not provided as props
    const [localCategories, setLocalCategories] = useState<ItemCategory[]>([]);
    const [localRarities, setLocalRarities] = useState<ItemRarity[]>([]);
    useEffect(() => {
        if (!categoriesProp)
            fetchItemCategories().then(setLocalCategories).catch(() => { });
        if (!raritiesProp)
            fetchItemRarities().then(setLocalRarities).catch(() => { });
    }, [categoriesProp, raritiesProp]);
    const categories = categoriesProp ?? localCategories;
    const rarities = raritiesProp ?? localRarities;
    // Fetch items for generator output pool
    useEffect(() => {
        if (category === 'generator' && open && genAllItems.length === 0) {
            setGenItemsLoading(true);
            listItemDefinitions({ gameId }, { limit: 200 })
                .then((res) => setGenAllItems(res.items ?? []))
                .catch(() => { })
                .finally(() => setGenItemsLoading(false));
        }
    }, [category, open, gameId]);
    // Seed form from initialValues when dialog opens
    const prevOpenRef = useRef(false);
    useEffect(() => {
        if (open && !prevOpenRef.current && initialValues) {
            const v = initialValues;
            if (v.name !== undefined)
                setName(v.name);
            if (v.description !== undefined)
                setDescription(v.description);
            if (v.item_code) {
                setItemCode(v.item_code);
                setAutoSlug(false);
            }
            else if (v.name) {
                setItemCode(toSlugUnderscore(v.name));
                setAutoSlug(true);
            }
            if (v.category)
                setCategory(v.category);
            if (v.rarity)
                setRarity(v.rarity);
            if (v.is_stackable !== undefined)
                setIsStackable(v.is_stackable);
            if (v.max_stack_size !== undefined)
                setMaxStack(v.max_stack_size);
            if (v.max_owned_quantity !== undefined)
                setMaxOwnedQuantity(v.max_owned_quantity);
            if (v.grid_width !== undefined)
                setGridW(v.grid_width);
            if (v.grid_height !== undefined)
                setGridH(v.grid_height);
            if (v.stats)
                setStats(v.stats);
            const metadataEntries = [...(v.metadata_entries ?? [])];
            if (metadataEntries.length > 0)
                setMeta(metadataEntries);
            if (v.client_writable !== undefined)
                setClientWritable(v.client_writable);
            if (v.allow_client_update_qty !== undefined)
                setAllowClientUpdateQty(v.allow_client_update_qty);
            if (v.gen_output_pool && v.gen_output_pool.length > 0)
                setGenOutputPool(v.gen_output_pool);
            if (v.gen_interval_seconds !== undefined)
                setGenInterval(v.gen_interval_seconds);
            if (v.gen_tick_capacity !== undefined)
                setGenTickCapacity(v.gen_tick_capacity);
            if (v.gen_collect_destination !== undefined)
                setGenCollectDestination(v.gen_collect_destination);
            if (v.gen_mailbox_title !== undefined)
                setGenMailboxTitle(v.gen_mailbox_title);
            if (v.gen_mailbox_body !== undefined)
                setGenMailboxBody(v.gen_mailbox_body);
        }
        prevOpenRef.current = open;
    }, [open, initialValues]);
    // Reset category when dialog opens with a fresh initialCategory
    useEffect(() => {
        if (open && initialCategory)
            setCategory(initialCategory);
    }, [open, initialCategory]);
    function resetForm() {
        setName('');
        setDescription('');
        setItemCode('');
        setAutoSlug(true);
        setCategory(initialCategory ?? 'weapon');
        setRarity('common');
        setIsStackable(false);
        setMaxStack('99');
        setMaxOwnedQuantity('');
        setGridW('1');
        setGridH('1');
        setStats([]);
        setMeta([]);
        setErrors({});
        setClientWritable(false);
        setAllowClientUpdateQty(false);
        setGenOutputPool([{ item_definition_id: '', drop_rate: '1', quantity_min: '1', quantity_max: '1', collect_cap: '5', initial_output: '0' }]);
        setGenInterval('3600');
        setGenTickCapacity('24');
        setGenCollectDestination('mailbox');
        setGenMailboxTitle('');
        setGenMailboxBody('');
        setGenAllItems([]);
    }
    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!name.trim() || name.trim().length < 3) {
            e.name = t('items.nameMustBe3Chars');
        }
        if (!itemCode.trim()) {
            e.itemCode = t('items.itemCodeRequired');
        }
        if (isStackable && maxStack !== '' && Number(maxStack) < 1) {
            e.maxStack = t('items.maxStackInvalid');
        }
        if (maxOwnedQuantity !== '' && Number(maxOwnedQuantity) < 1) {
            e.maxOwnedQuantity = t('items.maxOwnedQuantityInvalid');
        }
        if (category === 'generator') {
            genOutputPool.forEach((p, idx) => {
                if (!p.item_definition_id.trim())
                    e[`genPoolItem_${idx}`] = t('items.itemDefinitionRequired');
            });
            if (!genInterval || Number(genInterval) < 1)
                e.genInterval = t('items.intervalMustBe');
            if (!genTickCapacity || Number(genTickCapacity) < 1)
                e.genTickCapacity = t('items.tickCapMustBe');
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }
    function scrollToFirstError(e: Record<string, string>) {
        const ORDER = [
            { key: 'name', id: 'create-item-def-name-section' },
            { key: 'itemCode', id: 'create-item-def-code-section' },
            { key: 'maxStack', id: 'create-item-def-stackable-section' },
            { key: 'maxOwnedQuantity', id: 'create-item-def-max-owned-section' },
            { key: 'genInterval', id: 'create-item-def-gen-interval-section' },
            { key: 'genTickCapacity', id: 'create-item-def-gen-tick-section' },
        ];
        // Check per-entry pool errors first (scroll to first empty entry)
        const firstPoolError = Object.keys(e).find((k) => k.startsWith('genPoolItem_'));
        if (firstPoolError) {
            const idx = firstPoolError.split('_').pop();
            const el = document.getElementById(`create-item-def-gen-pool-item-section-${idx}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
        }
        const first = ORDER.find((o) => e[o.key]);
        if (!first)
            return;
        const el = document.getElementById(first.id);
        if (!el)
            return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    async function handleSubmit() {
        const e: Record<string, string> = {};
        if (!name.trim() || name.trim().length < 3) {
            e.name = t('items.nameMustBe3Chars');
        }
        if (!itemCode.trim()) {
            e.itemCode = t('items.itemCodeRequired');
        }
        if (isStackable && maxStack !== '' && Number(maxStack) < 1) {
            e.maxStack = t('items.maxStackInvalid');
        }
        if (maxOwnedQuantity !== '' && Number(maxOwnedQuantity) < 1) {
            e.maxOwnedQuantity = t('items.maxOwnedQuantityInvalid');
        }
        if (category === 'generator') {
            genOutputPool.forEach((p, idx) => {
                if (!p.item_definition_id.trim())
                    e[`genPoolItem_${idx}`] = t('items.itemDefinitionRequired');
            });
            if (!genInterval || Number(genInterval) < 1)
                e.genInterval = t('items.intervalMustBe');
            if (!genTickCapacity || Number(genTickCapacity) < 1)
                e.genTickCapacity = t('items.tickCapMustBe');
        }
        if (Object.keys(e).length > 0) {
            setErrors(e);
            scrollToFirstError(e);
            return;
        }
        setLoading(true);
        try {
            if (isEditMode && !itemId) {
                throw new Error('Missing item id for edit mode');
            }
            const base_stats: Record<string, number> = {};
            stats.forEach(({ key, value }) => {
                if (key.trim())
                    base_stats[key.trim()] = Number(value) || 0;
            });
            const metadata: Record<string, unknown> = {};
            meta.forEach(({ key, value }) => {
                if (key.trim())
                    metadata[key.trim()] = value;
            });
            if (category === 'generator') {
                const generatorConfig: Record<string, unknown> = {
                    production_interval_seconds: Number(genInterval) || 3600,
                    tick_capacity: Number(genTickCapacity) || 24,
                    collect_destination: genCollectDestination,
                    output_pool: genOutputPool
                        .filter(p => p.item_definition_id.trim())
                        .map(p => ({
                        item_definition_id: p.item_definition_id.trim(),
                        drop_rate: Number(p.drop_rate) || 1,
                        quantity_min: Number(p.quantity_min) || 1,
                        quantity_max: Number(p.quantity_max) || 1,
                        collect_cap: Number(p.collect_cap) || 5,
                        initial_output: Number(p.initial_output) || 0,
                    })),
                };
                if (genCollectDestination === 'mailbox') {
                    if (genMailboxTitle.trim())
                        generatorConfig.mailbox_title = genMailboxTitle.trim();
                    if (genMailboxBody.trim())
                        generatorConfig.mailbox_body = genMailboxBody.trim();
                }
                metadata.generator_config = generatorConfig;
            }
            const body: CreateItemRequest = {
                item_code: itemCode.trim(),
                name: name.trim(),
                description: description.trim(),
                category,
                rarity,
                is_stackable: isStackable,
                max_stack_size: isStackable ? (maxStack === '' ? null : Number(maxStack)) : null,
                max_owned_quantity: maxOwnedQuantity === '' ? null : Number(maxOwnedQuantity),
                grid_width: Number(gridW) || 1,
                grid_height: Number(gridH) || 1,
                base_stats,
                metadata,
                client_writable: clientWritable,
                allow_client_update_qty: allowClientUpdateQty,
            };
            const result = isEditMode
                ? await updateItemDefinition({ studioId, gameId }, itemId ?? '', body)
                : await createItemDefinition({ studioId, gameId }, body);
            toast({
                title: isEditMode ? t('items.itemUpdated') : t('items.itemCreated'),
                description: `"${name}" ${isEditMode ? 'updated' : 'added to catalogue'}.`,
            });
            resetForm();
            if (isEditMode) {
                onUpdated?.(result.item.id);
            }
            else {
                onCreated(result.item.id);
            }
            onClose();
        }
        catch (err: unknown) {
            const e = err as {
                status?: number;
                message?: string;
            };
            if (e?.status === 403) {
                toast({
                    variant: 'destructive',
                    title: t('items.permissionDenied'),
                    description: isEditMode
                        ? 'You do not have permission to update items for this game.'
                        : 'You do not have permission to create items for this game.',
                });
            }
            else {
                toast({
                    variant: 'destructive',
                    title: isEditMode ? t('items.failedToUpdateItem') : t('items.failedToCreateItem'),
                    description: e?.message ?? 'Unknown error',
                });
            }
        }
        finally {
            setLoading(false);
        }
    }
    return (<Sheet open={open} onOpenChange={(v) => {
            if (!v) {
                resetForm();
                onClose();
            }
        }}>
      <SheetContent id="create-item-def-sheet" side="right" className="sm:max-w-[560px] flex flex-col p-0">
        <SheetHeader id="create-item-def-sheet-header" className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{isEditMode ? 'Edit Item Definition' : t('items.newItemDefinition')}</SheetTitle>
        </SheetHeader>

        <div id="create-item-def-body" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Name */}
          <div id="create-item-def-name-section" className="space-y-1">
            <Label id="create-item-def-name-label" htmlFor="create-item-def-name-input">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="create-item-def-name-input" placeholder="e.g. Iron Sword" value={name} onChange={(e) => {
            const v = e.target.value;
            setName(v);
            if (autoSlug)
                setItemCode(toSlugUnderscore(v));
        }}/>
            {errors.name && <p id="create-item-def-name-error" className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Item Code */}
          <div id="create-item-def-code-section" className="space-y-1">
            <Label id="create-item-def-code-label" htmlFor="create-item-def-code-input">{t('items.itemCode')} <span className="text-destructive">*</span> <span className="text-muted-foreground text-xs">({t('items.itemCodeHint')})</span></Label>
            <div id="create-item-def-code-row" className="flex gap-2">
              <Input id="create-item-def-code-input" placeholder="e.g. iron_sword" value={itemCode} readOnly={isEditMode} onChange={(e) => {
            if (!isEditMode) {
                setAutoSlug(false);
                setItemCode(e.target.value);
            }
        }} className="font-mono"/>
              <Button id="create-item-def-code-slug-btn" type="button" variant={autoSlug ? 'default' : 'outline'} size="icon" className="shrink-0" disabled={isEditMode} title={autoSlug ? t('items.autoSlugOn') : t('items.autoSlugOff')} onClick={() => { setAutoSlug(true); setItemCode(toSlugUnderscore(name)); }}>
                <Wand2 className="h-4 w-4"/>
              </Button>
            </div>
            {errors.itemCode && <p id="create-item-def-code-error" className="text-xs text-destructive">{errors.itemCode}</p>}
          </div>

          <div id="create-item-def-description-section" className="space-y-1">
            <Label id="create-item-def-description-label" htmlFor="create-item-def-description-input">{t('items.description')}</Label>
            <Textarea id="create-item-def-description-input" placeholder="Describe this item" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}/>
          </div>

          {/* Category + Rarity */}
          <div id="create-item-def-cat-rar-row" className="grid grid-cols-2 gap-3">
            <div id="create-item-def-category-section" className="space-y-1">
              <Label id="create-item-def-category-label">{t('items.category')} <span className="text-destructive">*</span></Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ItemCategory)}>
                <SelectTrigger id="create-item-def-category-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent id="create-item-def-category-content">
                  {categories.map((c) => (<SelectItem id={`create-item-def-cat-${c}`} key={c} value={c}>{prettyCategory(c)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div id="create-item-def-rarity-section" className="space-y-1">
              <Label id="create-item-def-rarity-label">{t('items.rarity')} <span className="text-destructive">*</span></Label>
              <Select value={rarity} onValueChange={(v) => setRarity(v as ItemRarity)}>
                <SelectTrigger id="create-item-def-rarity-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent id="create-item-def-rarity-content">
                  {rarities.map((r) => (<SelectItem id={`create-item-def-rarity-${r}`} key={r} value={r}><RarityBadge rarity={r}/></SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid size */}
          <div id="create-item-def-grid-section" className="space-y-1.5">
            <div id="create-item-def-grid-row" className="grid grid-cols-2 gap-3">
              <div id="create-item-def-gridw-section" className="space-y-1">
                <Label id="create-item-def-gridw-label" htmlFor="create-item-def-gridw-input">{t('items.gridWidth')}</Label>
                <Input id="create-item-def-gridw-input" type="number" min={0} value={gridW} onChange={(e) => setGridW(e.target.value)}/>
              </div>
              <div id="create-item-def-gridh-section" className="space-y-1">
                <Label id="create-item-def-gridh-label" htmlFor="create-item-def-gridh-input">{t('items.gridHeight')}</Label>
                <Input id="create-item-def-gridh-input" type="number" min={0} value={gridH} onChange={(e) => setGridH(e.target.value)}/>
              </div>
            </div>
            <p id="create-item-def-grid-hint" className="text-[11px] text-muted-foreground pl-1">
              {(Number(gridW) || 0) === 0 || (Number(gridH) || 0) === 0
            ? t('items.gridHintVirtual')
            : (Number(gridW) || 1) === 1 && (Number(gridH) || 1) === 1
                ? t('items.gridHintSingle')
                : `${Number(gridW) || 1}×${Number(gridH) || 1} — item occupies ${(Number(gridW) || 1) * (Number(gridH) || 1)} cells in the inventory grid.`}
            </p>
          </div>

          {/* Stackable */}
          <div id="create-item-def-stackable-section" className="space-y-1.5">
            <div id="create-item-def-stackable-row" className="flex items-center gap-3">
              <Switch id="create-item-def-stackable-switch" checked={isStackable} onCheckedChange={setIsStackable}/>
              <Label id="create-item-def-stackable-label" htmlFor="create-item-def-stackable-switch">{t('items.stackable')}</Label>
              {isStackable && (<div id="create-item-def-maxstack-wrap" className="relative">
                  <Input id="create-item-def-maxstack-input" type="number" min={1} value={maxStack} onChange={(e) => setMaxStack(e.target.value)} className="h-8 w-36 pr-8"/>
                  {maxStack && (<button id="create-item-def-maxstack-clear" type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setMaxStack('')} title="Clear">
                      <X className="h-3.5 w-3.5"/>
                    </button>)}
                </div>)}
            </div>
            <p id="create-item-def-stackable-hint" className="text-[11px] text-muted-foreground pl-1">
              {!isStackable
            ? t('items.stackableHintNo')
            : maxStack === '' || maxStack === '0'
                ? t('items.stackableHintInfinite')
                : Number(maxStack) === 1
                    ? t('items.stackableHintOne')
                    : `Stackable up to ${Number(maxStack).toLocaleString()} per slot.`}
            </p>
            {errors.maxStack && (<p id="create-item-def-maxstack-error" className="text-xs text-destructive pl-1">{errors.maxStack}</p>)}
          </div>

          <div id="create-item-def-max-owned-section" className="space-y-1">
            <Label id="create-item-def-max-owned-label" htmlFor="create-item-def-max-owned-input">{t('items.maxOwnedQuantity')}</Label>
            <div id="create-item-def-max-owned-row" className="relative w-36">
              <Input id="create-item-def-max-owned-input" type="number" min={1} placeholder="∞" value={maxOwnedQuantity} onChange={(e) => setMaxOwnedQuantity(e.target.value)} className="h-8 pr-8"/>
              {maxOwnedQuantity && (<button id="create-item-def-max-owned-clear" type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setMaxOwnedQuantity('')} title="Clear">
                  <X className="h-3.5 w-3.5"/>
                </button>)}
            </div>
            <p id="create-item-def-max-owned-hint" className="text-[11px] text-muted-foreground">{t('items.maxOwnedQuantityHint')}</p>
            {errors.maxOwnedQuantity && (<p id="create-item-def-max-owned-error" className="text-xs text-destructive">{errors.maxOwnedQuantity}</p>)}
          </div>

          {/* Client Writable */}
          <div id="create-item-def-client-writable-section" className="space-y-2">
            <div id="create-item-def-client-writable-row" className="flex items-center gap-3">
              <Switch id="create-item-def-client-writable-switch" checked={clientWritable} onCheckedChange={setClientWritable}/>
              <Label id="create-item-def-client-writable-label" htmlFor="create-item-def-client-writable-switch">{t('items.allowClientWriteProps')}</Label>
            </div>
            {clientWritable && (<p id="create-item-def-client-writable-hint" className="text-xs text-muted-foreground pl-1">
                When enabled, the game client can update <code className="font-mono text-[11px] bg-muted px-1 rounded">public_properties</code> on inventory items owned by the player (e.g. skin, nickname). Max 50 properties total including nested keys.
              </p>)}
          </div>

          {/* Allow Client Update Qty */}
          <div id="create-item-def-update-qty-section" className="space-y-2">
            <div id="create-item-def-update-qty-row" className="flex items-center gap-3">
              <Switch id="create-item-def-update-qty-switch" checked={allowClientUpdateQty} onCheckedChange={setAllowClientUpdateQty}/>
              <Label id="create-item-def-update-qty-label" htmlFor="create-item-def-update-qty-switch">{t('items.allowClientUpdateQty')}</Label>
            </div>
            {allowClientUpdateQty && (<p id="create-item-def-update-qty-hint" className="text-xs text-muted-foreground pl-1">
                When enabled, the game client can update the quantity of this item in the player&apos;s inventory.
              </p>)}
          </div>

          {/* Generator Config */}
          {category === 'generator' && (<div id="create-item-def-gen-section" className="space-y-4">
              <Label id="create-item-def-gen-label" className="text-sm font-semibold">{t('items.generatorConfig')}</Label>

              {/* Card 1: Collect Destination + Mailbox */}
              <div id="create-item-def-gen-collect-card" className="space-y-4 rounded-lg border p-5">
                <div id="create-item-def-gen-collect-dest-section" className="space-y-1.5">
                  <Label id="create-item-def-gen-collect-dest-label" htmlFor="create-item-def-gen-collect-dest">{t('items.collectDestination')}</Label>
                  <Select value={genCollectDestination} onValueChange={(v) => setGenCollectDestination(v as 'mailbox' | 'inventory')}>
                    <SelectTrigger id="create-item-def-gen-collect-dest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent id="create-item-def-gen-collect-dest-content">
                      <SelectItem id="create-item-def-gen-dest-mailbox" value="mailbox">{t('items.collectDestinationMailbox')}</SelectItem>
                      <SelectItem id="create-item-def-gen-dest-inventory" value="inventory">{t('items.collectDestinationInventory')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {genCollectDestination === 'inventory' && (<p id="create-item-def-gen-inventory-hint" className="text-xs text-muted-foreground">{t('items.generatorInventoryHint')}</p>)}
                </div>

                {genCollectDestination === 'mailbox' && (<div id="create-item-def-gen-mailbox-section" className="space-y-3">
                    <div id="create-item-def-gen-mailbox-title-section" className="space-y-1.5">
                      <Label id="create-item-def-gen-mailbox-title-label" htmlFor="create-item-def-gen-mailbox-title">{t('items.generatorMailboxTitle')}</Label>
                      <Input id="create-item-def-gen-mailbox-title" value={genMailboxTitle} onChange={(e) => setGenMailboxTitle(e.target.value)} placeholder={t('items.generatorMailboxTitlePlaceholder')}/>
                    </div>
                    <div id="create-item-def-gen-mailbox-body-section" className="space-y-1.5">
                      <Label id="create-item-def-gen-mailbox-body-label" htmlFor="create-item-def-gen-mailbox-body">{t('items.generatorMailboxBody')}</Label>
                      <Textarea id="create-item-def-gen-mailbox-body" value={genMailboxBody} onChange={(e) => setGenMailboxBody(e.target.value)} placeholder={t('items.generatorMailboxBodyPlaceholder')} rows={3}/>
                    </div>
                    <p id="create-item-def-gen-mailbox-hint" className="text-xs text-muted-foreground">{t('items.generatorMailboxHint')}</p>
                  </div>)}
              </div>

              {/* Card 2: Interval + Tick Capacity */}
              <div id="create-item-def-gen-interval-card" className="space-y-4 rounded-lg border p-5">
                <div id="create-item-def-gen-interval-row" className="grid grid-cols-2 gap-4">
                  <div id="create-item-def-gen-interval-section" className="space-y-1.5">
                    <Label id="create-item-def-gen-interval-label" htmlFor="create-item-def-gen-interval">{t('items.intervalLabel')} <span className="text-destructive">*</span></Label>
                    <Input id="create-item-def-gen-interval" type="number" min={1} value={genInterval} onChange={(e) => setGenInterval(e.target.value)}/>
                    {errors.genInterval && <p id="create-item-def-gen-interval-error" className="text-xs text-destructive">{errors.genInterval}</p>}
                  </div>
                  <div id="create-item-def-gen-tick-section" className="space-y-1.5">
                    <Label id="create-item-def-gen-tick-label" htmlFor="create-item-def-gen-tick">{t('items.tickCapacity')} <span className="text-destructive">*</span></Label>
                    <Input id="create-item-def-gen-tick" type="number" min={1} value={genTickCapacity} onChange={(e) => setGenTickCapacity(e.target.value)}/>
                    {errors.genTickCapacity && <p id="create-item-def-gen-tick-error" className="text-xs text-destructive">{errors.genTickCapacity}</p>}
                  </div>
                </div>

                {(() => {
                const interval = parseInt(genInterval) || 0;
                const ticks = parseInt(genTickCapacity) || 0;
                const maxSeconds = interval * ticks;
                if (interval > 0 && ticks > 0) {
                    const hours = Math.floor(maxSeconds / 3600);
                    const mins = Math.floor((maxSeconds % 3600) / 60);
                    const timeStr = hours > 0
                        ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
                        : `${mins}m`;
                    return (<div id="create-item-def-gen-offline-calc" className="rounded-md bg-muted/50 border border-dashed px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                        <p id="create-item-def-gen-offline-title" className="font-medium text-foreground/80">⏱ Offline Calculation</p>
                        <p id="create-item-def-gen-offline-formula">Max offline duration = <span className="font-mono font-medium text-foreground">{interval}s</span> × <span className="font-mono font-medium text-foreground">{ticks}</span> ticks = <span className="font-semibold text-foreground">{maxSeconds.toLocaleString()}s ({timeStr})</span></p>
                        <p id="create-item-def-gen-offline-desc">After being offline for up to <span className="font-medium text-foreground">{timeStr}</span>, the player can collect up to <span className="font-mono font-medium text-foreground">{ticks}</span> ticks worth of output.</p>
                      </div>);
                }
                return null;
            })()}
              </div>

              {/* Card 3: Output Pool */}
              <div id="create-item-def-gen-pool-card" className="space-y-3 rounded-lg border p-5">
                <div id="create-item-def-gen-pool-header" className="flex items-center justify-between">
                  <Label id="create-item-def-gen-pool-label" className="text-sm">{t('items.outputPool')} <span className="text-destructive">*</span></Label>
                  <Button id="create-item-def-gen-pool-add-btn" type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setGenOutputPool([...genOutputPool, { item_definition_id: '', drop_rate: '1', quantity_min: '1', quantity_max: '1', collect_cap: '5', initial_output: '0' }])}>
                    <Plus className="h-3.5 w-3.5"/> {t('items.addEntry')}
                  </Button>
                </div>

                {genOutputPool.map((entry, idx) => {
                const selectedItem = genAllItems.find((i) => i.id === entry.item_definition_id);
                return (<div id={`create-item-def-gen-pool-entry-${idx}`} key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3 relative">
                      <div id={`create-item-def-gen-pool-entry-header-${idx}`} className="flex items-center justify-between">
                        <span id={`create-item-def-gen-pool-entry-num-${idx}`} className="text-xs font-semibold text-muted-foreground">Entry #{idx + 1}</span>
                        {genOutputPool.length > 1 && (<Button id={`create-item-def-gen-pool-del-${idx}`} type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setGenOutputPool(genOutputPool.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3.5 w-3.5"/>
                          </Button>)}
                      </div>

                      <div id={`create-item-def-gen-pool-item-section-${idx}`} className="space-y-1.5">
                        <Label id={`create-item-def-gen-pool-item-label-${idx}`} className="text-xs">{t('items.itemDefinition')} <span className="text-destructive">*</span></Label>
                        <Popover open={genPoolOpen[idx] ?? false} onOpenChange={(o) => setGenPoolOpen((prev) => ({ ...prev, [idx]: o }))} modal={true}>
                          <PopoverTrigger asChild>
                            <Button id={`create-item-def-gen-pool-item-btn-${idx}`} variant="outline" role="combobox" aria-expanded={genPoolOpen[idx] ?? false} className="w-full justify-between font-normal h-9">
                              {entry.item_definition_id ? (<span id={`create-item-def-gen-pool-item-val-${idx}`} className="truncate">
                                  {selectedItem?.name ?? entry.item_definition_id.slice(0, 12) + '…'}
                                  {selectedItem?.item_code && (<span className="ml-1.5 text-xs text-muted-foreground font-mono">({selectedItem.item_code})</span>)}
                                </span>) : (<span id={`create-item-def-gen-pool-item-placeholder-${idx}`} className="text-muted-foreground">Select item…</span>)}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent id={`create-item-def-gen-pool-popover-${idx}`} className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput id={`create-item-def-gen-pool-search-${idx}`} placeholder={t('items.searchByNameOrCode')} value={genPoolSearch[idx] ?? ''} onValueChange={(v) => setGenPoolSearch((prev) => ({ ...prev, [idx]: v }))}/>
                              <CommandList id={`create-item-def-gen-pool-list-${idx}`}>
                                <CommandEmpty>{genItemsLoading ? t('items.loadingDots') : t('items.noItemFound')}</CommandEmpty>
                                <CommandGroup id={`create-item-def-gen-pool-group-${idx}`}>
                                  {genStackableItems
                        .filter((d) => {
                        const q = (genPoolSearch[idx] ?? '').toLowerCase();
                        return !q || d.name.toLowerCase().includes(q) || (d.item_code ?? '').toLowerCase().includes(q);
                    })
                        .slice(0, 50)
                        .map((d) => (<CommandItem id={`create-item-def-gen-pool-option-${idx}-${d.id}`} key={d.id} value={d.id} onSelect={() => {
                            const pool = [...genOutputPool];
                            pool[idx] = { ...pool[idx], item_definition_id: d.id };
                            setGenOutputPool(pool);
                            setGenPoolOpen((prev) => ({ ...prev, [idx]: false }));
                            setGenPoolSearch((prev) => ({ ...prev, [idx]: '' }));
                        }}>
                                        <Check className={`mr-2 h-4 w-4 shrink-0 ${entry.item_definition_id === d.id ? 'opacity-100' : 'opacity-0'}`}/>
                                        <span id={`create-item-def-gen-pool-name-${idx}-${d.id}`} className="flex-1 truncate">{d.name}</span>
                                        {d.item_code && (<span id={`create-item-def-gen-pool-code-${idx}-${d.id}`} className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>)}
                                      </CommandItem>))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {errors[`genPoolItem_${idx}`] && (<p id={`create-item-def-gen-pool-item-error-${idx}`} className="text-xs text-destructive">{errors[`genPoolItem_${idx}`]}</p>)}
                      </div>

                      <div id={`create-item-def-gen-pool-nums-row-${idx}`} className="grid grid-cols-3 gap-3">
                        <div id={`create-item-def-gen-pool-droprate-section-${idx}`} className="space-y-1.5">
                          <Label id={`create-item-def-gen-pool-droprate-label-${idx}`} className="text-xs font-medium">{t('items.dropRate')}</Label>
                          <Input id={`create-item-def-gen-pool-droprate-${idx}`} className="h-10 text-sm" type="number" step="0.01" min={0} max={1} value={entry.drop_rate} onChange={(e) => { const pool = [...genOutputPool]; pool[idx] = { ...pool[idx], drop_rate: e.target.value }; setGenOutputPool(pool); }}/>
                        </div>
                        <div id={`create-item-def-gen-pool-qtymin-section-${idx}`} className="space-y-1.5">
                          <Label id={`create-item-def-gen-pool-qtymin-label-${idx}`} className="text-xs font-medium">{t('items.qtyMin')}</Label>
                          <Input id={`create-item-def-gen-pool-qtymin-${idx}`} className="h-10 text-sm" type="number" min={1} value={entry.quantity_min} onChange={(e) => { const pool = [...genOutputPool]; pool[idx] = { ...pool[idx], quantity_min: e.target.value }; setGenOutputPool(pool); }}/>
                        </div>
                        <div id={`create-item-def-gen-pool-qtymax-section-${idx}`} className="space-y-1.5">
                          <Label id={`create-item-def-gen-pool-qtymax-label-${idx}`} className="text-xs font-medium">{t('items.qtyMax')}</Label>
                          <Input id={`create-item-def-gen-pool-qtymax-${idx}`} className="h-10 text-sm" type="number" min={1} value={entry.quantity_max} onChange={(e) => { const pool = [...genOutputPool]; pool[idx] = { ...pool[idx], quantity_max: e.target.value }; setGenOutputPool(pool); }}/>
                        </div>
                      </div>
                      <div id={`create-item-def-gen-pool-caps-row-${idx}`} className="grid grid-cols-2 gap-3">
                        <div id={`create-item-def-gen-pool-cap-section-${idx}`} className="space-y-1.5">
                          <Label id={`create-item-def-gen-pool-cap-label-${idx}`} className="text-xs font-medium">{t('items.collectCap')}</Label>
                          <Input id={`create-item-def-gen-pool-cap-${idx}`} className="h-10 text-sm" type="number" min={0} value={entry.collect_cap} onChange={(e) => { const pool = [...genOutputPool]; pool[idx] = { ...pool[idx], collect_cap: e.target.value }; setGenOutputPool(pool); }}/>
                        </div>
                        <div id={`create-item-def-gen-pool-init-section-${idx}`} className="space-y-1.5">
                          <Label id={`create-item-def-gen-pool-init-label-${idx}`} className="text-xs font-medium">{t('items.initialOutput')}</Label>
                          <Input id={`create-item-def-gen-pool-init-${idx}`} className="h-10 text-sm" type="number" min={0} value={entry.initial_output} onChange={(e) => { const pool = [...genOutputPool]; pool[idx] = { ...pool[idx], initial_output: e.target.value }; setGenOutputPool(pool); }}/>
                        </div>
                      </div>
                    </div>);
            })}


              </div>
            </div>)}

          {/* Base stats */}
          <KVEditor entries={stats} onChange={setStats} label={t('items.baseStatsLabel')} numericValue/>

          {/* Metadata */}
          <KVEditor entries={meta} onChange={setMeta} label={t('items.metadataLabel')}/>
        </div>

        <div id="create-item-def-footer" className="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
          <Button id="create-item-def-cancel-btn" variant="outline" disabled={loading} onClick={() => { resetForm(); onClose(); }}>{t('common.cancel')}</Button>
          <Button id="create-item-def-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{isEditMode ? t('common.saving') : t('items.creating')}</>
            : isEditMode ? t('common.update') : t('items.createItem')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>);
}
