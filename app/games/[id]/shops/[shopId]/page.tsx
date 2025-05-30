"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Pencil, Save, X, Trash2, Plus } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { fetchShop, updateShopItemPrice, updateShop, addItemToShop, removeItemFromShop } from "@/lib/shop-api"
import { fetchGameItemProfiles } from "@/lib/item-profile-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem
} from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function ShopDetailPage() {
  const params = useParams() as { id: string; shopId: string }
  const router = useRouter()
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);
  const [shop, setShop] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false)
  const [currencyOptions, setCurrencyOptions] = useState<any[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>(undefined)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("");
  const [showCurrencyOnly, setShowCurrencyOnly] = useState(true)
  const [editingCurrencyItemId, setEditingCurrencyItemId] = useState<string | null>(null);
  const [itemCurrencyLoading, setItemCurrencyLoading] = useState(false);
  const [itemCurrencyError, setItemCurrencyError] = useState<string | null>(null);
  const [selectedItemCurrency, setSelectedItemCurrency] = useState<string | undefined>(undefined);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [itemShowCurrencyOnly, setItemShowCurrencyOnly] = useState(true);
  
  // Add item modal states
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [availableItemProfiles, setAvailableItemProfiles] = useState<any[]>([]);
  const [selectedItemProfile, setSelectedItemProfile] = useState<string>("");
  const [addItemSearchTerm, setAddItemSearchTerm] = useState("");
  const [currentPrice, setCurrentPrice] = useState<string>("");
  const [oldPrice, setOldPrice] = useState<string>("");
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);

  // Remove item modal states
  const [removeItemModalOpen, setRemoveItemModalOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<any>(null);
  const [removeItemLoading, setRemoveItemLoading] = useState(false);
  const [removeItemError, setRemoveItemError] = useState<string | null>(null);

  useEffect(() => {
    async function loadShop() {
      try {
        setLoading(true)
        const shopData = await fetchShop(params.shopId)
        setShop(shopData)
        setError(null)
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    loadShop()
  }, [params.shopId])

  // Fetch currency options when modal opens
  const fetchCurrencyOptions = async () => {
    setCurrencyLoading(true)
    setCurrencyError(null)
    try {
      const token = localStorage.getItem("token")
      const API_URL = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${API_URL}/api/games/${params.id}/item-profiles`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })
      if (!res.ok) throw new Error("Failed to fetch currencies")
      const data = await res.json()
      setCurrencyOptions(data.data || [])
    } catch (e: any) {
      setCurrencyError(e.message || "Failed to fetch currencies")
    } finally {
      setCurrencyLoading(false)
    }
  }

  const openCurrencyModal = () => {
    if (currencyOptions.length === 0) {
      setSelectedCurrency("no-items")
    } else {
      setSelectedCurrency(shop.currency?.id)
    }
    setCurrencyModalOpen(true)
    fetchCurrencyOptions()
  }

  const handleCurrencySave = async () => {
    if (!selectedCurrency || selectedCurrency === "no-items") return
    setCurrencyLoading(true)
    setCurrencyError(null)
    try {
      await updateShop(params.shopId, { currency_id: selectedCurrency })
      // Refresh shop data
      const shopData = await fetchShop(params.shopId)
      setShop(shopData)
      setCurrencyModalOpen(false)
    } catch (e: any) {
      setCurrencyError(e.message || "Failed to update currency")
    } finally {
      setCurrencyLoading(false)
    }
  }

  const filteredOptions = currencyOptions.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!showCurrencyOnly || item.type === "currencies")
  );

  // Fetch currency options when modal opens (cho từng item)
  useEffect(() => {
    if (editingCurrencyItemId) {
      fetchCurrencyOptions();
    }
    // eslint-disable-next-line
  }, [editingCurrencyItemId]);

  // Fetch available item profiles for adding to shop
  const fetchAvailableItemProfiles = async () => {
    setAddItemLoading(true);
    setAddItemError(null);
    try {
      const profiles = await fetchGameItemProfiles(params.id);
      // Filter out items that are already in the shop
      const currentItemIds = shop.items_in_shop?.map((item: any) => item.item_profile?.id) || [];
      const availableProfiles = profiles.filter(profile => !currentItemIds.includes(profile.id));
      setAvailableItemProfiles(availableProfiles);
    } catch (e: any) {
      setAddItemError(e.message || "Failed to fetch item profiles");
    } finally {
      setAddItemLoading(false);
    }
  };

  const openAddItemModal = () => {
    setAddItemModalOpen(true);
    setSelectedItemProfile("");
    setCurrentPrice("");
    setOldPrice("");
    setAddItemSearchTerm("");
    setAddItemError(null);
    fetchAvailableItemProfiles();
  };

  const handleAddItem = async () => {
    if (!selectedItemProfile || !currentPrice) return;
    
    setAddItemLoading(true);
    setAddItemError(null);
    try {
      await addItemToShop(params.shopId, selectedItemProfile, {
        price_current: Number(currentPrice),
        price_old: oldPrice ? Number(oldPrice) : undefined,
        currency_id: null
      });
      
      // Refresh shop data
      const shopData = await fetchShop(params.shopId);
      setShop(shopData);
      setAddItemModalOpen(false);
      
      // Reset form
      setSelectedItemProfile("");
      setCurrentPrice("");
      setOldPrice("");
      setAddItemSearchTerm("");
    } catch (e: any) {
      setAddItemError(e.message || "Failed to add item to shop");
    } finally {
      setAddItemLoading(false);
    }
  };

  const openRemoveItemModal = (item: any) => {
    setItemToRemove(item);
    setRemoveItemModalOpen(true);
    setRemoveItemError(null);
  };

  const handleRemoveItem = async () => {
    if (!itemToRemove) return;
    
    setRemoveItemLoading(true);
    setRemoveItemError(null);
    try {
      await removeItemFromShop(params.shopId, itemToRemove.item_profile.id);
      
      // Refresh shop data
      const shopData = await fetchShop(params.shopId);
      setShop(shopData);
      setRemoveItemModalOpen(false);
      setItemToRemove(null);
    } catch (e: any) {
      setRemoveItemError(e.message || "Failed to remove item from shop");
    } finally {
      setRemoveItemLoading(false);
    }
  };

  if (loading) return <div className="container mx-auto py-6">{t('common.loading')}</div>
  if (error) return (
    <div className="container mx-auto py-6">
      <Card className="border-destructive mb-4">
        <CardHeader>
          <CardTitle>{t('common.error')}</CardTitle>
          <CardDescription>{t('shop.loadError')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href={`/studios/${shop?.game?.studio?.id}`}>{shop?.game?.studio?.name || t('common.studio')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${params.id}`}>{shop?.game?.name || t('common.game')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${params.id}/shops`}>{t('breadcrumb.shops')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-muted-foreground">{shop?.name || t('shop.title')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <ShopNameEditable
            shop={shop}
            shopId={params.shopId}
            onNameUpdate={newName => setShop((prev: any) => ({ ...prev, name: newName }))}
          />
          <ShopCodeNameEditable
            shop={shop}
            shopId={params.shopId}
            onCodeNameUpdate={newCodeName => setShop((prev: any) => ({ ...prev, code_name: newCodeName }))}
          />
          <ShopDescriptionEditable
            shop={shop}
            shopId={params.shopId}
            onDescriptionUpdate={newDescription => setShop((prev: any) => ({ ...prev, description: newDescription }))}
          />
        </CardHeader>
        <CardContent>
          <div className="mb-2">
            {t('shop.game')}: {shop.game?.id && shop.game?.name ? (
              <Link href={`/games/${shop.game.id}`} className="inline-flex items-center gap-1 hover:text-primary font-semibold">
                {shop.game.name}
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
            ) : (
              <span className="font-semibold">{shop.game?.name}</span>
            )}
          </div>
          <div className="mb-2 flex items-center gap-2">
            {t('shop.currency')}: <span className="font-semibold">
              {shop.currency ? (
                <Link href={`/games/${params.id}/item-profiles/${shop.currency.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                  {shop.currency.name}
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </Link>
              ) : (
                <span className="text-muted-foreground">{t('shop.noCurrencySet')}</span>
              )}
            </span>
            <Button size="icon" variant="ghost" onClick={openCurrencyModal}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-2">{t('shop.createdAt')}: {formatTimestamp(shop.created_at)}</div>
          <div className="mb-2">{t('shop.updatedAt')}: {formatTimestamp(shop.updated_at)}</div>

        </CardContent>
      </Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{t('shop.itemsInShop')}</h2>
        <Button onClick={openAddItemModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('shop.addItem')}
        </Button>
      </div>
      {shop.items_in_shop?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('common.noItemsFound')}</CardTitle>
            <CardDescription>{t('shop.noShopsDesc')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {shop.items_in_shop?.map((item: any) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>
                      <Link href={`/games/${params.id}/item-profiles/${item.item_profile?.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                        {item.item_profile?.name}
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </CardTitle>
                    <CardDescription>{t('shop.type')}: {item.item_profile?.type}</CardDescription>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => openRemoveItemModal(item)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center gap-2">
                  <span>{t('shop.currency')}:</span>
                  {item.currency && item.currency.name ? (
                    <span className="font-semibold">{item.currency.name}</span>
                  ) : (
                    <span className="text-muted-foreground">{t('shop.noCurrencySet')}</span>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => {
                    setEditingCurrencyItemId(item.id);
                    setSelectedItemCurrency(item.currency_id || shop.currency_id || '');
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    setItemCurrencyLoading(true);
                    setItemCurrencyError(null);
                    try {
                      await updateShopItemPrice(params.shopId, item.item_profile.id, {
                        price_current: item.price_current,
                        price_old: item.price_old,
                        currency_id: null,
                      });
                      setShop((prev: any) => ({
                        ...prev,
                        items_in_shop: prev.items_in_shop.map((it: any) =>
                          it.id === item.id ? { ...it, currency_id: null, currency: null } : it
                        ),
                      }));
                    } catch (e: any) {
                      setItemCurrencyError(e.message || t('shop.loadError'));
                    } finally {
                      setItemCurrencyLoading(false);
                    }
                  }} disabled={itemCurrencyLoading || !item.currency_id}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <EditablePrice
                  item={item}
                  shopId={params.shopId}
                  onPriceUpdate={(newCurrent, newOld) => {
                    setShop((prev: any) => ({
                      ...prev,
                      items_in_shop: prev.items_in_shop.map((it: any) =>
                        it.id === item.id ? { ...it, price_current: newCurrent, price_old: newOld } : it
                      ),
                    }))
                  }}
                />
                {item.item_profile?.custom_data && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 mt-2 font-semibold hover:underline">
                      {t('shop.customData')}
                      <ChevronDown className="w-4 h-4 transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4 mt-2">
                      {Object.entries(item.item_profile.custom_data).map(([key, value]) => (
                        <div key={key} className="text-sm">{key}: {String(value)}</div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
                <Dialog open={editingCurrencyItemId === item.id} onOpenChange={(open) => {
                  if (!open) setEditingCurrencyItemId(null);
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('shop.selectItemCurrency')}</DialogTitle>
                    </DialogHeader>
                    {itemCurrencyError && <div className="text-red-500 text-xs mb-2">{itemCurrencyError}</div>}
                    <div className="mb-2">
                      <Command>
                        <CommandInput
                          placeholder={t('common.search')}
                          value={itemSearchTerm}
                          onValueChange={setItemSearchTerm}
                          disabled={itemCurrencyLoading}
                        />
                        <CommandList>
                          <CommandEmpty>{t('common.noItemsFound')}</CommandEmpty>
                          {currencyOptions
                            .filter(cur =>
                              cur.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) &&
                              (!itemShowCurrencyOnly || cur.type === "currencies")
                            )
                            .map((cur) => (
                              <CommandItem
                                key={cur.id}
                                value={cur.name}
                                onSelect={() => setSelectedItemCurrency(cur.id)}
                                className={selectedItemCurrency === cur.id ? "bg-accent text-accent-foreground" : ""}
                              >
                                <div className="flex w-full justify-between items-center">
                                  <span>{cur.name}</span>
                                  <span className="text-xs text-muted-foreground">{cur.type}</span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandList>
                      </Command>
                    </div>
                    <div className="flex items-center justify-between mt-4 gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox id="show-currency-only-item" checked={itemShowCurrencyOnly} onCheckedChange={checked => setItemShowCurrencyOnly(checked === true)} />
                        <label htmlFor="show-currency-only-item" className="text-sm select-none cursor-pointer">{t('shop.showCurrencyOnly')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setEditingCurrencyItemId(null)} disabled={itemCurrencyLoading}>{t('common.cancel')}</Button>
                        <Button
                          onClick={async () => {
                            if (!selectedItemCurrency) return;
                            setItemCurrencyLoading(true);
                            setItemCurrencyError(null);
                            try {
                              await updateShopItemPrice(params.shopId, item.item_profile.id, {
                                price_current: item.price_current,
                                price_old: item.price_old,
                                currency_id: selectedItemCurrency,
                              });
                              const newCurrencyObj = currencyOptions.find((cur) => cur.id === selectedItemCurrency) || { id: selectedItemCurrency, name: selectedItemCurrency };
                              setShop((prev: any) => ({
                                ...prev,
                                items_in_shop: prev.items_in_shop.map((it: any) =>
                                  it.id === item.id ? { ...it, currency_id: selectedItemCurrency, currency: newCurrencyObj } : it
                                ),
                              }));
                              setEditingCurrencyItemId(null);
                            } catch (e: any) {
                              setItemCurrencyError(e.message || t('shop.loadError'));
                            } finally {
                              setItemCurrencyLoading(false);
                            }
                          }}
                          disabled={itemCurrencyLoading || !selectedItemCurrency}
                        >
                          {itemCurrencyLoading ? t('shop.saving') : t('common.save')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={currencyModalOpen} onOpenChange={setCurrencyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('shop.selectShopCurrency')}</DialogTitle>
          </DialogHeader>
          {currencyError && <div className="text-red-500 text-xs mb-2">{currencyError}</div>}
          <div className="mb-2">
            <Command>
              <CommandInput placeholder={t('common.search')} disabled={currencyLoading} />
              <CommandList>
                <CommandEmpty>{t('common.noItemsFound')}</CommandEmpty>
                {filteredOptions.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.name}
                    onSelect={() => setSelectedCurrency(item.id)}
                    className={selectedCurrency === item.id ? "bg-accent text-accent-foreground" : ""}
                  >
                    <div className="flex w-full justify-between items-center">
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.type}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </div>
          <div className="flex items-center justify-between mt-4 gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="show-currency-only" checked={showCurrencyOnly} onCheckedChange={checked => setShowCurrencyOnly(checked === true)} />
              <label htmlFor="show-currency-only" className="text-sm select-none cursor-pointer">{t('shop.showCurrencyOnly')}</label>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCurrencyModalOpen(false)} disabled={currencyLoading}>{t('common.cancel')}</Button>
              <Button onClick={handleCurrencySave} disabled={!selectedCurrency || selectedCurrency === "no-items" || currencyLoading}>
                {currencyLoading ? t('shop.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Item Modal */}
      <Dialog open={addItemModalOpen} onOpenChange={setAddItemModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shop.addItemToShop')}</DialogTitle>
          </DialogHeader>
          
          {addItemError && <div className="text-red-500 text-sm mb-2">{addItemError}</div>}
          
          <div className="space-y-4">
            {/* Item Profile Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('shop.selectItemProfile')}</label>
              <Command>
                <CommandInput
                  placeholder={t('shop.searchItemProfiles')}
                  value={addItemSearchTerm}
                  onValueChange={setAddItemSearchTerm}
                  disabled={addItemLoading}
                />
                <CommandList>
                  <CommandEmpty>{t('common.noItemsFound')}</CommandEmpty>
                  {availableItemProfiles
                    .filter(profile =>
                      profile.name.toLowerCase().includes(addItemSearchTerm.toLowerCase()) ||
                      profile.code_name.toLowerCase().includes(addItemSearchTerm.toLowerCase())
                    )
                    .map((profile) => (
                      <CommandItem
                        key={profile.id}
                        value={profile.name}
                        onSelect={() => setSelectedItemProfile(profile.id)}
                        className={selectedItemProfile === profile.id ? "bg-accent text-accent-foreground" : ""}
                      >
                        <div className="flex w-full justify-between items-center">
                          <span>{profile.name}</span>
                          <span className="text-xs text-muted-foreground">{profile.type}</span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandList>
              </Command>
            </div>
            
            {/* Price Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('shop.priceSettings')}</h4>
              <div>
                <label className="text-sm text-muted-foreground">{t('shop.currentPrice')} *</label>
                <Input
                  type="number"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder={t('shop.enterCurrentPrice')}
                  disabled={addItemLoading}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{t('shop.oldPrice')}</label>
                <Input
                  type="number"
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  placeholder={t('shop.enterOldPrice')}
                  disabled={addItemLoading}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddItemModalOpen(false)} disabled={addItemLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={addItemLoading || !selectedItemProfile || !currentPrice}
            >
              {addItemLoading ? t('shop.addingItem') : t('shop.addItem')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Remove Item Confirmation Modal */}
      <Dialog open={removeItemModalOpen} onOpenChange={setRemoveItemModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shop.removeItemConfirm')}</DialogTitle>
          </DialogHeader>
          
          {removeItemError && <div className="text-red-500 text-sm mb-2">{removeItemError}</div>}
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('shop.removeItemConfirmText')}
            </p>
            
            {itemToRemove && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <p className="font-medium">{itemToRemove.item_profile?.name}</p>
                <p className="text-sm text-muted-foreground">{t('shop.type')}: {itemToRemove.item_profile?.type}</p>
                <p className="text-sm text-muted-foreground">{t('shop.currentPrice')}: {itemToRemove.price_current}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setRemoveItemModalOpen(false)} 
              disabled={removeItemLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveItem}
              disabled={removeItemLoading}
            >
              {removeItemLoading ? t('shop.removingItem') : t('shop.removeItem')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditablePrice({ item, shopId, onPriceUpdate }: { item: any, shopId: string, onPriceUpdate: (newCurrent: number, newOld: number) => void }) {
  const [editing, setEditing] = useState<"current" | "old" | null>(null)
  const [current, setCurrent] = useState(item.price_current)
  const [old, setOld] = useState(item.price_old)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    if (editing === "current") setCurrent(item.price_current)
    if (editing === "old") setOld(item.price_old)
    // eslint-disable-next-line
  }, [editing])

  const handleSave = async (type: "current" | "old") => {
    setLoading(true)
    setError(null)
    try {
      const data = {
        price_current: type === "current" ? Number(current) : Number(item.price_current),
        price_old: type === "old" ? Number(old) : Number(item.price_old),
      }
      await updateShopItemPrice(shopId, item.item_profile.id, data)
      onPriceUpdate(data.price_current, data.price_old)
      setEditing(null)
    } catch (e: any) {
      setError(e.message || t('shop.loadError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 mb-2">
      <div className="flex items-center gap-2">
        <span>{t('shop.currentPrice')}:</span>
        {editing === "current" ? (
          <>
            <Input
              type="number"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              className="w-24 h-8 px-2 text-sm"
              disabled={loading}
            />
            <Button size="icon" variant="ghost" onClick={() => handleSave("current") } disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(null)} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{item.price_current}</span>
            <Button size="icon" variant="ghost" onClick={() => setEditing("current") }>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>{t('shop.oldPrice')}:</span>
        {editing === "old" ? (
          <>
            <Input
              type="number"
              value={old}
              onChange={e => setOld(e.target.value)}
              className="w-24 h-8 px-2 text-sm"
              disabled={loading}
            />
            <Button size="icon" variant="ghost" onClick={() => handleSave("old") } disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(null)} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>{item.price_old}</span>
            <Button size="icon" variant="ghost" onClick={() => setEditing("old") }>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ShopNameEditable({ shop, shopId, onNameUpdate }: { shop: any, shopId: string, onNameUpdate: (newName: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(shop.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setName(shop.name)
  }, [shop.name])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      await updateShop(shopId, { name })
      onNameUpdate(name)
      setEditing(false)
    } catch (e: any) {
      setError(e.message || t('shop.loadError'))
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
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setName(shop.name) }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-2xl font-bold">{shop.name}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ShopCodeNameEditable({ shop, shopId, onCodeNameUpdate }: { shop: any, shopId: string, onCodeNameUpdate: (newCodeName: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [codeName, setCodeName] = useState(shop.code_name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setCodeName(shop.code_name)
  }, [shop.code_name])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      await updateShop(shopId, { code_name: codeName })
      onCodeNameUpdate(codeName)
      setEditing(false)
    } catch (e: any) {
      setError(e.message || t('shop.loadError'))
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
            className="w-48 h-8 px-2 text-base"
            disabled={loading}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setCodeName(shop.code_name) }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span>{t('shop.code')}: {shop.code_name}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ShopDescriptionEditable({ shop, shopId, onDescriptionUpdate }: { shop: any, shopId: string, onDescriptionUpdate: (newDescription: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(shop.description || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setDescription(shop.description || "")
  }, [shop.description])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      await updateShop(shopId, { description } as any)
      onDescriptionUpdate(description)
      setEditing(false)
    } catch (e: any) {
      setError(e.message || t('shop.loadError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-2 flex items-center gap-2">
      {editing ? (
        <>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-96 h-8 px-2 text-base"
            disabled={loading}
            placeholder={t('shop.description')}
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setDescription(shop.description || "") }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span>{t('shop.description')}: {shop.description || t('shop.noDescription')}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
} 