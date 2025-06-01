"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Trash2, Plus, Search, Eye, ExternalLink, Package } from "lucide-react"
import { getInventoryItemProfiles, addItemToInventory, removeItemFromInventory, fetchGameItemProfiles, ItemProfile, getGameInventoryProfiles } from "@/lib/item-profile-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { getInventoryTabUrl } from "@/lib/utils/item-profile-utils"

interface InventoryTabProps {
  itemProfile: ItemProfile
  gameId: string
}

// Small component to render inventory indicator
interface InventoryIndicatorProps {
  inventory: ItemProfile
  gameId: string
  t: (key: string) => string
}

const InventoryIndicator = ({ inventory, gameId, t }: InventoryIndicatorProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Link 
          href={getInventoryTabUrl(gameId, inventory.id)}
          className="flex items-center justify-center w-5 h-5 cursor-pointer hover:scale-110 transition-transform"
        >
          <Package className="w-4 h-4 text-orange-600 hover:text-orange-700" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('inventory.inOtherInventory')}: {inventory.name}</p>
        <p className="text-xs text-muted-foreground">{t('inventory.clickToViewInventory')}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export function InventoryTab({ itemProfile, gameId }: InventoryTabProps) {
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)
  const [inventoryItems, setInventoryItems] = useState<ItemProfile[]>([])
  const [availableItems, setAvailableItems] = useState<ItemProfile[]>([])
  const [allInventories, setAllInventories] = useState<ItemProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [itemToMove, setItemToMove] = useState<{ itemId: string; fromInventory: ItemProfile | null }>({ itemId: "", fromInventory: null })

  // Function to find which inventory an item belongs to
  const getItemInventoryInfo = (itemId: string) => {
    // Find the item in available items list
    const item = availableItems.find(i => i.id === itemId)
    if (!item || !item.inventory_profile_id) {
      return null
    }
    
    // Find the inventory that this item belongs to
    const belongsToInventory = allInventories.find(inv => inv.id === item.inventory_profile_id)
    
    // Only return if it's a different inventory than the current one
    if (belongsToInventory && belongsToInventory.id !== itemProfile.id) {
      return belongsToInventory
    }
    
    return null
  }

  // Load inventory items and available items
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [inventoryData, allItems, allInventoryProfiles] = await Promise.all([
        getInventoryItemProfiles(itemProfile.id),
        fetchGameItemProfiles(gameId),
        getGameInventoryProfiles(gameId)
      ])
      
      setInventoryItems(inventoryData)
      setAllInventories(allInventoryProfiles)
      
      // Filter out items that are already in current inventory and exclude inventory items
      const filteredItems = allItems.filter(item => 
        item.type !== 'inventory' && 
        !inventoryData.some(invItem => invItem.id === item.id)
      )
      setAvailableItems(filteredItems)
    } catch (err: any) {
      setError(err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [itemProfile.id, gameId, itemProfile.type])

  const handleAddItem = async () => {
    if (!selectedItemId) return
    
    // Check if item belongs to another inventory
    const belongsToInventory = getItemInventoryInfo(selectedItemId)
    if (belongsToInventory) {
      // Show warning dialog
      setItemToMove({ itemId: selectedItemId, fromInventory: belongsToInventory })
      setWarningDialogOpen(true)
      return
    }
    
    // Proceed with normal add
    await addItemToInventoryInternal(selectedItemId)
  }

  const addItemToInventoryInternal = async (itemId: string) => {
    try {
      setIsAddingItem(true)
      await addItemToInventory(itemProfile.id, [itemId])
      await loadData() // Refresh data
      setSelectedItemId("")
    } catch (err: any) {
      setError(err.message || "Failed to add item to inventory")
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleConfirmMove = async () => {
    setWarningDialogOpen(false)
    await addItemToInventoryInternal(itemToMove.itemId)
    setItemToMove({ itemId: "", fromInventory: null })
  }

  const handleCancelMove = () => {
    setWarningDialogOpen(false)
    setItemToMove({ itemId: "", fromInventory: null })
    setSelectedItemId("")
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItemFromInventory(itemProfile.id, [itemId])
      await loadData() // Refresh data
    } catch (err: any) {
      setError(err.message || "Failed to remove item from inventory")
    }
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

      {/* Inventory Items List */}
      <div className="rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">{t('inventory.currentItems')} ({inventoryItems.length})</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('inventory.searchItems')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder={t('inventory.selectItem')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAvailableItems.map((item) => {
                    const belongsToInventory = getItemInventoryInfo(item.id)
                    return (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                          </div>
                          {belongsToInventory && (
                            <InventoryIndicator inventory={belongsToInventory} gameId={gameId} t={t} />
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddItem} 
                disabled={!selectedItemId || isAddingItem}
                className="whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAddingItem ? t('common.adding') : t('inventory.addItem')}
              </Button>
            </div>
          </div>
          {inventoryItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('inventory.emptyInventory')}
            </p>
          ) : (
            <div className="space-y-2">
              {inventoryItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/games/${gameId}/item-profiles/${item.id}`}
                        className="font-medium inline-flex items-center gap-1 hover:text-primary"
                      >
                        {item.name}
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                      <Badge 
                        variant={item.status === 'active' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('itemProfile.updatedAt')}: {formatTimestamp(item.updated_at)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/games/${gameId}/item-profiles/${item.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        {t('common.viewDetails')}
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('inventory.removeItem')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('inventory.removeItemConfirm')} "{item.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRemoveItem(item.id)}
                            className="bg-destructive hover:bg-destructive/90"
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
      
      {/* Warning Dialog for moving items from other inventory */}
      <AlertDialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.moveItemWarning')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory.moveItemWarningText')}
              {itemToMove.fromInventory && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="text-sm font-medium">{t('inventory.currentInventory')}: {itemToMove.fromInventory.name}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelMove}>
              {t('inventory.keepInCurrent')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmMove}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {t('inventory.moveItem')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 