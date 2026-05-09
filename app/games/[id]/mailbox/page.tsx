"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollText, Send, User, Mail, MailOpen, Gift, Coins, ArrowLeft, Inbox, RefreshCw, Package, X, ChevronDown, ChevronRight, CornerDownLeft, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { GameNavButtons } from "@/components/GameNavButtons"
import { useItemProfilesCache } from "@/hooks/use-item-profiles-cache"
import { CopyButton } from "@/components/CopyButton"
import { getGame, updateGame } from "@/lib/game-api"
import { Switch } from "@/components/ui/switch"
import type { Game } from "@/types/game"
import { listItemDefinitions } from "@/lib/inventory-api"
import type { ItemDefinition } from "@/types/inventory"
import { getGameProgressList, getGameProgressDetail, GameProgress } from "@/lib/game-user-api"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"

interface MailboxAttachment {
  type: string
  definition_id?: string
  quantity: number
}

interface MailboxMessage {
  id: string
  sender_id: string | null
  subject: string
  body: string
  message_type: string
  status: string
  attachments: MailboxAttachment[]
  expires_at: string | null
  read_at: string | null
  claimed_at: string | null
  created_at: string
}

interface MailboxResponse {
  limit: number
  messages: MailboxMessage[]
  offset: number
  profile_id: string
  total: number
  user_id: string
}

interface SystemMailForm {
  receiver_id: string
  subject: string
  body: string
  message_type: "system_reward"
  idempotency_key: string
  expires_in_days: number
  attachments: Array<{
    type: "item" | "coin"
    definition_id?: string
    quantity: number
  }>
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString()
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    claimed: "default",
    unclaimed: "secondary",
    unread: "secondary",
    read: "secondary",
    expired: "destructive",
  }
  const labels: Record<string, string> = {
    unclaimed: "unclaim",
    unread: "unclaim",
    read: "unclaim",
  }
  return (
    <Badge variant={variants[status] ?? "outline"} className="text-xs capitalize">
      {labels[status] ?? status}
    </Badge>
  )
}

function ReadBadge({ readAt, claimedAt }: { readAt: string | null; claimedAt: string | null }) {
  // claimed implies read — if either timestamp is set, the message was read
  const isRead = readAt !== null || claimedAt !== null
  return (
    <Badge
      variant={isRead ? "outline" : "secondary"}
      className={`text-xs flex items-center gap-1 shrink-0 ${isRead ? "text-muted-foreground" : "border-blue-400 text-blue-600 dark:text-blue-400"}`}
    >
      {isRead ? <MailOpen className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
      {isRead ? "read" : "unread"}
    </Badge>
  )
}

export default function MailboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const gameId = id
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)
  
  const [loading, setLoading] = useState(false)
  const [game, setGame] = useState<Game | null>(null)
  const [form, setForm] = useState<SystemMailForm>({
    receiver_id: "",
    subject: "Thank You",
    body: "Thank you for playing with us!",
    message_type: "system_reward",
    idempotency_key: "",
    expires_in_days: 30,
    attachments: []
  })
  const [openItemDropdown, setOpenItemDropdown] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Player search state
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false)
  const [playerSearchQuery, setPlayerSearchQuery] = useState("")
  const [playerSearchResults, setPlayerSearchResults] = useState<GameProgress[]>([])
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false)
  const [selectedPlayerName, setSelectedPlayerName] = useState("")
  const playerSearchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Mailbox list state
  const [mailboxData, setMailboxData] = useState<MailboxResponse | null>(null)
  const [mailboxLoading, setMailboxLoading] = useState(false)
  const [mailboxError, setMailboxError] = useState<string | null>(null)
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const playerIdRef = useRef<HTMLInputElement>(null)
  const [highlightPlayerId, setHighlightPlayerId] = useState(false)

  // Item definitions map for resolving attachment names
  const [itemDefsMap, setItemDefsMap] = useState<Record<string, ItemDefinition>>({})

  const handleFocusPlayerId = () => {
    playerIdRef.current?.focus()
    setHighlightPlayerId(true)
    setTimeout(() => setHighlightPlayerId(false), 1500)
  }

  const fetchPlayerMailbox = useCallback(async (progressId: string) => {
    if (!progressId || !isValidUUID(progressId)) {
      setMailboxData(null)
      setMailboxError(null)
      return
    }
    setMailboxLoading(true)
    setMailboxError(null)
    try {
      const data = await api.get(`/api/v1/gamer-progress/${progressId}/mailbox?limit=50`)
      setMailboxData(data)

      // Collect all unique definition_ids from attachments
      const defIds = new Set<string>()
      for (const msg of (data.messages ?? [])) {
        for (const att of (msg.attachments ?? [])) {
          if (att.definition_id) defIds.add(att.definition_id)
        }
      }

      // Fetch item definitions if we have IDs not yet in the map
      if (defIds.size > 0) {
        try {
          const res = await listItemDefinitions({ gameId }, { limit: 200 })
          setItemDefsMap((prev) => {
            const map: Record<string, ItemDefinition> = { ...prev }
            for (const item of (res.items ?? [])) {
              map[item.id] = item
            }
            return map
          })
        } catch {
          // silently ignore — will fall back to showing IDs
        }
      }
    } catch (err: any) {
      setMailboxError(err?.message || "Failed to load mailbox")
      setMailboxData(null)
    } finally {
      setMailboxLoading(false)
    }
  }, [gameId])

  // Debounced fetch when receiver_id changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPlayerMailbox(form.receiver_id)
    }, 600)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form.receiver_id, fetchPlayerMailbox])

  // Debounced player search
  useEffect(() => {
    if (playerSearchDebounceRef.current) clearTimeout(playerSearchDebounceRef.current)
    if (!playerSearchQuery.trim()) {
      setPlayerSearchResults([])
      return
    }
    playerSearchDebounceRef.current = setTimeout(async () => {
      setPlayerSearchLoading(true)
      try {
        const result = await getGameProgressList(gameId, { display_name: playerSearchQuery })
        setPlayerSearchResults(result.progress)
      } catch {
        setPlayerSearchResults([])
      } finally {
        setPlayerSearchLoading(false)
      }
    }, 400)
    return () => {
      if (playerSearchDebounceRef.current) clearTimeout(playerSearchDebounceRef.current)
    }
  }, [playerSearchQuery, gameId])

  const handleSelectPlayer = (player: GameProgress) => {
    handleReceiverIdChange(player.id)
    setSelectedPlayerName(player.user_display_name || player.user_email || player.id)
    setPlayerSearchOpen(false)
    setPlayerSearchQuery("")
  }

  // Use the caching hook for item profiles
  const { itemProfiles, loading: itemProfilesLoading, error, loadItemProfiles, clearCache } = useItemProfilesCache(gameId)

  // Check for userId in URL parameters and auto-fill the form
  useEffect(() => {
    const userId = searchParams.get('userId')
    if (userId) {
      setForm(prevForm => ({
        ...prevForm,
        receiver_id: userId
      }))
    }
  }, [searchParams])

  // When receiver_id is set (e.g. from URL) and we have no display name yet, fetch player info
  useEffect(() => {
    if (!form.receiver_id || !isValidUUID(form.receiver_id) || selectedPlayerName) return
    getGameProgressDetail(form.receiver_id)
      .then((detail) => {
        const name = detail.user_display_name || detail.user_email || ""
        if (name) setSelectedPlayerName(name)
      })
      .catch(() => {})
  }, [form.receiver_id]) // intentionally omit selectedPlayerName to avoid re-running after it's set

  // Clear cache when component mounts (user re-enters the page)
  useEffect(() => {
    clearCache()
  }, [gameId, clearCache])

  // Fetch game info for breadcrumb
  useEffect(() => {
    getGame(gameId).then(setGame).catch(() => {})
  }, [gameId])

  const handleReceiverIdChange = (value: string) => {
    setForm(prev => ({ ...prev, receiver_id: value }))
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('userId', value)
    } else {
      params.delete('userId')
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Generate idempotency key if not provided
      const payload = {
        ...form,
        idempotency_key: form.idempotency_key || `sysmail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      await api.post(`/api/v1/games/${gameId}/mailbox/system-mail`, payload)
      
      toast({
        title: t('mailbox.toastSuccessTitle'),
        description: t('mailbox.toastSuccessDesc')
      })
      
      // Refresh mailbox list for current player
      const sentToId = form.receiver_id
      if (sentToId && isValidUUID(sentToId)) {
        fetchPlayerMailbox(sentToId)
      }

      // Reset form (keep receiver_id so mailbox stays visible)
      setForm({
        receiver_id: sentToId,
        subject: "Thank You",
        body: "Thank you for playing with us!",
        message_type: "system_reward",
        idempotency_key: "",
        expires_in_days: 30,
        attachments: []
      })
    } catch (error: any) {
      console.error("Failed to send system mail:", error)
      toast({
        title: t('mailbox.toastErrorTitle'),
        description: error.message || t('mailbox.toastErrorDesc'),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAttachment = (index: number, field: string, value: any) => {
    const newAttachments = [...form.attachments]
    newAttachments[index] = { ...newAttachments[index], [field]: value }
    setForm({ ...form, attachments: newAttachments })
  }

  const addAttachment = () => {
    setForm({
      ...form,
      attachments: [...form.attachments, { type: "item", definition_id: "", quantity: 1 }]
    })
  }

  const removeAttachment = (index: number) => {
    const newAttachments = form.attachments.filter((_, i) => i !== index)
    setForm({ ...form, attachments: newAttachments })
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">{t('common.games')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{game?.name || t('common.game')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="">{t('common.mailbox')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="group">
            <h1 className="text-2xl font-bold">{t('mailbox.pageTitle')}</h1>
            <p className="text-muted-foreground">{t('mailbox.pageSubtitle')}</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0">
          <GameNavButtons gameId={gameId} active="mailbox" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Column 1: Send System Mail */}
        <Card>
        <CardHeader>
          <CardTitle>{t('mailbox.sendCardTitle')}</CardTitle>
          <CardDescription>
            {t('mailbox.sendCardDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  <User className="inline h-4 w-4 mr-1" />
                  {t('mailbox.labelPlayerId')}
                </Label>
                <Popover open={playerSearchOpen} onOpenChange={setPlayerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      ref={playerIdRef as any}
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={playerSearchOpen}
                      className={`w-full justify-between font-normal transition-all duration-300 ${highlightPlayerId ? "ring-2 ring-primary border-primary" : ""}`}
                    >
                      <span className="truncate text-left">
                        {selectedPlayerName
                          ? selectedPlayerName
                          : form.receiver_id
                            ? form.receiver_id
                            : <span className="text-muted-foreground">{t('mailbox.placeholderPlayerId')}</span>}
                      </span>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        {form.receiver_id && (
                          <span
                            role="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReceiverIdChange("")
                              setSelectedPlayerName("")
                              setPlayerSearchResults([])
                              setPlayerSearchQuery("")
                            }}
                            title={t('mailbox.clearPlayerId')}
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }} align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search player by name..."
                        value={playerSearchQuery}
                        onValueChange={setPlayerSearchQuery}
                      />
                      <CommandList>
                        {playerSearchLoading ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
                        ) : playerSearchResults.length === 0 && playerSearchQuery.trim() ? (
                          <CommandEmpty>No players found.</CommandEmpty>
                        ) : playerSearchResults.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">Type a name to search players.</div>
                        ) : (
                          <CommandGroup>
                            {playerSearchResults.map((player) => (
                              <CommandItem
                                key={player.id}
                                value={player.id}
                                onSelect={() => handleSelectPlayer(player)}
                              >
                                <Check className={`mr-2 h-4 w-4 shrink-0 ${form.receiver_id === player.id ? "opacity-100" : "opacity-0"}`} />
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{player.user_display_name || player.user_email}</div>
                                  <div className="text-xs text-muted-foreground font-mono truncate">{player.id}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">
                  <Mail className="inline h-4 w-4 mr-1" />
                  {t('mailbox.labelSubject')}
                </Label>
                <div className="relative">
                  <Input
                    id="subject"
                    placeholder={t('mailbox.placeholderSubject')}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className={form.subject ? "pr-8" : ""}
                    required
                  />
                  {form.subject && (
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setForm({ ...form, subject: "" })}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">
                <Mail className="inline h-4 w-4 mr-1" />
                {t('mailbox.labelBody')}
              </Label>
              <div className="relative">
                <Textarea
                  id="body"
                  placeholder={t('mailbox.placeholderBody')}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={4}
                  className={form.body ? "pr-8" : ""}
                  required
                />
                {form.body && (
                  <button type="button" className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setForm({ ...form, body: "" })}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expiration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires_in_days">{t('mailbox.labelExpiration')}</Label>
                <Input
                  id="expires_in_days"
                  type="number"
                  min="1"
                  max="365"
                  value={form.expires_in_days}
                  onChange={(e) => setForm({ ...form, expires_in_days: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idempotency_key">{t('mailbox.labelIdempotencyKey')}</Label>
                <div className="relative">
                  <Input
                    id="idempotency_key"
                    placeholder={t('mailbox.placeholderIdempotencyKey')}
                    value={form.idempotency_key}
                    onChange={(e) => setForm({ ...form, idempotency_key: e.target.value })}
                    className={form.idempotency_key ? "pr-8" : ""}
                  />
                  {form.idempotency_key && (
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setForm({ ...form, idempotency_key: "" })}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="space-y-2">
                <Label className="text-red-600">{t('mailbox.errorLoadingItems')}</Label>
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Attachments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Gift className="inline h-4 w-4 mr-1" />
                  {t('mailbox.labelAttachments')}
                  <span className={`text-xs font-mono ${form.attachments.length >= 10 ? "text-destructive" : "text-muted-foreground"}`}>
                    {form.attachments.length}/10
                  </span>
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addAttachment} disabled={form.attachments.length >= 10}>
                  {t('mailbox.addAttachment')}
                </Button>
              </div>
              
              {form.attachments.map((attachment, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>{t('mailbox.labelType')}</Label>
                    <Select
                      value="item"
                      disabled
                    >
                      <SelectTrigger>
                        <SelectValue>{t('mailbox.typeItem')}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="item">{t('mailbox.typeItem')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('mailbox.labelItemDefinition')}</Label>
                    <Popover open={openItemDropdown === index} onOpenChange={(open) => setOpenItemDropdown(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openItemDropdown === index}
                          className="w-full justify-between"
                        >
                          {attachment.definition_id 
                            ? itemProfiles.find((item) => item.id === attachment.definition_id)?.name || t('mailbox.selectItem')
                            : t('mailbox.selectItem')}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder={t('mailbox.searchItems')}
                            onValueChange={(value) => {
                              setSearchQuery(value)
                              loadItemProfiles(value)
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>{t('mailbox.noItemsFound')}</CommandEmpty>
                            <CommandGroup>
                              {itemProfiles.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  onSelect={(currentValue) => {
                                    updateAttachment(index, "definition_id", currentValue === attachment.definition_id ? "" : item.id)
                                    setOpenItemDropdown(null)
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${attachment.definition_id === item.id ? "opacity-100" : "opacity-0"}`}
                                  />
                                  {item.name} ({item.item_code})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>
                      <Coins className="inline h-4 w-4 mr-1" />
                      {t('mailbox.labelQuantity')}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={attachment.quantity}
                      onChange={(e) => updateAttachment(index, "quantity", parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      {t('mailbox.remove')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? t('mailbox.sending') : t('mailbox.sendButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

        {/* Column 2: Settings + Player Mailbox */}
        <div className="flex flex-col gap-4">
        {game && (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">{t('game.allowPlayerTrading')}</p>
              <p className="text-xs text-muted-foreground">{t('game.allowPlayerTradingDesc')}</p>
            </div>
            <Switch
              id="allow-trading"
              checked={game.settings?.allow_player_trading ?? false}
              onCheckedChange={async (checked) => {
                try {
                  const updated = await updateGame(game.id, {
                    settings: { ...game.settings, allow_player_trading: checked }
                  })
                  setGame(updated)
                  toast({
                    title: t('game.settingsUpdated'),
                    description: checked ? t('game.tradingEnabled') : t('game.tradingDisabled')
                  })
                } catch {
                  toast({ title: t('mailbox.toastErrorTitle'), description: t('game.failedUpdateSettings'), variant: "destructive" })
                }
              }}
            />
          </div>
        )}
        <Card className="group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  {t('mailbox.inboxTitle')}
                </CardTitle>
                <CardDescription>
                  {mailboxData
                    ? (
                      <span className="flex items-center gap-1 flex-wrap">
                        <span>{mailboxData.total} {mailboxData.total !== 1 ? t('mailbox.inboxMessagesPlural') : t('mailbox.inboxMessages')} — {t('mailbox.inboxProfileId')}</span>
                        <span className="font-mono">{mailboxData.profile_id}</span>
                        <CopyButton text={mailboxData.profile_id} />
                      </span>
                    )
                    : form.receiver_id && isValidUUID(form.receiver_id)
                    ? t('mailbox.inboxLoading')
                    : (
                      <span className="inline-flex items-center gap-1">
                        {t('mailbox.inboxEnterPlayer')}
                        <button
                          type="button"
                          onClick={handleFocusPlayerId}
                          title="Enter Player ID"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center"
                        >
                          <CornerDownLeft className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                </CardDescription>
              </div>
              {form.receiver_id && isValidUUID(form.receiver_id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchPlayerMailbox(form.receiver_id)}
                  disabled={mailboxLoading}
                  title={t('common.refresh')}
                >
                  <RefreshCw className={`h-4 w-4 ${mailboxLoading ? "animate-spin" : ""}`} />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {mailboxError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md mb-4">
                <p className="text-destructive text-sm">{mailboxError}</p>
              </div>
            )}

            {mailboxLoading && !mailboxData && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                {t('mailbox.inboxLoadingMailbox')}
              </div>
            )}

            {!mailboxLoading && !mailboxData && !mailboxError && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Inbox className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t('mailbox.inboxNoMailbox')}</p>
              </div>
            )}

            {mailboxData && mailboxData.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Inbox className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t('mailbox.inboxNoMessages')}</p>
              </div>
            )}

            {mailboxData && mailboxData.messages.length > 0 && (
              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {mailboxData.messages.map((msg) => {
                  const isExpanded = expandedMessages.has(msg.id)
                  const toggle = () => setExpandedMessages(prev => {
                    const next = new Set(prev)
                    next.has(msg.id) ? next.delete(msg.id) : next.add(msg.id)
                    return next
                  })
                  return (
                    <div key={msg.id} className="border rounded-lg text-sm overflow-hidden">
                      {/* Collapsed row — always visible */}
                      <button
                        type="button"
                        onClick={toggle}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        <span className="flex-1 font-medium truncate">{msg.subject}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDate(msg.created_at)}</span>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                            <Package className="h-3 w-3" />
                            {msg.attachments.length}
                          </span>
                        )}
                        {/* hide ReadBadge when claimed — claimed already implies read */}
                        {msg.status !== "claimed" && <ReadBadge readAt={msg.read_at} claimedAt={msg.claimed_at} />}
                        <StatusBadge status={msg.status} />
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 space-y-2 border-t">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <span className="shrink-0">ID:</span>
                            <span>{msg.id}</span>
                            <CopyButton text={msg.id} />
                          </div>

                          <p className="text-muted-foreground">{msg.body}</p>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>{t('mailbox.detailType')}: <span className="font-medium text-foreground">{msg.message_type}</span></span>
                            <span>{t('mailbox.detailSent')}: <span className="font-medium text-foreground">{formatDate(msg.created_at)}</span></span>
                            {msg.expires_at && (
                              <span>{t('mailbox.detailExpires')}: <span className="font-medium text-foreground">{formatDate(msg.expires_at)}</span></span>
                            )}
                            <span>Read: <span className="font-medium text-foreground">{msg.read_at ? formatDate(msg.read_at) : "—"}</span></span>
                            {msg.claimed_at && (
                              <span>{t('mailbox.detailClaimed')}: <span className="font-medium text-foreground">{formatDate(msg.claimed_at)}</span></span>
                            )}
                          </div>

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="pt-1">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                <Package className="h-3 w-3" />
                                {t('mailbox.detailAttachments')} ({msg.attachments.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {msg.attachments.map((att, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 bg-muted rounded px-2 py-0.5 text-xs"
                                  >
                                    <span className="capitalize">{att.type}</span>
                                    {att.definition_id && (
                                      <span className="text-muted-foreground truncate max-w-[160px]" title={att.definition_id}>
                                        {itemDefsMap[att.definition_id]
                                          ? `${itemDefsMap[att.definition_id].name} (${itemDefsMap[att.definition_id].item_code || att.definition_id.slice(0, 8)})`
                                          : `${att.definition_id.slice(0, 8)}…`}
                                      </span>
                                    )}
                                    <span className="font-medium">×{att.quantity}</span>
                                    {att.type === "item" && att.definition_id && (
                                      <a
                                        href={`/games/${gameId}/items/${att.definition_id}`}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        title="Open item page"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
