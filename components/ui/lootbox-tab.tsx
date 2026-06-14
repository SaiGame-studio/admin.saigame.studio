"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getItemTypeLabel } from '@/lib/utils/item-type-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Plus, Eye, ExternalLink, Package, Pencil, Save, X } from "lucide-react";
import { fetchGameItemProfiles, updateLootboxItems, fetchFixedLootboxItems, ItemProfile, LootboxItem, LootboxItemDetail, UpdateLootboxRequest } from "@/lib/item-profile-api";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
interface FixedLootBoxTabProps {
    itemProfile: ItemProfile;
    gameId: string;
}
interface EditableQuantityProps {
    item: LootboxItemDetail;
    lootboxProfileId: string;
    onUpdate: () => void;
    disabled: boolean;
}
function EditableQuantity({ item, lootboxProfileId, onUpdate, disabled }: EditableQuantityProps) {
    const [editing, setEditing] = useState(false);
    const [quantity, setQuantity] = useState(item.quantity);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    useEffect(() => {
        setQuantity(item.quantity);
    }, [item.quantity]);
    const handleSave = async () => {
        if (quantity <= 0) {
            setError("Quantity must be greater than 0");
            return;
        }
        if (quantity === item.quantity) {
            setEditing(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const request: UpdateLootboxRequest = {
                add: [{
                        item_id: item.item_profile_id,
                        quantity: quantity
                    }],
                remove: []
            };
            await updateLootboxItems(lootboxProfileId, request);
            await onUpdate();
            setEditing(false);
        }
        catch (err: any) {
            setError(err.message || "Failed to update quantity");
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancel = () => {
        setEditing(false);
        setQuantity(item.quantity);
        setError(null);
    };
    return (<div className="flex flex-col gap-1">
      <div className="group flex items-center gap-2">
        {editing ? (<>
            <span className="text-sm text-muted-foreground">{t('lootbox.quantity')}:</span>
            <Input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="w-20 h-6 px-2 text-sm" disabled={loading}/>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading || quantity <= 0} className="h-6 w-6">
              <Save className="w-3 h-3"/>
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} disabled={loading} className="h-6 w-6">
              <X className="w-3 h-3"/>
            </Button>
          </>) : (<>
            <span className="text-sm text-muted-foreground">{t('lootbox.quantity')}: <span className="font-medium">{item.quantity}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} disabled={disabled} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-3 h-3"/>
            </Button>
          </>)}
      </div>
      {error && (<div className="text-red-500 text-xs">
          {error}
        </div>)}
    </div>);
}
export function FixedLootBoxTab({ itemProfile, gameId }: FixedLootBoxTabProps) {
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const [lootboxItems, setLootboxItems] = useState<LootboxItemDetail[]>([]);
    const [availableItems, setAvailableItems] = useState<ItemProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [isUpdating, setIsUpdating] = useState(false);
    // Load lootbox items and available items
    const loadData = async (clearError = true) => {
        try {
            setLoading(true);
            if (clearError) {
                setError(null);
            }
            const [allItems, currentLootboxItems] = await Promise.all([
                fetchGameItemProfiles(gameId),
                fetchFixedLootboxItems(itemProfile.id)
            ]);
            // Filter out loot_box_fixed items and the current item itself for available items
            const filteredItems = allItems.filter(item => item.type !== 'loot_box_fixed' && item.id !== itemProfile.id);
            setAvailableItems(filteredItems);
            setLootboxItems(currentLootboxItems);
        }
        catch (err: any) {
            setError(err.message || "Unknown error");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, [itemProfile.id, gameId]);
    // Handle adding item to lootbox
    const handleAddItem = async () => {
        if (!selectedItemId || quantity <= 0)
            return;
        try {
            setIsUpdating(true);
            const request: UpdateLootboxRequest = {
                add: [{
                        item_id: selectedItemId,
                        quantity: quantity
                    }],
                remove: []
            };
            await updateLootboxItems(itemProfile.id, request);
            // Reload data to get fresh state only on success
            await loadData(true); // Clear error on successful reload
            setSelectedItemId("");
            setQuantity(1);
        }
        catch (err: any) {
            setError(err.message || "Failed to add item to lootbox");
        }
        finally {
            setIsUpdating(false);
        }
    };
    // Handle removing item from lootbox
    const handleRemoveItem = async (itemId: string) => {
        try {
            setIsUpdating(true);
            const request: UpdateLootboxRequest = {
                add: [],
                remove: [itemId]
            };
            await updateLootboxItems(itemProfile.id, request);
            // Reload data to get fresh state only on success
            await loadData(true); // Clear error on successful reload
        }
        catch (err: any) {
            setError(err.message || "Failed to remove item from lootbox");
        }
        finally {
            setIsUpdating(false);
        }
    };
    const handleSuccessfulUpdate = () => {
        loadData(true); // Clear error on successful update
    };
    if (itemProfile.type !== 'loot_box_fixed') {
        return (<div className="text-center py-8 text-muted-foreground">
        <Package className="mx-auto h-12 w-12 mb-4"/>
        <p>{t('lootbox.notLootboxType')}</p>
      </div>);
    }
    if (loading) {
        return (<div className="p-6 text-center">
        {t('common.loading')}
      </div>);
    }
    return (<div className="space-y-6">
      {error && (<div className="rounded-lg p-4 bg-destructive/10">
          <p className="text-destructive">{error}</p>
        </div>)}

      {/* Lootbox Items List */}
      <div className="rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">{t('lootbox.currentItems')} ({lootboxItems.length})</h3>
            </div>
            <div className="flex gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="min-w-64 max-w-80 flex-1">
                  <SelectValue placeholder={t('lootbox.selectItem')}/>
                </SelectTrigger>
                <SelectContent className="max-w-96">
                  {availableItems.map((item) => (<SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{item.name}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">{getItemTypeLabel(item.type)}</Badge>
                      </div>
                    </SelectItem>))}
                </SelectContent>
              </Select>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} placeholder={t('lootbox.quantity')} className="w-24"/>
              <Button onClick={handleAddItem} disabled={!selectedItemId || quantity <= 0 || isUpdating} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2"/>
                {isUpdating ? t('lootbox.updating') : t('lootbox.addItem')}
              </Button>
            </div>
          </div>
          {lootboxItems.length === 0 ? (<p className="text-center text-muted-foreground py-8">
              {t('lootbox.emptyLootbox')}
            </p>) : (<div className="space-y-2">
              {lootboxItems.map((item, index) => (<div key={`${item.item_profile_id}-${index}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/games/${gameId}/item-profiles/${item.item_profile_id}`} className="font-medium inline-flex items-center gap-1 hover:text-primary">
                        {item.item_profile.name}
                        <ExternalLink className="w-4 h-4"/>
                      </Link>
                      <Badge variant="secondary" className="text-xs">{item.item_profile.type}</Badge>
                      <Badge variant={item.item_profile.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {item.item_profile.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span>
                        {item.item_profile.code_name && `${t('itemProfile.code')}: ${item.item_profile.code_name}`}
                        {item.item_profile.updated_at && ` • ${t('itemProfile.updatedAt')}: ${formatTimestamp(item.item_profile.updated_at)}`}
                      </span>
                    </div>
                    <EditableQuantity item={item} lootboxProfileId={itemProfile.id} onUpdate={handleSuccessfulUpdate} disabled={isUpdating}/>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/games/${gameId}/item-profiles/${item.item_profile_id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2"/>
                        {t('common.viewDetails')}
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isUpdating}>
                          <Trash2 className="w-4 h-4"/>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('lootbox.removeItem')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('inventory.removeItemConfirm')} "{item.item_profile.name}" {t('lootbox.removeFromLootbox')}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveItem(item.item_profile_id)} className="bg-destructive hover:bg-destructive/90">
                            {t('common.remove')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>))}
            </div>)}
        </div>
      </div>
    </div>);
}
