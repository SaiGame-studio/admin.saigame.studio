"use client"

import { useState } from "react"
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Copy,
  Globe,
  Layers,
  Mail,
  Pencil,
  ShieldCheck,
  ShieldOff,
  UserIcon,
} from "lucide-react"

import { updateUserTimezone, formatDate } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserProfiles } from "@/components/user-profiles"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
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
  const studiosUsed = user.usage?.studios ?? 0
  const studiosMax = user.limits?.max_studios ?? null

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
    <div className="container mx-auto py-6 space-y-6">

      {/* ── Page title ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </div>

      {/* ── Header card ── */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent pointer-events-none" />
        <div className="relative p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-3xl font-extrabold select-none ring-2 ring-primary/20">
            {initials}
          </div>

          {/* Name / email */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-extrabold tracking-tight truncate">
                {user.display_name || user.username}
              </h2>
              {user.display_name && user.display_name !== user.username && (
                <span className="text-sm text-muted-foreground font-normal">@{user.username}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-500">
                  <ShieldCheck className="h-3 w-3" /> {t('profilePage.verified')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-semibold text-yellow-500">
                  <ShieldOff className="h-3 w-3" /> {t('profilePage.notVerified')}
                </span>
              )}
              {user.is_active ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">Active</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Inactive</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Account info */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
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
                    <Button variant="outline" role="combobox" className="w-56 justify-between font-normal text-sm h-8">
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
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/tz:opacity-100 transition-opacity"
                  onClick={() => { setTzValue(currentTz); setTzEditing(true) }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Usage & permissions */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Usage & Limits</p>

          {/* Studios */}
          <div className="rounded-xl bg-muted/40 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="h-4 w-4" /> Studios
            </div>
            <div className="text-xl font-bold tabular-nums">
              {studiosUsed}
              {studiosMax != null && (
                <span className="text-xs text-muted-foreground font-normal"> / {studiosMax}</span>
              )}
            </div>
          </div>

          {/* Permissions / capabilities */}
          {user.capabilities?.is_super_admin && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">Super Admin</span>
            </div>
          )}

          {user.permissions && user.permissions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.map(p => (
                  <span key={p} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!user.capabilities?.is_super_admin && (!user.permissions || user.permissions.length === 0) && (
            <p className="text-sm text-muted-foreground">No special permissions.</p>
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  )
}
