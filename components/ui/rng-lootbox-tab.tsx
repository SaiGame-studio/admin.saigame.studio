"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getItemTypeLabel } from '@/lib/utils/item-type-utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Trash2, Plus, Search, Eye, ExternalLink, Package, Pencil, Save, X } from "lucide-react"
import { fetchGameItemProfiles, updateRngLootboxItems, fetchRngLootboxItems, ItemProfile, RngLootboxItem, RngLootboxItemDetail, UpdateRngLootboxRequest } from "@/lib/item-profile-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { isRngLootboxType, isLootboxType } from "@/lib/utils/item-profile-utils"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface RngLootBoxTabProps {
  itemProfile: ItemProfile
  gameId: string
}

interface EditableWeightProps {
  item: RngLootboxItemDetail
  lootboxProfileId: string
  onUpdate: () => void
  disabled: boolean
}

interface EditableQuantityRangeProps {
  item: RngLootboxItemDetail
  lootboxProfileId: string
  onUpdate: () => void
  disabled: boolean
  field: 'min_quantity' | 'max_quantity'
}

function EditableWeight({ item, lootboxProfileId, onUpdate, disabled }: EditableWeightProps) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(item.weight)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  useEffect(() => {
    setWeight(item.weight)
  }, [item.weight])

  const handleSave = async () => {
    if (weight <= 0) {
      setError("Weight must be greater than 0")
      return
    }
    
    if (weight === item.weight) {
      setEditing(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const request: UpdateRngLootboxRequest = {
        add: [{
          item_id: item.item_profile_id,
          weight: weight,
          min_quantity: item.min_quantity,
          max_quantity: item.max_quantity
        }],
        remove: []
      }
      
      await updateRngLootboxItems(lootboxProfileId, request)
      setEditing(false)
      onUpdate()
      
    } catch (err: any) {
      setError(err.message || "Failed to update weight")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setWeight(item.weight)
    setEditing(false)
    setError(null)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Weight:</span>
        {editing ? (
          <>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
              className="w-20 h-8"
              min="1"
              disabled={loading}
            />
            <Button
              onClick={handleSave}
              size="sm"
              variant="outline"
              disabled={loading || disabled}
            >
              {loading ? <span className="animate-spin">⟳</span> : <Save className="w-3 h-3" />}
            </Button>
            <Button
              onClick={handleCancel}
              size="sm"
              variant="outline"
              disabled={loading}
            >
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <>
            <span className="font-medium">{item.weight}</span>
            <Button
              onClick={() => setEditing(true)}
              size="sm"
              variant="ghost"
              disabled={disabled}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs">
          {error}
        </div>
      )}
    </div>
  )
}

function EditableQuantityRange({ item, lootboxProfileId, onUpdate, disabled, field }: EditableQuantityRangeProps) {
  const [editing, setEditing] = useState(false)
  const [quantity, setQuantity] = useState(item[field])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  useEffect(() => {
    setQuantity(item[field])
  }, [item[field]])

  const handleSave = async () => {
    if (quantity <= 0) {
      setError("Quantity must be greater than 0")
      return
    }

    if (field === 'max_quantity' && quantity < item.min_quantity) {
      setError("Max quantity cannot be less than min quantity")
      return
    }

    if (field === 'min_quantity' && quantity > item.max_quantity) {
      setError("Min quantity cannot be greater than max quantity")
      return
    }
    
    if (quantity === item[field]) {
      setEditing(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const request: UpdateRngLootboxRequest = {
        add: [{
          item_id: item.item_profile_id,
          weight: item.weight,
          min_quantity: field === 'min_quantity' ? quantity : item.min_quantity,
          max_quantity: field === 'max_quantity' ? quantity : item.max_quantity
        }],
        remove: []
      }
      
      await updateRngLootboxItems(lootboxProfileId, request)
      setEditing(false)
      onUpdate()
      
    } catch (err: any) {
      setError(err.message || "Failed to update quantity")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setQuantity(item[field])
    setEditing(false)
    setError(null)
  }

  const label = field === 'min_quantity' ? 'Min Qty' : 'Max Qty'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}:</span>
        {editing ? (
          <>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-20 h-8"
              min="1"
              disabled={loading}
            />
            <Button
              onClick={handleSave}
              size="sm"
              variant="outline"
              disabled={loading || disabled}
            >
              {loading ? <span className="animate-spin">⟳</span> : <Save className="w-3 h-3" />}
            </Button>
            <Button
              onClick={handleCancel}
              size="sm"
              variant="outline"
              disabled={loading}
            >
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <>
            <span className="font-medium">{item[field]}</span>
            <Button
              onClick={() => setEditing(true)}
              size="sm"
              variant="ghost"
              disabled={disabled}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs">
          {error}
        </div>
      )}
    </div>
  )
}

export function RngLootBoxTab({ itemProfile, gameId }: RngLootBoxTabProps) {
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)
  
  const [lootboxItems, setLootboxItems] = useState<RngLootboxItemDetail[]>([])
  const [availableItems, setAvailableItems] = useState<ItemProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItemId, setSelectedItemId] = useState("")
  const [weight, setWeight] = useState(1)
  const [minQuantity, setMinQuantity] = useState(1)
  const [maxQuantity, setMaxQuantity] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)

  // Load lootbox items and available items
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [allItems, currentLootboxItems] = await Promise.all([
        fetchGameItemProfiles(gameId),
        fetchRngLootboxItems(itemProfile.id)
      ])
      
      // Filter out loot_box items and the current item itself for available items
      const filteredItems = allItems.filter(item => 
        !isRngLootboxType({ type: item.type }) && 
        !isLootboxType({ type: item.type }) && 
        item.id !== itemProfile.id
      )
      setAvailableItems(filteredItems)
      setLootboxItems(currentLootboxItems)
      
    } catch (err: any) {
      setError(err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [itemProfile.id, gameId])

  // Handle adding item to lootbox
  const handleAddItem = async () => {
    if (!selectedItemId || weight <= 0 || minQuantity <= 0 || maxQuantity <= 0) return
    
    if (minQuantity > maxQuantity) {
      setError("Min quantity cannot be greater than max quantity")
      return
    }
    
    try {
      setIsUpdating(true)
      
      const request: UpdateRngLootboxRequest = {
        add: [{
          item_id: selectedItemId,
          weight: weight,
          min_quantity: minQuantity,
          max_quantity: maxQuantity
        }],
        remove: []
      }
      
      await updateRngLootboxItems(itemProfile.id, request)
      
      // Reload data to get fresh state
      await loadData()
      
      setSelectedItemId("")
      setWeight(1)
      setMinQuantity(1)
      setMaxQuantity(1)
      
    } catch (err: any) {
      setError(err.message || "Failed to add item to RNG lootbox")
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle removing item from lootbox
  const handleRemoveItem = async (itemId: string) => {
    try {
      setIsUpdating(true)
      
      const request: UpdateRngLootboxRequest = {
        add: [],
        remove: [itemId]
      }
      
      await updateRngLootboxItems(itemProfile.id, request)
      
      // Reload data to get fresh state
      await loadData()
      
    } catch (err: any) {
      setError(err.message || "Failed to remove item from RNG lootbox")
    } finally {
      setIsUpdating(false)
    }
  }

  if (!isRngLootboxType(itemProfile)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="mx-auto h-12 w-12 mb-4" />
        <p>{t('rngLootbox.notRngLootboxType')}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        {t('common.loading')}
      </div>
    )
  }

  const filteredAvailableItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg p-4 bg-destructive/10">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Add Item Section */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">{t('rngLootbox.addItem')}</h3>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('rngLootbox.searchItems')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="md:col-span-2">
                <SelectValue placeholder={t('rngLootbox.selectItem')} />
              </SelectTrigger>
              <SelectContent>
                {filteredAvailableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.code_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder={t('rngLootbox.weight')}
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
              min="1"
            />
            <Input
              type="number"
              placeholder={t('rngLootbox.minQuantity')}
              value={minQuantity}
              onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
              min="1"
            />
            <Input
              type="number"
              placeholder={t('rngLootbox.maxQuantity')}
              value={maxQuantity}
              onChange={(e) => setMaxQuantity(parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleAddItem}
              disabled={!selectedItemId || weight <= 0 || minQuantity <= 0 || maxQuantity <= 0 || isUpdating}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isUpdating ? t('rngLootbox.updating') : t('rngLootbox.addItem')}
            </Button>
          </div>
        </div>
        {lootboxItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t('rngLootbox.emptyLootbox')}
          </p>
        ) : (
          <div className="space-y-2 mt-6">
            <h4 className="font-medium">{t('rngLootbox.currentItems')} ({lootboxItems.length})</h4>
            {lootboxItems.map((item, index) => (
              <div
                key={`${item.item_profile_id}-${index}`}
                className="flex items-center justify-between p-3 bg-background border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link 
                      href={`/games/${gameId}/item-profiles/${item.item_profile_id}`}
                      className="font-medium inline-flex items-center gap-1 hover:text-primary"
                    >
                      {item.item_profile.name}
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <Badge variant="secondary" className="text-xs">{item.item_profile.type}</Badge>
                    <Badge 
                      variant={item.item_profile.status === 'active' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
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
                    <EditableWeight
                      item={item}
                      lootboxProfileId={itemProfile.id}
                      onUpdate={loadData}
                      disabled={isUpdating}
                    />
                    <EditableQuantityRange
                      item={item}
                      lootboxProfileId={itemProfile.id}
                      onUpdate={loadData}
                      disabled={isUpdating}
                      field="min_quantity"
                    />
                    <EditableQuantityRange
                      item={item}
                      lootboxProfileId={itemProfile.id}
                      onUpdate={loadData}
                      disabled={isUpdating}
                      field="max_quantity"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/games/${gameId}/item-profiles/${item.item_profile_id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {t('common.viewDetails')}
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isUpdating}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('rngLootbox.removeItem')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('rngLootbox.removeItemConfirmation')} {item.item_profile.name}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveItem(item.item_profile_id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('common.remove')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
