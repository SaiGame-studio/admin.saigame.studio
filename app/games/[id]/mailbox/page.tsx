"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollText, Send, User, Mail, Gift, Coins, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { GameNavButtons } from "@/components/GameNavButtons"
import { useItemProfilesCache } from "@/hooks/use-item-profiles-cache"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"

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

export default function MailboxPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const gameId = params.id
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)
  
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<SystemMailForm>({
    receiver_id: "",
    subject: "Welcome Gift",
    body: "Thank you for playing! Here's a welcome gift from our team.",
    message_type: "system_reward",
    idempotency_key: "",
    expires_in_days: 30,
    attachments: [
      {
        type: "item",
        definition_id: "",
        quantity: 5
      }
    ]
  })
  const [openItemDropdown, setOpenItemDropdown] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Use the caching hook for item profiles
  const { itemProfiles, loading: itemProfilesLoading, error, loadItemProfiles, clearCache } = useItemProfilesCache(gameId)

  // Check for userId in URL parameters and auto-fill the form
  useEffect(() => {
    const userId = searchParams.get('userId')
    if (userId && userId !== form.receiver_id) {
      setForm(prevForm => ({
        ...prevForm,
        receiver_id: userId
      }))
    }
  }, [searchParams, form.receiver_id])

  // Clear cache when component mounts (user re-enters the page)
  useEffect(() => {
    clearCache()
  }, [gameId, clearCache])

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
        title: "Success",
        description: "System mail sent successfully!"
      })
      
      // Reset form
      setForm({
        receiver_id: "",
        subject: "Welcome Gift",
        body: "Thank you for playing! Here's a welcome gift from our team.",
        message_type: "system_reward",
        idempotency_key: "",
        expires_in_days: 30,
        attachments: [
          {
            type: "item",
            definition_id: "",
            quantity: 5
          }
        ]
      })
    } catch (error: any) {
      console.error("Failed to send system mail:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send system mail",
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
              <BreadcrumbLink href={`/games/${gameId}`}>{t('common.game')}</BreadcrumbLink>
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
            <h1 className="text-2xl font-bold">System Mail</h1>
            <p className="text-muted-foreground">Send system messages to players in your game</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0">
          <GameNavButtons gameId={gameId} active="mailbox" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send System Mail</CardTitle>
          <CardDescription>
            Send a system message with optional rewards to a specific player
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiver_id">
                  <User className="inline h-4 w-4 mr-1" />
                  Player ID
                </Label>
                <Input
                  id="receiver_id"
                  placeholder="Enter player ID"
                  value={form.receiver_id}
                  onChange={(e) => setForm({ ...form, receiver_id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Subject
                </Label>
                <Input
                  id="subject"
                  placeholder="Enter subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">
                <Mail className="inline h-4 w-4 mr-1" />
                Message Body
              </Label>
              <Textarea
                id="body"
                placeholder="Enter your message to the player"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
                required
              />
            </div>

            {/* Expiration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires_in_days">Expiration (days)</Label>
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
                <Label htmlFor="idempotency_key">Idempotency Key (optional)</Label>
                <Input
                  id="idempotency_key"
                  placeholder="Optional: unique key to prevent duplicates"
                  value={form.idempotency_key}
                  onChange={(e) => setForm({ ...form, idempotency_key: e.target.value })}
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="space-y-2">
                <Label className="text-red-600">Error Loading Items</Label>
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Attachments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center">
                  <Gift className="inline h-4 w-4 mr-1" />
                  Attachments (Rewards)
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addAttachment}>
                  Add Attachment
                </Button>
              </div>
              
              {form.attachments.map((attachment, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value="item"
                      disabled
                    >
                      <SelectTrigger>
                        <SelectValue>Item</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="item">Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Item Definition</Label>
                    <Popover open={openItemDropdown === index} onOpenChange={(open) => setOpenItemDropdown(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openItemDropdown === index}
                          className="w-full justify-between"
                        >
                          {attachment.definition_id 
                            ? itemProfiles.find((item) => item.id === attachment.definition_id)?.name || "Select item..."
                            : "Select item..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search items..." 
                            onValueChange={(value) => {
                              setSearchQuery(value)
                              loadItemProfiles(value)
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>No items found.</CommandEmpty>
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
                      Quantity
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
                      disabled={form.attachments.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send System Mail"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
