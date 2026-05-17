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

// Hardcoded list of canonical IANA timezone names (tzdb 2025a).
// Using a static list avoids relying on the browser's Intl.supportedValuesOf(),
// which may return deprecated names (e.g. Pacific/Truk) that are rejected by
// the server's Alpine Linux tzdata package.
const ALL_TIMEZONES: string[] = [
  "Africa/Abidjan","Africa/Accra","Africa/Addis_Ababa","Africa/Algiers","Africa/Asmara",
  "Africa/Bamako","Africa/Bangui","Africa/Banjul","Africa/Bissau","Africa/Blantyre",
  "Africa/Brazzaville","Africa/Bujumbura","Africa/Cairo","Africa/Casablanca","Africa/Ceuta",
  "Africa/Conakry","Africa/Dakar","Africa/Dar_es_Salaam","Africa/Djibouti","Africa/Douala",
  "Africa/El_Aaiun","Africa/Freetown","Africa/Gaborone","Africa/Harare","Africa/Johannesburg",
  "Africa/Juba","Africa/Kampala","Africa/Khartoum","Africa/Kigali","Africa/Kinshasa",
  "Africa/Lagos","Africa/Libreville","Africa/Lome","Africa/Luanda","Africa/Lubumbashi",
  "Africa/Lusaka","Africa/Malabo","Africa/Maputo","Africa/Maseru","Africa/Mbabane",
  "Africa/Mogadishu","Africa/Monrovia","Africa/Nairobi","Africa/Ndjamena","Africa/Niamey",
  "Africa/Nouakchott","Africa/Ouagadougou","Africa/Porto-Novo","Africa/Sao_Tome",
  "Africa/Tripoli","Africa/Tunis","Africa/Windhoek",
  "America/Adak","America/Anchorage","America/Anguilla","America/Antigua","America/Araguaina",
  "America/Argentina/Buenos_Aires","America/Argentina/Catamarca","America/Argentina/Cordoba",
  "America/Argentina/Jujuy","America/Argentina/La_Rioja","America/Argentina/Mendoza",
  "America/Argentina/Rio_Gallegos","America/Argentina/Salta","America/Argentina/San_Juan",
  "America/Argentina/San_Luis","America/Argentina/Tucuman","America/Argentina/Ushuaia",
  "America/Aruba","America/Asuncion","America/Atikokan","America/Bahia","America/Bahia_Banderas",
  "America/Barbados","America/Belem","America/Belize","America/Blanc-Sablon","America/Boa_Vista",
  "America/Bogota","America/Boise","America/Cambridge_Bay","America/Campo_Grande",
  "America/Cancun","America/Caracas","America/Cayenne","America/Cayman","America/Chicago",
  "America/Chihuahua","America/Ciudad_Juarez","America/Costa_Rica","America/Creston",
  "America/Cuiaba","America/Curacao","America/Danmarkshavn","America/Dawson",
  "America/Dawson_Creek","America/Denver","America/Detroit","America/Dominica",
  "America/Edmonton","America/Eirunepe","America/El_Salvador","America/Fortaleza",
  "America/Glace_Bay","America/Goose_Bay","America/Grand_Turk","America/Grenada",
  "America/Guadeloupe","America/Guatemala","America/Guayaquil","America/Guyana",
  "America/Halifax","America/Havana","America/Hermosillo",
  "America/Indiana/Indianapolis","America/Indiana/Knox","America/Indiana/Marengo",
  "America/Indiana/Petersburg","America/Indiana/Tell_City","America/Indiana/Vevay",
  "America/Indiana/Vincennes","America/Indiana/Winamac",
  "America/Inuvik","America/Iqaluit","America/Jamaica","America/Juneau",
  "America/Kentucky/Louisville","America/Kentucky/Monticello",
  "America/Kralendijk","America/La_Paz","America/Lima","America/Los_Angeles",
  "America/Lower_Princes","America/Maceio","America/Managua","America/Manaus",
  "America/Marigot","America/Martinique","America/Matamoros","America/Mazatlan",
  "America/Menominee","America/Merida","America/Metlakatla","America/Mexico_City",
  "America/Miquelon","America/Moncton","America/Monterrey","America/Montevideo",
  "America/Montserrat","America/Nassau","America/New_York","America/Nome","America/Noronha",
  "America/North_Dakota/Beulah","America/North_Dakota/Center","America/North_Dakota/New_Salem",
  "America/Nuuk","America/Ojinaga","America/Panama","America/Paramaribo","America/Phoenix",
  "America/Port-au-Prince","America/Port_of_Spain","America/Porto_Velho","America/Puerto_Rico",
  "America/Punta_Arenas","America/Rankin_Inlet","America/Recife","America/Regina",
  "America/Resolute","America/Rio_Branco","America/Santarem","America/Santiago",
  "America/Santo_Domingo","America/Sao_Paulo","America/Scoresbysund","America/Sitka",
  "America/St_Barthelemy","America/St_Johns","America/St_Kitts","America/St_Lucia",
  "America/St_Thomas","America/St_Vincent","America/Swift_Current","America/Tegucigalpa",
  "America/Thule","America/Tijuana","America/Toronto","America/Tortola","America/Vancouver",
  "America/Whitehorse","America/Winnipeg","America/Yakutat","America/Yellowknife",
  "Antarctica/Casey","Antarctica/Davis","Antarctica/DumontDUrville","Antarctica/Macquarie",
  "Antarctica/Mawson","Antarctica/McMurdo","Antarctica/Palmer","Antarctica/Rothera",
  "Antarctica/Syowa","Antarctica/Troll","Antarctica/Vostok",
  "Arctic/Longyearbyen",
  "Asia/Aden","Asia/Almaty","Asia/Amman","Asia/Anadyr","Asia/Aqtau","Asia/Aqtobe",
  "Asia/Ashgabat","Asia/Atyrau","Asia/Baghdad","Asia/Bahrain","Asia/Baku","Asia/Bangkok",
  "Asia/Barnaul","Asia/Beirut","Asia/Bishkek","Asia/Brunei","Asia/Chita","Asia/Choibalsan",
  "Asia/Colombo","Asia/Damascus","Asia/Dhaka","Asia/Dili","Asia/Dubai","Asia/Dushanbe",
  "Asia/Famagusta","Asia/Gaza","Asia/Hebron","Asia/Ho_Chi_Minh","Asia/Hong_Kong","Asia/Hovd",
  "Asia/Irkutsk","Asia/Jakarta","Asia/Jayapura","Asia/Jerusalem","Asia/Kabul","Asia/Kamchatka",
  "Asia/Karachi","Asia/Kathmandu","Asia/Khandyga","Asia/Kolkata","Asia/Krasnoyarsk",
  "Asia/Kuala_Lumpur","Asia/Kuching","Asia/Kuwait","Asia/Macau","Asia/Magadan",
  "Asia/Makassar","Asia/Manila","Asia/Muscat","Asia/Nicosia","Asia/Novokuznetsk",
  "Asia/Novosibirsk","Asia/Omsk","Asia/Oral","Asia/Phnom_Penh","Asia/Pontianak",
  "Asia/Pyongyang","Asia/Qatar","Asia/Qostanay","Asia/Qyzylorda","Asia/Riyadh",
  "Asia/Sakhalin","Asia/Samarkand","Asia/Seoul","Asia/Shanghai","Asia/Singapore",
  "Asia/Srednekolymsk","Asia/Taipei","Asia/Tashkent","Asia/Tbilisi","Asia/Tehran",
  "Asia/Thimphu","Asia/Tokyo","Asia/Tomsk","Asia/Ulaanbaatar","Asia/Urumqi","Asia/Ust-Nera",
  "Asia/Vientiane","Asia/Vladivostok","Asia/Yakutsk","Asia/Yangon","Asia/Yekaterinburg",
  "Asia/Yerevan",
  "Atlantic/Azores","Atlantic/Bermuda","Atlantic/Canary","Atlantic/Cape_Verde",
  "Atlantic/Faroe","Atlantic/Madeira","Atlantic/Reykjavik","Atlantic/South_Georgia",
  "Atlantic/St_Helena","Atlantic/Stanley",
  "Australia/Adelaide","Australia/Brisbane","Australia/Broken_Hill","Australia/Darwin",
  "Australia/Eucla","Australia/Hobart","Australia/Lindeman","Australia/Lord_Howe",
  "Australia/Melbourne","Australia/Perth","Australia/Sydney",
  "Europe/Amsterdam","Europe/Andorra","Europe/Astrakhan","Europe/Athens","Europe/Belgrade",
  "Europe/Berlin","Europe/Bratislava","Europe/Brussels","Europe/Bucharest","Europe/Budapest",
  "Europe/Busingen","Europe/Chisinau","Europe/Copenhagen","Europe/Dublin","Europe/Gibraltar",
  "Europe/Guernsey","Europe/Helsinki","Europe/Isle_of_Man","Europe/Istanbul","Europe/Jersey",
  "Europe/Kaliningrad","Europe/Kirov","Europe/Kyiv","Europe/Lisbon","Europe/Ljubljana",
  "Europe/London","Europe/Luxembourg","Europe/Madrid","Europe/Malta","Europe/Mariehamn",
  "Europe/Minsk","Europe/Monaco","Europe/Moscow","Europe/Oslo","Europe/Paris",
  "Europe/Podgorica","Europe/Prague","Europe/Riga","Europe/Rome","Europe/Samara",
  "Europe/San_Marino","Europe/Sarajevo","Europe/Saratov","Europe/Simferopol","Europe/Skopje",
  "Europe/Sofia","Europe/Stockholm","Europe/Tallinn","Europe/Tirane","Europe/Ulyanovsk",
  "Europe/Vaduz","Europe/Vatican","Europe/Vienna","Europe/Vilnius","Europe/Volgograd",
  "Europe/Warsaw","Europe/Zagreb","Europe/Zurich",
  "Indian/Antananarivo","Indian/Chagos","Indian/Christmas","Indian/Cocos","Indian/Comoro",
  "Indian/Kerguelen","Indian/Mahe","Indian/Maldives","Indian/Mauritius","Indian/Mayotte",
  "Indian/Reunion",
  "Pacific/Apia","Pacific/Auckland","Pacific/Bougainville","Pacific/Chatham","Pacific/Chuuk",
  "Pacific/Easter","Pacific/Efate","Pacific/Fakaofo","Pacific/Fiji","Pacific/Funafuti",
  "Pacific/Galapagos","Pacific/Gambier","Pacific/Guadalcanal","Pacific/Guam","Pacific/Honolulu",
  "Pacific/Kanton","Pacific/Kiritimati","Pacific/Kosrae","Pacific/Kwajalein","Pacific/Majuro",
  "Pacific/Marquesas","Pacific/Midway","Pacific/Nauru","Pacific/Niue","Pacific/Norfolk",
  "Pacific/Noumea","Pacific/Pago_Pago","Pacific/Palau","Pacific/Pitcairn","Pacific/Pohnpei",
  "Pacific/Port_Moresby","Pacific/Rarotonga","Pacific/Saipan","Pacific/Tahiti","Pacific/Tarawa",
  "Pacific/Tongatapu","Pacific/Wake","Pacific/Wallis",
  "UTC",
]

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
