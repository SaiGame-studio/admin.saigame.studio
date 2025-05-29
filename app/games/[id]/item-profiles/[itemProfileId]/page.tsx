"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Pencil, Save, X, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { fetchItemProfile, updateItemProfile, ItemProfile } from "@/lib/item-profile-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { getGame } from "@/lib/game-api"
import { ItemType, ItemProfileStatus } from "@/types/game"

export default function ItemProfileDetailPage() {
  const params = useParams() as { id: string; itemProfileId: string }
  const router = useRouter()
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);
  const [itemProfile, setItemProfile] = useState<ItemProfile | null>(null)
  const [game, setGame] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Single function to update the entire item profile with fresh data from API
  const updateItemProfileData = (updatedData: ItemProfile) => {
    setItemProfile(updatedData)
  }

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
        setError(null)
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    loadItemProfileAndGame()
  }, [params.itemProfileId, params.id])

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
      <div className="mb-2">
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

      <Card className="mb-6">
        <CardHeader>
          <ItemProfileNameEditable
            itemProfile={itemProfile}
            itemProfileId={params.itemProfileId}
            onItemProfileUpdate={updateItemProfileData}
          />
          <div className="mb-2">{t('itemProfile.profileId')}: <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{itemProfile.id}</code></div>

          <ItemProfileCodeNameEditable
            itemProfile={itemProfile}
            itemProfileId={params.itemProfileId}
            onItemProfileUpdate={updateItemProfileData}
          />

          <ItemProfileTypeEditable
            itemProfile={itemProfile}
            itemProfileId={params.itemProfileId}
            onItemProfileUpdate={updateItemProfileData}
          />
          <ItemProfileStatusEditable
            itemProfile={itemProfile}
            itemProfileId={params.itemProfileId}
            onItemProfileUpdate={updateItemProfileData}
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <ItemProfileLevelEditable
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="mb-2">
              <ItemProfileStackableEditable
                itemProfile={itemProfile}
                itemProfileId={params.itemProfileId}
                onItemProfileUpdate={updateItemProfileData}
              />
            </div>
            <div className="mb-2">
              <ItemProfileCreateOnRegistryEditable
                itemProfile={itemProfile}
                itemProfileId={params.itemProfileId}
                onItemProfileUpdate={updateItemProfileData}
              />
            </div>
          </div>

          <div className="mb-2">
            <ItemProfileAmountOnRegistryEditable
              itemProfile={itemProfile}
              itemProfileId={params.itemProfileId}
              onItemProfileUpdate={updateItemProfileData}
            />
          </div>

          <div className="mb-2">{t('common.game')}: {game?.id && game?.name ? (
            <Link href={`/games/${game.id}`} className="inline-flex items-center gap-1 hover:text-primary font-semibold">
              {game.name}
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
          ) : (
            <span className="font-semibold">{game?.name}</span>
          )}</div>

          <div className="mb-2">{t('itemProfile.createdAt')}: {formatTimestamp(itemProfile.created_at)}</div>
          <div className="mb-2">{t('itemProfile.updatedAt')}: {formatTimestamp(itemProfile.updated_at)}</div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mb-4">{t('itemProfile.customData')}</h2>
      {itemProfile.custom_data && Object.keys(itemProfile.custom_data).length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 font-semibold hover:underline">
                {t('itemProfile.customData')} ({Object.keys(itemProfile.custom_data).length} {Object.keys(itemProfile.custom_data).length === 1 ? 'item' : 'items'})
                <ChevronDown className="w-4 h-4 transition-transform data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(itemProfile.custom_data).map(([key, value]) => (
                    <div key={key} className="p-3 border rounded-lg">
                      <div className="font-semibold text-sm text-muted-foreground mb-1">{key}</div>
                      <div className="text-sm font-mono bg-muted px-2 py-1 rounded">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('common.noData')}</CardTitle>
            <CardDescription>No custom data has been set for this item profile.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

function ItemProfileNameEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(itemProfile.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(e.message || t('itemProfile.updateError'))
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
            className="w-64 h-10 px-3 text-lg font-bold"
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
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ItemProfileCodeNameEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [codeName, setCodeName] = useState(itemProfile.code_name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(e.message || t('itemProfile.updateError'))
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
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ItemProfileTypeEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(itemProfile.type)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(e.message || t('itemProfile.updateError'))
    } finally {
      setLoading(false)
    }
  }

  const itemTypes = Object.values(ItemType)

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <Select value={type} onValueChange={setType} disabled={loading}>
            <SelectTrigger className="w-48 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {itemTypes.map((itemType) => (
                <SelectItem key={itemType} value={itemType}>
                  {itemType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ItemProfileStatusEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState(itemProfile.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  useEffect(() => {
    setStatus(itemProfile.status)
  }, [itemProfile.status])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const updatedData = await updateItemProfile(itemProfileId, { status })
      onItemProfileUpdate(updatedData)
      setEditing(false)
    } catch (e: any) {
      setError(e.message || t('itemProfile.updateError'))
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = Object.values(ItemProfileStatus)

  const formatStatusText = (status: string) => {
    switch (status) {
      case ItemProfileStatus.ReadyToUse:
        return t('itemProfile.statusReadyToUse')
      case ItemProfileStatus.InProgress:
        return t('itemProfile.statusInProgress')  
      case ItemProfileStatus.ErrorUnStackAmountTooBig:
        return t('itemProfile.statusErrorUnStackAmountTooBig')
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const getStatusStyle = (status: string) => {
    if (status === ItemProfileStatus.ReadyToUse) {
      return {
        className: "inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-md",
        icon: "check",
        textColor: "text-green-600"
      }
    } else if (status === ItemProfileStatus.InProgress) {
      return {
        className: "inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-md", 
        icon: "clock",
        textColor: "text-yellow-600"
      }
    } else if (status === ItemProfileStatus.ErrorUnStackAmountTooBig || status.toLowerCase().includes('error')) {
      return {
        className: "inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold text-red-700 bg-red-100 rounded-md",
        icon: "alert",
        textColor: "text-red-600"
      }
    }
    return {
      className: "font-semibold",
      icon: null,
      textColor: ""
    }
  }

  const renderStatusIcon = (iconType: string | null) => {
    switch (iconType) {
      case "check":
        return <CheckCircle className="w-4 h-4" />
      case "clock":
        return <Clock className="w-4 h-4" />
      case "alert":
        return <AlertCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <Select value={status} onValueChange={setStatus} disabled={loading}>
            <SelectTrigger className="w-48 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((statusOption) => (
                <SelectItem key={statusOption} value={statusOption} className={getStatusStyle(statusOption).textColor}>
                  {getStatusStyle(statusOption).icon && <span className="mr-1">{renderStatusIcon(getStatusStyle(statusOption).icon)}</span>}
                  {formatStatusText(statusOption)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setStatus(itemProfile.status) }} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span>{t('itemProfile.status')}:&nbsp;
            {getStatusStyle(itemProfile.status).icon ? (
              <span className={getStatusStyle(itemProfile.status).className}>
                {renderStatusIcon(getStatusStyle(itemProfile.status).icon)}
                {formatStatusText(itemProfile.status)}
              </span>
            ) : (
              <span className="font-semibold">{formatStatusText(itemProfile.status)}</span>
            )}
          </span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ItemProfileLevelEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [levelStart, setLevelStart] = useState(itemProfile.level_start)
  const [levelMax, setLevelMax] = useState(itemProfile.level_max)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(e.message || t('itemProfile.updateError'))
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
                disabled={loading}
              />
              <span>-</span>
              <Input
                type="number"
                value={levelMax}
                onChange={e => setLevelMax(Number(e.target.value))}
                className="w-20 h-8 px-2 text-sm"
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
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ItemProfileStackLimitEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [stackLimit, setStackLimit] = useState(itemProfile.stack_limit)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(e.message || t('itemProfile.updateError'))
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
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ItemProfileStackableEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [stackable, setStackable] = useState(Boolean(itemProfile.stackable))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(e.message || t('itemProfile.updateError'))
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
              <Checkbox
                checked={stackable}
                onCheckedChange={checked => setStackable(checked === true)}
                disabled={loading}
              />
              <label className="text-sm">Stackable</label>
            </div>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setStackable(Boolean(itemProfile.stackable)) }} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>Stackable: <span className="font-semibold">{itemProfile.stackable ? "Yes" : "No"}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ItemProfileCreateOnRegistryEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [createOnRegistry, setCreateOnRegistry] = useState(Boolean(itemProfile.create_on_registry))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(e.message || t('itemProfile.updateError'))
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
              <Checkbox
                checked={createOnRegistry}
                onCheckedChange={checked => setCreateOnRegistry(checked === true)}
                disabled={loading}
              />
              <label className="text-sm">Create on Registry</label>
            </div>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setCreateOnRegistry(Boolean(itemProfile.create_on_registry)) }} disabled={loading}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span>Create on Registry: <span className="font-semibold">{itemProfile.create_on_registry ? "Yes" : "No"}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
}

function ItemProfileAmountOnRegistryEditable({ itemProfile, itemProfileId, onItemProfileUpdate }: { itemProfile: ItemProfile, itemProfileId: string, onItemProfileUpdate: (updatedData: ItemProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [amountOnRegistry, setAmountOnRegistry] = useState(itemProfile.amount_on_registry || 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(e.message || t('itemProfile.updateError'))
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
              className="w-32 h-8 px-2 text-sm"
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
            <span>Amount on Registry: <span className="font-semibold">{itemProfile.amount_on_registry || 0}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
} 