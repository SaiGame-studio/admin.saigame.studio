'use client';
import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/use-translation';
import { updateItemDefinition } from '@/lib/inventory-api';
import type { ItemDefinition, UpdateItemRequest } from '@/types/inventory';
import type { CreateItemInitialValues } from '@/components/CreateItemDefinitionDialog';
import { RARITY_COLORS } from '@/types/inventory';
interface SseUpdateSheetProps {
    open: boolean;
    onClose: () => void;
    onApplied: (updated: ItemDefinition) => void;
    item: ItemDefinition;
    gameId: string;
    sseData: CreateItemInitialValues;
}
function FieldRow({ label, current, proposed, }: {
    label: string;
    current: React.ReactNode;
    proposed: React.ReactNode;
}) {
    const same = String(current) === String(proposed);
    return (<div id={`sse-update-field-row-${label}`} className="grid grid-cols-3 gap-2 items-start text-xs py-1.5 border-b last:border-0">
      <span id={`sse-update-field-label-${label}`} className="text-muted-foreground font-medium truncate">{label}</span>
      <span id={`sse-update-field-current-${label}`} className="text-muted-foreground truncate">{current ?? <span className="italic">—</span>}</span>
      <span id={`sse-update-field-proposed-${label}`} className={same ? 'text-muted-foreground truncate' : 'font-semibold text-foreground truncate'}>
        {proposed ?? <span className="italic">—</span>}
      </span>
    </div>);
}
export function SseUpdateSheet({ open, onClose, onApplied, item, gameId, sseData, }: SseUpdateSheetProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    async function handleApply() {
        setSaving(true);
        try {
            const patch: UpdateItemRequest = {};
            if (sseData.name?.trim())
                patch.name = sseData.name.trim();
            if (sseData.item_code !== undefined)
                patch.item_code = sseData.item_code?.trim() || undefined;
            if (sseData.category)
                patch.category = sseData.category;
            if (sseData.rarity)
                patch.rarity = sseData.rarity;
            if (sseData.is_stackable !== undefined)
                patch.is_stackable = sseData.is_stackable;
            if (sseData.max_stack_size != null && sseData.max_stack_size !== '') {
                patch.max_stack_size = Number(sseData.max_stack_size) || null;
            }
            if (sseData.max_owned_quantity !== undefined) {
                patch.max_owned_quantity = sseData.max_owned_quantity === '' ? null : Number(sseData.max_owned_quantity) || null;
            }
            if (sseData.grid_width != null)
                patch.grid_width = Number(sseData.grid_width) || 1;
            if (sseData.grid_height != null)
                patch.grid_height = Number(sseData.grid_height) || 1;
            if (sseData.client_writable !== undefined)
                patch.client_writable = sseData.client_writable;
            if (sseData.allow_client_update_qty !== undefined)
                patch.allow_client_update_qty = sseData.allow_client_update_qty;
            // base_stats
            if (sseData.stats && sseData.stats.length > 0) {
                const base_stats: Record<string, number> = {};
                sseData.stats.forEach(({ key, value }) => {
                    if (key.trim())
                        base_stats[key.trim()] = Number(value) || 0;
                });
                patch.base_stats = base_stats;
            }
            // description → metadata
            if (sseData.description?.trim()) {
                patch.metadata = { ...(item.metadata ?? {}), description: sseData.description.trim() };
            }
            const res = await updateItemDefinition({ gameId }, item.id, patch);
            toast({ title: t('llmConversation.sseUpdateApplied') });
            onApplied(res.item);
            onClose();
        }
        catch (err: any) {
            toast({ variant: 'destructive', title: t('llmConversation.sseUpdateFailed'), description: err?.message });
        }
        finally {
            setSaving(false);
        }
    }
    const rarityColor = sseData.rarity ? RARITY_COLORS[sseData.rarity] : null;
    return (<Sheet open={open} onOpenChange={(v) => {
            if (!v)
                onClose();
        }}>
      <SheetContent id="sse-update-sheet-root" side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col">
        <SheetHeader id="sse-update-sheet-header">
          <div id="sse-update-sheet-title-row" className="flex items-center gap-2">
            <Sparkles id="sse-update-sheet-icon" className="h-4 w-4 text-primary"/>
            <SheetTitle id="sse-update-sheet-title">{t('llmConversation.sseUpdateTitle')}</SheetTitle>
          </div>
          <p id="sse-update-sheet-desc" className="text-xs text-muted-foreground">{t('llmConversation.sseUpdateDesc')}</p>
        </SheetHeader>

        <div id="sse-update-sheet-body" className="flex-1 overflow-y-auto py-3 space-y-1">
          {/* Column headers */}
          <div id="sse-update-headers" className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-1 border-b">
            <span id="sse-update-header-field">{t('common.field') || 'Field'}</span>
            <span id="sse-update-header-current">{t('common.current') || 'Current'}</span>
            <span id="sse-update-header-proposed">{t('common.proposed') || 'Proposed (AI)'}</span>
          </div>

          {sseData.name !== undefined && (<FieldRow label={t('items.name')} current={item.name} proposed={sseData.name}/>)}
          {sseData.item_code !== undefined && (<FieldRow label={t('items.itemCode')} current={item.item_code ?? '—'} proposed={sseData.item_code ?? '—'}/>)}
          {sseData.category !== undefined && (<FieldRow label={t('items.category')} current={item.category} proposed={sseData.category}/>)}
          {sseData.rarity !== undefined && (<FieldRow label={t('items.rarity')} current={item.rarity} proposed={rarityColor ? (<Badge id="sse-update-rarity-badge" variant="outline" className={`text-[10px] px-1 py-0 ${rarityColor.text} ${rarityColor.border} ${rarityColor.bg}`}>
                    {sseData.rarity}
                  </Badge>) : sseData.rarity}/>)}
          {sseData.grid_width !== undefined && (<FieldRow label={`${t('items.gridWidth')} × ${t('items.gridHeight')}`} current={`${item.grid_width} × ${item.grid_height}`} proposed={`${sseData.grid_width} × ${sseData.grid_height}`}/>)}
          {sseData.is_stackable !== undefined && (<FieldRow label={t('items.stackable')} current={item.is_stackable ? '✓' : '✗'} proposed={sseData.is_stackable ? '✓' : '✗'}/>)}
          {sseData.max_stack_size !== undefined && (<FieldRow label={t('items.maxStackSize') || 'Max Stack'} current={item.max_stack_size ?? '∞'} proposed={sseData.max_stack_size || '∞'}/>)}
          {sseData.max_owned_quantity !== undefined && (<FieldRow label={t('items.maxOwnedQuantity')} current={item.max_owned_quantity ?? '∞'} proposed={sseData.max_owned_quantity || '∞'}/>)}
          {sseData.description !== undefined && sseData.description !== '' && (<FieldRow label={t('items.description')} current={(item.metadata?.description as string | undefined) ?? '—'} proposed={sseData.description}/>)}
          {sseData.stats && sseData.stats.length > 0 && (<FieldRow label={t('items.baseStats')} current={Object.keys(item.base_stats ?? {}).length > 0
                ? Object.entries(item.base_stats ?? {}).map(([k, v]) => `${k}=${v}`).join(', ')
                : '—'} proposed={sseData.stats.map(({ key, value }) => `${key}=${value}`).join(', ')}/>)}
          {sseData.client_writable !== undefined && (<FieldRow label={t('items.allowClientWriteProps')} current={item.client_writable ? '✓' : '✗'} proposed={sseData.client_writable ? '✓' : '✗'}/>)}
          {sseData.allow_client_update_qty !== undefined && (<FieldRow label={t('items.allowClientUpdateQty')} current={item.allow_client_update_qty ? '✓' : '✗'} proposed={sseData.allow_client_update_qty ? '✓' : '✗'}/>)}
        </div>

        <SheetFooter id="sse-update-sheet-footer" className="gap-2 pt-2">
          <Button id="sse-update-cancel-btn" variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button id="sse-update-apply-btn" onClick={handleApply} disabled={saving}>
            {saving
            ? <><Loader2 id="sse-update-apply-spinner" className="h-4 w-4 mr-2 animate-spin"/>{t('common.saving')}</>
            : <><Sparkles id="sse-update-apply-icon" className="h-4 w-4 mr-2"/>{t('llmConversation.sseUpdateApply')}</>}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
