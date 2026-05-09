"use client"

import { useState, useRef, useEffect } from "react"
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Copy,
  Globe,

  Mail,
  MailCheck,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserIcon,
} from "lucide-react"

import { updateUserTimezone, updateDisplayName, resendVerificationEmail, formatDate } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserProfiles } from "@/components/user-profiles"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { CopyButton } from "@/components/CopyButton"

const ALL_TIMEZONES: string[] = (() => {
  try { return (Intl as any).supportedValuesOf("timeZone") as string[] } catch {
    return ["Pacific/Honolulu","America/Los_Angeles","America/Chicago","America/New_York",
      "America/Sao_Paulo","UTC","Europe/London","Europe/Paris","Europe/Berlin","Europe/Moscow",
      "Asia/Dubai","Asia/Kolkata","Asia/Bangkok","Asia/Ho_Chi_Minh","Asia/Shanghai","Asia/Tokyo",
      "Asia/Seoul","Australia/Sydney","Pacific/Auckland"]
  }
})()

// ---------------------------------------------------------------------------

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function ProfileContent() {
  const { user, isLoading, refreshUser } = useAuth()
  const { t } = useTranslation()

  const [nameEditing, setNameEditing] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [nameSaving, setNameSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const [copied, setCopied] = useState(false)
  const [tzEditing, setTzEditing] = useState(false)
  const [tzValue, setTzValue] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [tzSaving, setTzSaving] = useState(false)
  const [tzOpen, setTzOpen] = useState(false)

  if (isLoading) return <ProfileSkeleton />
  if (!user) return null

  const initials = (user.display_name || user.username || user.email)
    .split(/[\s_@]/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("") || "?"

  const currentTz = user.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  async function handleResendVerification() {
    setResendingEmail(true)
    try {
      await resendVerificationEmail()
      setResendSent(true)
    } catch {}
    setResendingEmail(false)
  }

  function startNameEdit() {
    setNameValue(user.display_name || user.username || "")
    setNameEditing(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  async function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === (user.display_name || user.username)) {
      setNameEditing(false)
      return
    }
    setNameSaving(true)
    try {
      await updateDisplayName(user.id, trimmed)
      await refreshUser()
      setNameEditing(false)
    } catch {}
    setNameSaving(false)
  }

  async function saveTz() {
    setTzSaving(true)
    try {
      await updateUserTimezone(tzValue)
      await refreshUser()
      setTzEditing(false)
    } catch {}
    setTzSaving(false)
  }

  return (
    <div className="space-y-6">

      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
      </div>

      {/* ── Header card ── */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden group/name">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent pointer-events-none" />
        <div className="relative p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:p-6 sm:gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-extrabold select-none ring-2 ring-primary/20 sm:h-20 sm:w-20 sm:text-3xl">
            {initials}
          </div>

          {/* Name / email */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              {nameEditing ? (
                <div className="flex items-center gap-2 flex-wrap w-full">
                  <Input
                    ref={nameInputRef}
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setNameEditing(false) }}
                    className="h-9 flex-1 min-w-0 text-lg font-extrabold sm:w-60 sm:flex-none"
                    disabled={nameSaving}
                  />
                  <Button size="sm" disabled={nameSaving} onClick={saveName}>{nameSaving ? "Saving…" : "Save"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNameEditing(false)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-extrabold tracking-tight truncate sm:text-2xl">
                    {user.display_name || user.username}
                  </h2>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/name:opacity-100"
                    onClick={startNameEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {!nameEditing && user.display_name && user.display_name !== user.username && (
                <span className="text-sm text-muted-foreground font-normal">@{user.username}</span>
              )}
              {user.is_active ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">Active</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Inactive</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-muted-foreground min-w-0 max-w-full">
                <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{user.email}</span>
              </span>
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-500">
                  <ShieldCheck className="h-3 w-3" /> {t('profilePage.verified')}
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-semibold text-yellow-500">
                    <ShieldOff className="h-3 w-3" /> {t('profilePage.notVerified')}
                  </span>
                  {resendSent ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-500">
                      <MailCheck className="h-3 w-3" /> Verification email sent
                    </span>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-yellow-500 hover:text-yellow-400"
                      disabled={resendingEmail} onClick={handleResendVerification}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${resendingEmail ? "animate-spin" : ""}`} />
                      {resendingEmail ? "Sending…" : "Resend verification"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Account info ── */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Account Information</p>

        <InfoRow icon={<UserIcon className="h-3.5 w-3.5" />} label={t('profilePage.userId')}>
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">{user.id}</code>
            <CopyButton text={user.id} />
          </div>
        </InfoRow>

        <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
          <span>{user.email}</span>
        </InfoRow>

        <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label={t('profilePage.memberSince')}>
          <span>{formatDate(user.created_at * 1000)}</span>
        </InfoRow>

        {/* Timezone */}
        <div className="flex flex-col gap-1 group/tz">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Globe className="h-3.5 w-3.5" /> {t('profilePage.timezone')}
          </div>
          {tzEditing ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Popover open={tzOpen} onOpenChange={setTzOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm h-8 sm:w-56">
                    <span className="truncate">{tzValue}</span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search timezone..." className="h-8" />
                    <CommandList className="max-h-60">
                      <CommandEmpty>No timezone found.</CommandEmpty>
                      <CommandGroup>
                        {ALL_TIMEZONES.map(tz => (
                          <CommandItem key={tz} value={tz} onSelect={val => { setTzValue(val); setTzOpen(false) }}>
                            <Check className={`mr-2 h-3.5 w-3.5 ${tzValue === tz ? "opacity-100" : "opacity-0"}`} />
                            {tz}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button size="sm" disabled={tzSaving} onClick={saveTz}>{tzSaving ? "Saving…" : t('profilePage.timezoneSave')}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setTzValue(currentTz); setTzEditing(false) }}>{t('profilePage.timezoneCancel')}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{currentTz}</span>
              {!user.timezone && <span className="text-[10px] text-muted-foreground">(local)</span>}
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/tz:opacity-100"
                onClick={() => { setTzValue(currentTz); setTzEditing(true) }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── User Profiles ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('profilePage.yourProfiles')}</p>
          <div className="flex-1 h-px bg-border" />
        </div>
        <UserProfiles />
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  )
}
