"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Pencil, Save, X, Trash2, Eye, EyeOff } from "lucide-react"
import { fetchItemProfile, updateItemProfile, updateItemProfileCustomData, updateItemProfileStatus, ItemProfile } from "@/lib/item-profile-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { getGame } from "@/lib/game-api"
import { ItemType } from "@/types/game"
import { getEditableStatusOptions, getItemProfileStatusConfig } from "@/lib/utils/item-profile-status"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InventoryTab } from "@/components/ui/inventory-tab"
import { FixedLootBoxTab } from "@/components/ui/lootbox-tab"
import { PropertiesTab } from "@/components/ui/properties-tab"
import { getItemProfileUrl, parseTabFromUrl, ItemProfileTab, getInventoryTabUrl, isLootboxType } from "@/lib/utils/item-profile-utils"
import { getItemTypeOptions } from "@/lib/utils/item-type-utils"

// Available item type options for editing
const itemTypeOptions = getItemTypeOptions()

export default function ItemProfileDetailPage() {
  const params = useParams() as { id: string; itemProfileId: string }
  const searchParams = useSearchParams()
  const router = useRouter()
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);
  const [itemProfile, setItemProfile] = useState<ItemProfile | null>(null)
  const [game, setGame] = useState<any>(null)
  const [inventoryProfile, setInventoryProfile] = useState<ItemProfile | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newCustomDataForms, setNewCustomDataForms] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("details")
  const [hideDisabledTabs, setHideDisabledTabs] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem('item-profile-hide-disabled-tabs')
        return savedState !== null ? JSON.parse(savedState) : false
      } catch (error) {
        console.error('Error loading initial hide disabled tabs state:', error)
        return false
      }
    }
    return false
  })

  // Single function to update the entire item profile with fresh data from API
  const updateItemProfileData = (updatedData: ItemProfile) => {
    setItemProfile(updatedData)
    
    // If inventory_profile_id changed, fetch new inventory profile info
    if (updatedData.inventory_profile_id !== itemProfile?.inventory_profile_id) {
      loadInventoryProfile(updatedData.inventory_profile_id)
    }
  }

  // Function to load inventory profile information
  const loadInventoryProfile = async (inventoryProfileId?: string) => {
    if (!inventoryProfileId) {
      setInventoryProfile(null)
      setInventoryError(false)
      return
    }

    try {
      setInventoryLoading(true)
      setInventoryError(false)
      const inventoryData = await fetchItemProfile(inventoryProfileId)
      setInventoryProfile(inventoryData)
    } catch (err: any) {
      console.error('Failed to load inventory profile:', err)
      setInventoryProfile(null)
      setInventoryError(true)
    } finally {
      setInventoryLoading(false)
    }
  }

  const addNewCustomDataForm = () => {
    const newFormId = Date.now().toString()
    setNewCustomDataForms(prev => [...prev, newFormId])
  }

  const removeNewCustomDataForm = (formId: string) => {
    setNewCustomDataForms(prev => prev.filter(id => id !== formId))
  }



  // Save hide disabled tabs state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('item-profile-hide-disabled-tabs', JSON.stringify(hideDisabledTabs))
      } catch (error) {
        console.error('Error saving hide disabled tabs state:', error)
      }
    }
  }, [hideDisabledTabs])

  useEffect(() => {
    async function loadItemProfileAndGame() {
      try {
        setLoading(true)
        const [profileData, gameData] = await Promise.all([
          fetchItemProfile(params.itemProfileId),
          getGame(params.id)
        ])
        setItemProfile(profileData)
        setGame(gameData)
        
        // Load inventory profile if exists
        if (profileData.inventory_profile_id) {
          await loadInventoryProfile(profileData.inventory_profile_id)
        }
        
        setError(null)
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    loadItemProfileAndGame()
  }, [params.itemProfileId, params.id])

  // Auto switch to details tab if current tab is inventory but item type is not inventory, or lootbox but item type is not loot_box_fixed
  useEffect(() => {
    if (itemProfile && activeTab === "inventory" && itemProfile.type !== 'inventory') {
      setActiveTab("details")
    }
    if (itemProfile && activeTab === "lootbox" && itemProfile.type !== 'loot_box_fixed') {
      setActiveTab("details")
    }
  }, [itemProfile, activeTab])

  // Handle URL tab parameter
  useEffect(() => {
    if (itemProfile) {
      const requestedTab = parseTabFromUrl(searchParams)
      
      if (requestedTab === 'inventory' && itemProfile.type === 'inventory') {
        setActiveTab('inventory')
      } else if (requestedTab === 'lootbox' && itemProfile.type === 'loot_box_fixed') {
        setActiveTab('lootbox')
      } else if (requestedTab === 'properties') {
        setActiveTab('properties')
      } else if ((requestedTab === 'inventory' && itemProfile.type !== 'inventory') || 
                 (requestedTab === 'lootbox' && itemProfile.type !== 'loot_box_fixed')) {
        // If trying to access invalid tab for item type, redirect to details
        const detailsUrl = getItemProfileUrl(params.id, params.itemProfileId, 'details')
        router.replace(detailsUrl, { scroll: false })
        setActiveTab('details')
      } else {
        // Default to details tab
        setActiveTab('details')
      }
    }
  }, [searchParams, itemProfile, params.id, params.itemProfileId, router])

  // Function to change tab and update URL
  const changeTab = (newTab: ItemProfileTab) => {
    setActiveTab(newTab)
    
    // Update URL using utility function
    const newUrl = getItemProfileUrl(params.id, params.itemProfileId, newTab)
    router.replace(newUrl, { scroll: false })
    
    // Optional: Log for debugging
    // console.log(`Tab changed to: ${newTab}, URL updated to: ${newUrl}`)
  }

  if (loading) return <div className="container mx-auto py-6">{t('common.loading')}</div>
  if (error) return (
    <div className="container mx-auto py-6">
      <Card className="border-destructive mb-4">
        <CardHeader>
          <CardTitle>{t('common.error')}</CardTitle>
          <CardDescription>{t('itemProfile.loadError')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    </div>
  )

  if (!itemProfile) return null

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href={`/studios/${game?.studio?.id}`}>{game?.studio?.name || t('common.studio')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${params.id}`}>{game?.name || t('common.game')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${params.id}/item-profiles`}>{t('itemProfile.title')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-muted-foreground">{itemProfile?.name || t('itemProfile.viewDetails')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mb-6">
        <ItemProfileNameEditable
          itemProfile={itemProfile}
          itemProfileId={params.itemProfileId}
          onItemProfileUpdate={updateItemProfileData}
        />
      </div>

      <div className="bg-background border rounded-lg">
        <div className="border-b">
          <div className="flex justify-between items-center px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => changeTab("details")}
                className={`${
                  activeTab === "details"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                {t('itemProfile.details')}
              </button>
              <button
                onClick={() => changeTab("properties")}
                className={`${
                  activeTab === "properties"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                {t('properties.title')}
              </button>
              {(!hideDisabledTabs || itemProfile.type === 'inventory') && (
                <button
                  onClick={() => {
                    if (itemProfile.type === 'inventory') {
                      changeTab("inventory")
                    }
                  }}
                  disabled={itemProfile.type !== 'inventory'}
                  className={`${
                    itemProfile.type !== 'inventory'
                      ? "border-transparent text-gray-300 cursor-not-allowed line-through"
                      : activeTab === "inventory"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  {t('inventory.title')}
                </button>
              )}
              {(!hideDisabledTabs || itemProfile.type === 'loot_box_fixed') && (
                <button
                  onClick={() => {
                    if (itemProfile.type === 'loot_box_fixed') {
                      changeTab("lootbox")
                    }
                  }}
                  disabled={itemProfile.type !== 'loot_box_fixed'}
                  className={`${
                    itemProfile.type !== 'loot_box_fixed'
                      ? "border-transparent text-gray-300 cursor-not-allowed line-through"
                      : activeTab === "lootbox"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  {t('lootbox.title')}
                </button>
              )}
            </nav>
            {/* Toggle button to hide/show disabled tabs */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setHideDisabledTabs(!hideDisabledTabs)}
                    className="py-2 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 border border-gray-200 rounded-md flex items-center justify-center"
                  >
                    {hideDisabledTabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hideDisabledTabs ? t('common.hiddenDisabledTabs') : t('common.showingDisabledTabs')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "details" && (
            <div className="space-y-6 group">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Normal Properties */}
                <div className="space-y-4">
                  <div className="mb-2">{t('itemProfile.profileId')}: <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{itemProfile.id}</code></div>

                  <div>
                    <ItemProfileCodeNameEditable
                      itemProfile={itemProfile}
                      itemProfileId={params.itemProfileId}
                      onItemProfileUpdate={updateItemProfileData}
                    />
                  </div>

                  <div>
                    <ItemProfileTypeEditable
                      itemProfile={itemProfile}
                      itemProfileId={params.itemProfileId}
                      onItemProfileUpdate={updateItemProfileData}
                    />
                  </div>

                  <div>
                    <ItemProfileStatusEditable
                      itemProfile={itemProfile}
                      itemProfileId={params.itemProfileId}
                      onItemProfileUpdate={updateItemProfileData}
                    />
                  </div>

                  <div>
                    <ItemProfileLevelEditable
                      itemProfile={itemProfile}
                      itemProfileId={params.itemProfileId}
                      onItemProfileUpdate={updateItemProfileData}
                    />
                  </div>

                  <div>
                    <ItemProfileStackableEditable
                      itemProfile={itemProfile}
                      itemProfileId={params.itemProfileId}
                      onItemProfileUpdate={updateItemProfileData}
                    />
                  </div>

                  <div>
                    <ItemProfileStackLimitEditable
                      itemProfile={itemProfile}
                      itemProfileId={params.itemProfileId}
                      onItemProfileUpdate={updateItemProfileData}
                    />
                  </div>

                  <div>
                    <ItemProfileCreateOnRegistryEditable
                      itemProfile={itemProfile}
                      itemProfileId={params.itemProfileId}
                      onItemProfileUpdate={updateItemProfileData}
                    />
                  </div>

                  <div>
                    <ItemProfileAmountOnRegistryEditable
                      itemProfile={itemProfile}
                      itemProfileId={params.itemProfileId}
                      onItemProfileUpdate={updateItemProfileData}
                    />
                  </div>

                  <div>{t('common.game')}: {game?.id && game?.name ? (
                    <Link href={`/games/${game.id}`} className="inline-flex items-center gap-1 hover:text-primary font-semibold">
                      {game.name}
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  ) : (
                    <span className="font-semibold">{game?.name}</span>
                  )}</div>

                  {/* Inventory Profile Link */}
                  {itemProfile.inventory_profile_id && (
                    <div>{t('itemProfile.belongsToInventory')}: 
                      <Link 
                        href={getInventoryTabUrl(params.id, itemProfile.inventory_profile_id)} 
                        className="inline-flex items-center gap-1 hover:text-primary font-semibold ml-1"
                        title={inventoryProfile ? `${inventoryProfile.name} (${inventoryProfile.code_name})` : undefined}
                      >
                        {inventoryLoading ? (
                          <span className="text-muted-foreground">{t('common.loading')}</span>
                        ) : inventoryProfile ? (
                          inventoryProfile.name
                        ) : inventoryError ? (
                          <span className="text-muted-foreground text-sm" title={t('inventory.inventoryNotLoaded')}>
                            {t('inventory.title')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono text-sm">
                            {itemProfile.inventory_profile_id}
                          </span>
                        )}
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </div>
                  )}

                  <div>{t('itemProfile.createdAt')}: {formatTimestamp(itemProfile.created_at)}</div>
                  <div>{t('itemProfile.updatedAt')}: {formatTimestamp(itemProfile.updated_at)}</div>
                </div>

                {/* Right Column - Custom Data */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{t('itemProfile.customData')}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {itemProfile.custom_data && Object.keys(itemProfile.custom_data).length > 0 ? (
                      Object.entries(itemProfile.custom_data).map(([key, value]) => (
                        <ItemProfileCustomDataEditable
                          key={key}
                          itemProfile={itemProfile}
                          itemProfileId={params.itemProfileId}
                          onItemProfileUpdate={updateItemProfileData}
                          customKey={key}
                          customValue={value}
                        />
                      ))
                    ) : newCustomDataForms.length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t('itemProfile.noCustomData')}</p>
                    ) : null}
                    
                    {newCustomDataForms.length < 5 && (
                      <button 
                        className="text-sm text-primary hover:text-primary/80 transition-colors font-medium disabled:text-muted-foreground disabled:cursor-not-allowed"
                        onClick={addNewCustomDataForm}
                      >
                        + {t('itemProfile.newCustomData')}
                      </button>
                    )}
                    
                    {newCustomDataForms.map(formId => (
                      <ItemProfileNewCustomDataForm
                        key={formId}
                        formId={formId}
                        itemProfile={itemProfile}
                        itemProfileId={params.itemProfileId}
                        onItemProfileUpdate={updateItemProfileData}
                        onRemove={() => removeNewCustomDataForm(formId)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <InventoryTab 
              itemProfile={itemProfile} 
              gameId={params.id}
            />
          )}

          {activeTab === "lootbox" && (
            <FixedLootBoxTab 
              itemProfile={itemProfile} 
              gameId={params.id}
            />
          )}

          {activeTab === "properties" && (
            <PropertiesTab 
              itemProfileId={params.itemProfileId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ItemProfileNameEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(itemProfile.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setName(itemProfile.name)
  }, [itemProfile.name])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { name })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-48 h-8 px-2 text-lg font-bold"
            disabled={loading}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setName(itemProfile.name) }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-2xl font-bold">{itemProfile.name}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileCodeNameEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [codeName, setCodeName] = useState(itemProfile.code_name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setCodeName(itemProfile.code_name)
  }, [itemProfile.code_name])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { code_name: codeName })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <Input
            value={codeName}
            onChange={e => setCodeName(e.target.value)}
            className="w-48 h-8 px-2 text-base font-mono"
            disabled={loading}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setCodeName(itemProfile.code_name) }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span>{t('itemProfile.code')}: <code className="font-mono">{itemProfile.code_name}</code></span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileTypeEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(itemProfile.type)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setType(itemProfile.type)
  }, [itemProfile.type])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { type })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <Select value={type} onValueChange={setType} disabled={loading}>
            <SelectTrigger className="w-48 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {itemTypeOptions.map((itemType) => (
                <SelectItem key={itemType.value} value={itemType.value}>
                  {itemType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setType(itemProfile.type) }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span>{t('itemProfile.type')}: <span className="font-semibold">{itemProfile.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-'}</span></span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileStatusEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState(itemProfile.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setStatus(itemProfile.status)
  }, [itemProfile.status])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfileStatus(itemProfileId, status)
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
      // Reset status value on error
      setStatus(itemProfile.status)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setStatus(itemProfile.status)
    setError(null)
  }

  const editableStatusOptions = getEditableStatusOptions()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Select value={status} onValueChange={setStatus} disabled={loading}>
              <SelectTrigger className="w-48 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {editableStatusOptions.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {statusOption.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{t('itemProfile.status')}:</span>
            <span
              className="font-semibold"
              style={{
                color: (() => {
                  const config = getItemProfileStatusConfig(itemProfile.status);
                  switch (config.textColor) {
                    case 'text-green-600': return '#16a34a';
                    case 'text-yellow-600': return '#ca8a04';
                    case 'text-red-600': return '#dc2626';
                    default: return 'inherit';
                  }
                })()
              }}
              title={`Status: ${itemProfile.status}, Color: ${getItemProfileStatusConfig(itemProfile.status).textColor}`}
            >
              {itemProfile.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileLevelEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [levelStart, setLevelStart] = useState(itemProfile.level_start)
  const [levelMax, setLevelMax] = useState(itemProfile.level_max)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setLevelStart(itemProfile.level_start)
    setLevelMax(itemProfile.level_max)
  }, [itemProfile.level_start, itemProfile.level_max])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { level_start: levelStart, level_max: levelMax })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={levelStart}
                onChange={e => setLevelStart(Number(e.target.value))}
                className="w-20 h-8 px-2 text-sm"
                placeholder="Min"
                disabled={loading}
              />
              <span>-</span>
              <Input
                type="number"
                value={levelMax}
                onChange={e => setLevelMax(Number(e.target.value))}
                className="w-20 h-8 px-2 text-sm"
                placeholder="Max"
                disabled={loading}
              />
            </div>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setLevelStart(itemProfile.level_start); setLevelMax(itemProfile.level_max) }} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{t('itemProfile.level')}: <span className="font-semibold">{itemProfile.level_start} - {itemProfile.level_max}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileStackLimitEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [stackLimit, setStackLimit] = useState(itemProfile.stack_limit)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setStackLimit(itemProfile.stack_limit)
  }, [itemProfile.stack_limit])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { stack_limit: stackLimit })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              type="number"
              value={stackLimit}
              onChange={e => setStackLimit(Number(e.target.value))}
              className="w-24 h-8 px-2 text-sm"
              disabled={loading}
            />
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setStackLimit(itemProfile.stack_limit) }} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{t('itemProfile.stackLimit')}: <span className="font-semibold">{itemProfile.stack_limit}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileStackableEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [stackable, setStackable] = useState(Boolean(itemProfile.stackable))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setStackable(Boolean(itemProfile.stackable))
  }, [itemProfile.stackable])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { stackable: stackable ? 1 : 0 })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Checkbox
              checked={stackable}
              onCheckedChange={(checked) => setStackable(checked === true)}
              disabled={loading}
            />
            <span>{t('itemProfile.stackable')}</span>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setStackable(Boolean(itemProfile.stackable)) }} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{t('itemProfile.stackable')}: <span className="font-semibold">{itemProfile.stackable ? t('common.yes') : t('common.no')}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileCreateOnRegistryEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [createOnRegistry, setCreateOnRegistry] = useState(Boolean(itemProfile.create_on_registry))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setCreateOnRegistry(Boolean(itemProfile.create_on_registry))
  }, [itemProfile.create_on_registry])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { create_on_registry: createOnRegistry ? 1 : 0 })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Checkbox
              checked={createOnRegistry}
              onCheckedChange={(checked) => setCreateOnRegistry(checked === true)}
              disabled={loading}
            />
            <span>{t('itemProfile.createOnRegistry')}</span>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setCreateOnRegistry(Boolean(itemProfile.create_on_registry)) }} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{t('itemProfile.createOnRegistry')}: <span className="font-semibold">{itemProfile.create_on_registry ? t('common.yes') : t('common.no')}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileAmountOnRegistryEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [amountOnRegistry, setAmountOnRegistry] = useState(itemProfile.amount_on_registry || 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setAmountOnRegistry(itemProfile.amount_on_registry || 0)
  }, [itemProfile.amount_on_registry])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { amount_on_registry: amountOnRegistry })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              type="number"
              value={amountOnRegistry}
              onChange={e => setAmountOnRegistry(Number(e.target.value))}
              className="w-24 h-8 px-2 text-sm"
              disabled={loading}
            />
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setAmountOnRegistry(itemProfile.amount_on_registry || 0) }} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{t('itemProfile.amountOnRegistry')}: <span className="font-semibold">{itemProfile.amount_on_registry || 0}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileCustomDataEditable({ itemProfile, itemProfileId, onItemProfileUpdate, customKey, customValue }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void, customKey: string, customValue: any }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [key, setKey] = useState(customKey)
  const [value, setValue] = useState(String(customValue))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setKey(customKey)
    setValue(String(customValue))
  }, [customKey, customValue])

  const handleSave = async () => {
    if (!key.trim()) {
      setError({ message: "Key name cannot be empty", hints: [] })
      return
    }

    // Check if new key already exists (and it's different from current key)
    if (key !== customKey && itemProfile.custom_data && itemProfile.custom_data[key] !== undefined) {
      setError({ message: `Key "${key}" already exists`, hints: [] })
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Create new custom_data object
      const updatedCustomData = { ...itemProfile.custom_data }

      // If key changed, remove old key
      if (key !== customKey) {
        delete updatedCustomData[customKey]
      }

      // Convert value to number if possible, otherwise keep as string
      let processedValue: any = value.trim()

      // Check if the value is a valid number
      if (processedValue !== '' && !isNaN(Number(processedValue))) {
        const numValue = Number(processedValue)
        // Use number if it's a finite number (not Infinity or -Infinity)
        if (isFinite(numValue)) {
          processedValue = numValue
        }
      }

      // Set new/updated key with processed value
      updatedCustomData[key] = processedValue

      const updatedData = await updateItemProfileCustomData(itemProfileId, updatedCustomData)
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      // Create new custom_data object without the deleted key
      const updatedCustomData = { ...itemProfile.custom_data }
      delete updatedCustomData[customKey]

      const updatedData = await updateItemProfileCustomData(itemProfileId, updatedCustomData)
      onItemProfileUpdate(updatedData)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.deleteCustomDataError'), hints: [] })
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setKey(customKey)
    setValue(String(customValue))
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <div className="flex items-center gap-2">
              <Input
                value={key}
                onChange={e => setKey(e.target.value)}
                className="w-32 h-8 px-2 text-sm font-medium"
                disabled={loading}
                placeholder={t('itemProfile.propertyName')}
              />
              <span>:</span>
              <Input
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-48 h-8 px-2 text-sm"
                disabled={loading}
                placeholder={t('itemProfile.propertyValue')}
              />
            </div>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading || !key.trim()}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{customKey}: <span className="font-semibold">{String(customValue)}</span></span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" disabled={deleting}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('itemProfile.confirmDeleteCustomData')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('itemProfile.confirmDeleteCustomDataText')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleting}
                    >
                      {deleting ? t('itemProfile.deletingCustomData') : t('common.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </div>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ItemProfileNewCustomDataForm({ formId, itemProfile, itemProfileId, onItemProfileUpdate, onRemove }: { formId: string, itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void, onRemove: () => void }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; hints: string[] } | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  const handleSave = async () => {
    if (!key.trim()) {
      setError({ message: "Key name cannot be empty", hints: [] })
      return
    }

    // Check if key already exists
    if (itemProfile.custom_data && itemProfile.custom_data[key] !== undefined) {
      setError({ message: `Key "${key}" already exists`, hints: [] })
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Create new custom_data object
      const updatedCustomData = { ...itemProfile.custom_data }

      // Convert value to number if possible, otherwise keep as string
      let processedValue: any = value.trim()

      // Check if the value is a valid number
      if (processedValue !== '' && !isNaN(Number(processedValue))) {
        const numValue = Number(processedValue)
        // Use number if it's a finite number (not Infinity or -Infinity)
        if (isFinite(numValue)) {
          processedValue = numValue
        }
      }

      // Set new key with processed value
      updatedCustomData[key] = processedValue

      const updatedData = await updateItemProfileCustomData(itemProfileId, updatedCustomData)
      onItemProfileUpdate(updatedData)

      // Remove this form after successful save
      onRemove()
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] })
      } else {
        setError({ message: e?.message || t('itemProfile.updateError'), hints: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onRemove()
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder={t('itemProfile.propertyName')}
          value={key}
          onChange={e => setKey(e.target.value)}
          disabled={loading}
        />
        <Input
          placeholder={t('itemProfile.propertyValue')}
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={loading || !key.trim()}>
          {loading ? t('common.loading') : t('itemProfile.done')}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
          {t('common.cancel')}
        </Button>
      </div>

      {error && (
        <div className="text-red-500 text-xs mt-1">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
} 