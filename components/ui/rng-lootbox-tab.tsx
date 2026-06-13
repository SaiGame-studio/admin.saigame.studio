"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getItemTypeLabel } from '@/lib/utils/item-type-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Plus, Search, Eye, ExternalLink, Package, Pencil, Save, X, Percent, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { fetchGameItemProfiles, updateRngLootboxItems, fetchRngLootboxItems, ItemProfile, RngLootboxItem, RngLootboxItemDetail, UpdateRngLootboxRequest } from "@/lib/item-profile-api";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { isRngLootboxType, isLootboxType } from "@/lib/utils/item-profile-utils";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
interface RngLootBoxTabProps {
    itemProfile: ItemProfile;
    gameId: string;
}
interface EditableWeightProps {
    item: RngLootboxItemDetail;
    lootboxProfileId: string;
    onUpdate: () => void;
    disabled: boolean;
}
interface EditableQuantityRangeProps {
    item: RngLootboxItemDetail;
    lootboxProfileId: string;
    onUpdate: () => void;
    disabled: boolean;
    field: 'min_qty' | 'max_qty';
}
function EditableWeight({ item, lootboxProfileId, onUpdate, disabled }: EditableWeightProps) {
    const [editing, setEditing] = useState(false);
    const [weight, setWeight] = useState(item.weight);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    useEffect(() => {
        setWeight(item.weight);
    }, [item.weight]);
    const handleSave = async () => {
        if (weight <= 0) {
            setError("Percent must be greater than 0");
            return;
        }
        if (weight === item.weight) {
            setEditing(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const request: UpdateRngLootboxRequest = {
                add: [{
                        item_id: item.item_profile_id,
                        weight: weight,
                        min_quantity: item.min_qty,
                        max_quantity: item.max_qty
                    }],
                remove: []
            };
            await updateRngLootboxItems(lootboxProfileId, request);
            setEditing(false);
            onUpdate();
        }
        catch (err: any) {
            setError(err.message || "Failed to update percent");
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancel = () => {
        setWeight(item.weight);
        setEditing(false);
        setError(null);
    };
    return (<div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {editing ? (<>
            <span className="text-sm text-muted-foreground">Percent:</span>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3"/>
              <Input type="number" min="0" step="0.00001" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value) || 0)} className="w-32 h-6 px-2 pl-8 text-sm" disabled={loading}/>
            </div>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading || weight <= 0} className="h-6 w-6">
              <Save className="w-3 h-3"/>
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} disabled={loading} className="h-6 w-6">
              <X className="w-3 h-3"/>
            </Button>
          </>) : (<>
            <span className="text-sm text-muted-foreground">Percent: <span className="font-medium">{item.weight}%</span></span>
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
function EditableQuantityRange({ item, lootboxProfileId, onUpdate, disabled, field }: EditableQuantityRangeProps) {
    const [editing, setEditing] = useState(false);
    const [quantity, setQuantity] = useState(item[field]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    useEffect(() => {
        setQuantity(item[field]);
    }, [item[field]]);
    const handleSave = async () => {
        if (quantity <= 0) {
            setError("Quantity must be greater than 0");
            return;
        }
        if (field === 'max_qty' && quantity < item.min_qty) {
            setError("Max quantity cannot be less than min quantity");
            return;
        }
        if (field === 'min_qty' && quantity > item.max_qty) {
            setError("Min quantity cannot be greater than max quantity");
            return;
        }
        if (quantity === item[field]) {
            setEditing(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const request: UpdateRngLootboxRequest = {
                add: [{
                        item_id: item.item_profile_id,
                        weight: item.weight,
                        min_quantity: field === 'min_qty' ? quantity : item.min_qty,
                        max_quantity: field === 'max_qty' ? quantity : item.max_qty
                    }],
                remove: []
            };
            await updateRngLootboxItems(lootboxProfileId, request);
            setEditing(false);
            onUpdate();
        }
        catch (err: any) {
            setError(err.message || "Failed to update quantity");
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancel = () => {
        setQuantity(item[field]);
        setEditing(false);
        setError(null);
    };
    const label = field === 'min_qty' ? 'Min Qty' : 'Max Qty';
    return (<div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {editing ? (<>
            <span className="text-sm text-muted-foreground">{label}:</span>
            <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-20 h-6 px-2 text-sm" disabled={loading}/>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading || quantity <= 0} className="h-6 w-6">
              <Save className="w-3 h-3"/>
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} disabled={loading} className="h-6 w-6">
              <X className="w-3 h-3"/>
            </Button>
          </>) : (<>
            <span className="text-sm text-muted-foreground">{label}: <span className="font-medium">{item[field]}</span></span>
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
export function RngLootBoxTab({ itemProfile, gameId }: RngLootBoxTabProps) {
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const [lootboxItems, setLootboxItems] = useState<RngLootboxItemDetail[]>([]);
    const [availableItems, setAvailableItems] = useState<ItemProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItemId, setSelectedItemId] = useState("");
    const [weight, setWeight] = useState(1);
    const [minQuantity, setMinQuantity] = useState(1);
    const [maxQuantity, setMaxQuantity] = useState(1);
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
                fetchRngLootboxItems(itemProfile.id)
            ]);
            // Filter out loot_box items and the current item itself for available items
            const filteredItems = allItems.filter(item => !isRngLootboxType({ type: item.type }) &&
                !isLootboxType({ type: item.type }) &&
                item.id !== itemProfile.id);
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
        if (!selectedItemId || weight <= 0 || minQuantity <= 0 || maxQuantity <= 0)
            return;
        if (minQuantity > maxQuantity) {
            setError("Min quantity cannot be greater than max quantity");
            return;
        }
        try {
            setIsUpdating(true);
            const request: UpdateRngLootboxRequest = {
                add: [{
                        item_id: selectedItemId,
                        weight: weight,
                        min_quantity: minQuantity,
                        max_quantity: maxQuantity
                    }],
                remove: []
            };
            await updateRngLootboxItems(itemProfile.id, request);
            // Reload data to get fresh state only on success
            await loadData(true); // Clear error on successful reload
            setSelectedItemId("");
            setWeight(1);
            setMinQuantity(1);
            setMaxQuantity(1);
        }
        catch (err: any) {
            setError(err.message || "Failed to add item to RNG lootbox");
        }
        finally {
            setIsUpdating(false);
        }
    };
    // Handle removing item from lootbox
    const handleRemoveItem = async (itemId: string) => {
        try {
            setIsUpdating(true);
            const request: UpdateRngLootboxRequest = {
                add: [],
                remove: [itemId]
            };
            await updateRngLootboxItems(itemProfile.id, request);
            // Reload data to get fresh state only on success
            await loadData(true); // Clear error on successful reload
        }
        catch (err: any) {
            setError(err.message || "Failed to remove item from RNG lootbox");
        }
        finally {
            setIsUpdating(false);
        }
    };
    const handleSuccessfulUpdate = () => {
        loadData(true); // Clear error on successful update
    };
    if (!isRngLootboxType(itemProfile)) {
        return (<div className="text-center py-8 text-muted-foreground">
        <Package className="mx-auto h-12 w-12 mb-4"/>
        <p>{t('rngLootbox.notRngLootboxType')}</p>
      </div>);
    }
    if (loading) {
        return (<div className="p-6 text-center">
        {t('common.loading')}
      </div>);
    }
    const filteredAvailableItems = availableItems;
    // Calculate total weight
    const totalWeight = lootboxItems.reduce((sum, item) => sum + item.weight, 0);
    const isWeightIncomplete = totalWeight < 100 && lootboxItems.length > 0;
    return (<div className="space-y-6">
      {error && (<div className="rounded-lg p-4 bg-destructive/10">
          <p className="text-destructive">{error}</p>
        </div>)}

      {/* RNG Lootbox Items List */}
      <div className="rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">{t('rngLootbox.currentItems')} ({lootboxItems.length})</h3>
              {lootboxItems.length > 0 && (<span className="text-sm text-muted-foreground">
                  Total Percent: <span className={`font-medium ${totalWeight === 100 ? 'text-green-600' : totalWeight > 100 ? 'text-red-600' : 'text-orange-600'}`}>{totalWeight}%</span>
                </span>)}
            </div>
            <div className="flex gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="min-w-64 max-w-80 flex-1">
                  <SelectValue placeholder={t('rngLootbox.selectItem')}/>
                </SelectTrigger>
                <SelectContent className="max-w-96">
                  {filteredAvailableItems.map((item) => (<SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{item.name}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">{getItemTypeLabel(item.type)}</Badge>
                      </div>
                    </SelectItem>))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"/>
                <Input type="number" min="0" step="0.00001" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value) || 0)} placeholder={t('rngLootbox.weight')} className="w-32 pl-10"/>
              </div>
              <div className="relative">
                <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"/>
                <Input type="number" min="1" value={minQuantity} onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)} placeholder={t('rngLootbox.minQuantity')} className="w-24 pl-10"/>
              </div>
              <div className="relative">
                <ChevronUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"/>
                <Input type="number" min="1" value={maxQuantity} onChange={(e) => setMaxQuantity(parseInt(e.target.value) || 1)} placeholder={t('rngLootbox.maxQuantity')} className="w-24 pl-10"/>
              </div>
              <Button onClick={handleAddItem} disabled={!selectedItemId || weight <= 0 || minQuantity <= 0 || maxQuantity <= 0 || isUpdating} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2"/>
                {isUpdating ? t('rngLootbox.updating') : t('rngLootbox.addItem')}
              </Button>
            </div>
          </div>

          {/* Weight Warning */}
          {lootboxItems.length > 0 && (isWeightIncomplete || totalWeight > 100) && (<div className="mb-4">
              {isWeightIncomplete && (<div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                  <AlertTriangle className="w-4 h-4 shrink-0"/>
                  <span className="text-sm font-medium">
                    Warning: Percent distribution is incomplete ({totalWeight}%). Missing {100 - totalWeight}% to reach 100% for proper probability distribution.
                  </span>
                </div>)}
              {totalWeight > 100 && (<div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                  <AlertTriangle className="w-4 h-4 shrink-0"/>
                  <span className="text-sm font-medium">
                    Warning: Percent exceeds 100% ({totalWeight}%). Drop rates will no longer be accurate.
                  </span>
                </div>)}
            </div>)}

          {lootboxItems.length === 0 ? (<p className="text-center text-muted-foreground py-8">
              {t('rngLootbox.emptyLootbox')}
            </p>) : (<div className="space-y-2">
              {lootboxItems.map((item, index) => (<div key={`${item.item_profile_id}-${index}`} className="group flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
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
                    <div className="flex gap-4 mt-2">
                      <EditableWeight item={item} lootboxProfileId={itemProfile.id} onUpdate={handleSuccessfulUpdate} disabled={isUpdating}/>
                      <EditableQuantityRange item={item} lootboxProfileId={itemProfile.id} onUpdate={handleSuccessfulUpdate} disabled={isUpdating} field="min_qty"/>
                      <EditableQuantityRange item={item} lootboxProfileId={itemProfile.id} onUpdate={handleSuccessfulUpdate} disabled={isUpdating} field="max_qty"/>
                    </div>
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
                          <AlertDialogTitle>{t('rngLootbox.removeItem')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('inventory.removeItemConfirm')} "{item.item_profile.name}" {t('rngLootbox.removeFromLootbox')}?
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
