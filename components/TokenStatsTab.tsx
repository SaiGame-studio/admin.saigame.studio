"use client"

import { useState, useCallback } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  getLLMTokenStats,
  getAllUsersAdmin,
  type AdminUser,
  type LLMTokenStatsBucket,
  type LLMTokenStatsFilterMode,
  type LLMTokenStatsPeriod,
  type LLMTokenStatsResult,
} from "@/lib/admin-api"
import { getGame } from "@/lib/game-api"
import { fetchStudio } from "@/lib/studio-api"
import type { Game } from "@/types/game"
import type { Studio } from "@/types/studio"
import Link from "next/link"
import { Search, Loader2, ExternalLink, User, Gamepad2, Building2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const tokenStatsChartConfig: ChartConfig = {
  input: { label: "Input", color: "hsl(var(--chart-1))" },
  output: { label: "Output", color: "hsl(var(--chart-2))" },
}

// ---------------------------------------------------------------------------
// Helper: format bucket label
// ---------------------------------------------------------------------------

function formatBucketLabel(isoDate: string, period: LLMTokenStatsPeriod): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  if (period === "hourly") {
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  if (period === "daily") return d.toLocaleDateString("en-GB")
  if (period === "weekly") {
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
    return `W${week} ${d.getFullYear()}`
  }
  if (period === "monthly") {
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
  }
  return isoDate
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

function SummaryCards({
  result,
  t,
}: {
  result: LLMTokenStatsResult
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <div id="token-stats-summary-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card id="token-stats-summary-input">
        <CardContent className="pt-4">
          <p id="token-stats-summary-input-label" className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("tokenStats.inputTokens")}
          </p>
          <p id="token-stats-summary-input-value" className="text-2xl font-bold">
            {result.total_input_tokens.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card id="token-stats-summary-output">
        <CardContent className="pt-4">
          <p id="token-stats-summary-output-label" className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("tokenStats.outputTokens")}
          </p>
          <p id="token-stats-summary-output-value" className="text-2xl font-bold">
            {result.total_output_tokens.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card id="token-stats-summary-total">
        <CardContent className="pt-4">
          <p id="token-stats-summary-total-label" className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("tokenStats.totalTokens")}
          </p>
          <p id="token-stats-summary-total-value" className="text-2xl font-bold">
            {result.total_tokens.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

function TokenStatsChart({
  buckets,
  period,
  t,
}: {
  buckets: LLMTokenStatsBucket[]
  period: LLMTokenStatsPeriod
  t: ReturnType<typeof useTranslation>["t"]
}) {
  const chartData = [...buckets].reverse().map((b) => ({
    label: formatBucketLabel(b.label, period),
    input: b.input_tokens,
    output: b.output_tokens,
  }))

  return (
    <Card id="token-stats-chart-card">
      <CardHeader id="token-stats-chart-header">
        <CardTitle id="token-stats-chart-title" className="text-base">
          {t("tokenStats.chartTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent id="token-stats-chart-content">
        <ChartContainer id="token-stats-chart-container" config={tokenStatsChartConfig} className="h-[320px] w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="input" fill="var(--color-input)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="output" fill="var(--color-output)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function TokenStatsTable({
  buckets,
  period,
  t,
}: {
  buckets: LLMTokenStatsBucket[]
  period: LLMTokenStatsPeriod
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Card id="token-stats-table-card">
      <CardHeader id="token-stats-table-header">
        <CardTitle id="token-stats-table-title" className="text-base">
          {t("tokenStats.tableTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent id="token-stats-table-content">
        <Table id="token-stats-table">
          <TableHeader id="token-stats-table-head">
            <TableRow id="token-stats-table-head-row">
              <TableHead id="token-stats-col-bucket">{t("tokenStats.colBucket")}</TableHead>
              <TableHead id="token-stats-col-input" className="text-right">{t("tokenStats.colInput")}</TableHead>
              <TableHead id="token-stats-col-output" className="text-right">{t("tokenStats.colOutput")}</TableHead>
              <TableHead id="token-stats-col-total" className="text-right">{t("tokenStats.colTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody id="token-stats-table-body">
            {buckets.map((b, idx) => (
              <TableRow id={`token-stats-row-${idx}`} key={b.label}>
                <TableCell id={`token-stats-row-${idx}-bucket`} className="font-mono text-xs">
                  {formatBucketLabel(b.label, period)}
                </TableCell>
                <TableCell id={`token-stats-row-${idx}-input`} className="text-right">
                  {b.input_tokens.toLocaleString()}
                </TableCell>
                <TableCell id={`token-stats-row-${idx}-output`} className="text-right">
                  {b.output_tokens.toLocaleString()}
                </TableCell>
                <TableCell id={`token-stats-row-${idx}-total`} className="text-right font-medium">
                  {b.total_tokens.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Entity detail types
// ---------------------------------------------------------------------------

type EntityDetailState =
  | { mode: "user_id"; user: AdminUser }
  | { mode: "game_id"; game: Game }
  | { mode: "studio_id"; studio: Studio }

// ---------------------------------------------------------------------------
// Entity detail card
// ---------------------------------------------------------------------------

function EntityDetailCard({
  detail,
  t,
}: {
  detail: EntityDetailState
  t: ReturnType<typeof useTranslation>["t"]
}) {
  if (detail.mode === "user_id") {
    const { user } = detail
    return (
      <Card id="token-stats-entity-card">
        <CardHeader id="token-stats-entity-header" className="pb-3">
          <CardTitle id="token-stats-entity-title" className="text-base flex items-center gap-2">
            <User id="token-stats-entity-icon" className="h-4 w-4 text-muted-foreground" />
            {t("tokenStats.entityDetailTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent id="token-stats-entity-content">
          <div id="token-stats-entity-user-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div id="token-stats-entity-user-displayname">
              <p id="token-stats-entity-user-displayname-label" className="text-xs text-muted-foreground">{t("tokenStats.entityDisplayName")}</p>
              <p id="token-stats-entity-user-displayname-val" className="font-medium">{user.display_name || "—"}</p>
            </div>
            <div id="token-stats-entity-user-username">
              <p id="token-stats-entity-user-username-label" className="text-xs text-muted-foreground">{t("tokenStats.entityUsername")}</p>
              <p id="token-stats-entity-user-username-val" className="font-mono">{user.username || "—"}</p>
            </div>
            <div id="token-stats-entity-user-email">
              <p id="token-stats-entity-user-email-label" className="text-xs text-muted-foreground">{t("tokenStats.entityEmail")}</p>
              <p id="token-stats-entity-user-email-val" className="font-mono text-xs truncate">{user.email || "—"}</p>
            </div>
            <div id="token-stats-entity-user-status">
              <p id="token-stats-entity-user-status-label" className="text-xs text-muted-foreground">{t("tokenStats.entityActive")}</p>
              <Badge id="token-stats-entity-user-status-badge" variant={user.is_active ? "default" : "secondary"}>
                {user.is_active ? t("tokenStats.entityActive") : t("tokenStats.entityInactive")}
              </Badge>
            </div>
            <div id="token-stats-entity-user-verified">
              <p id="token-stats-entity-user-verified-label" className="text-xs text-muted-foreground">{t("tokenStats.entityVerified")}</p>
              <Badge id="token-stats-entity-user-verified-badge" variant={user.is_verified ? "default" : "outline"}>
                {user.is_verified ? t("tokenStats.entityVerified") : t("tokenStats.entityUnverified")}
              </Badge>
            </div>
            <div id="token-stats-entity-user-lastlogin">
              <p id="token-stats-entity-user-lastlogin-label" className="text-xs text-muted-foreground">{t("tokenStats.entityLastLogin")}</p>
              <p id="token-stats-entity-user-lastlogin-val" className="text-xs">
                {user.last_login_at ? new Date(user.last_login_at).toLocaleString("en-GB") : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (detail.mode === "game_id") {
    const { game } = detail
    return (
      <Card id="token-stats-entity-card">
        <CardHeader id="token-stats-entity-header" className="pb-3">
          <CardTitle id="token-stats-entity-title" className="text-base flex items-center gap-2">
            <Gamepad2 id="token-stats-entity-icon" className="h-4 w-4 text-muted-foreground" />
            {t("tokenStats.entityDetailTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent id="token-stats-entity-content">
          <div id="token-stats-entity-game-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div id="token-stats-entity-game-name">
              <p id="token-stats-entity-game-name-label" className="text-xs text-muted-foreground">{t("tokenStats.entityName")}</p>
              <p id="token-stats-entity-game-name-val" className="font-medium">{game.name}</p>
            </div>
            <div id="token-stats-entity-game-type">
              <p id="token-stats-entity-game-type-label" className="text-xs text-muted-foreground">{t("tokenStats.entityGameType")}</p>
              <p id="token-stats-entity-game-type-val" className="font-mono text-xs">{game.game_type || "—"}</p>
            </div>
            <div id="token-stats-entity-game-studio">
              <p id="token-stats-entity-game-studio-label" className="text-xs text-muted-foreground">{t("tokenStats.entityStudioRef")}</p>
              <Link id="token-stats-entity-game-studio-link" href={`/studios/${game.studio_id}`} className="text-xs font-mono hover:underline flex items-center gap-1">
                <ExternalLink id="token-stats-entity-game-studio-icon" className="h-3 w-3" />
                {game.studio_id}
              </Link>
            </div>
            <div id="token-stats-entity-game-status">
              <p id="token-stats-entity-game-status-label" className="text-xs text-muted-foreground">{t("tokenStats.entityActive")}</p>
              <Badge id="token-stats-entity-game-status-badge" variant={game.is_active ? "default" : "secondary"}>
                {game.is_active ? t("tokenStats.entityActive") : t("tokenStats.entityInactive")}
              </Badge>
            </div>
            <div id="token-stats-entity-game-created">
              <p id="token-stats-entity-game-created-label" className="text-xs text-muted-foreground">{t("tokenStats.entityCreatedAt")}</p>
              <p id="token-stats-entity-game-created-val" className="text-xs">
                {game.created_at ? new Date(game.created_at * 1000).toLocaleDateString("en-GB") : "—"}
              </p>
            </div>
            <div id="token-stats-entity-game-view">
              <p id="token-stats-entity-game-view-label" className="text-xs text-muted-foreground">&nbsp;</p>
              <Link id="token-stats-entity-game-view-link" href={`/games/${game.id}`} className="text-xs flex items-center gap-1 hover:underline text-primary">
                <ExternalLink id="token-stats-entity-game-view-icon" className="h-3 w-3" />
                {t("tokenStats.entityViewLink")}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // studio_id
  const { studio } = detail
  return (
    <Card id="token-stats-entity-card">
      <CardHeader id="token-stats-entity-header" className="pb-3">
        <CardTitle id="token-stats-entity-title" className="text-base flex items-center gap-2">
          <Building2 id="token-stats-entity-icon" className="h-4 w-4 text-muted-foreground" />
          {t("tokenStats.entityDetailTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent id="token-stats-entity-content">
        <div id="token-stats-entity-studio-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <div id="token-stats-entity-studio-name">
            <p id="token-stats-entity-studio-name-label" className="text-xs text-muted-foreground">{t("tokenStats.entityName")}</p>
            <p id="token-stats-entity-studio-name-val" className="font-medium">{studio.name}</p>
          </div>
          <div id="token-stats-entity-studio-tier">
            <p id="token-stats-entity-studio-tier-label" className="text-xs text-muted-foreground">{t("tokenStats.entityTier")}</p>
            <p id="token-stats-entity-studio-tier-val" className="font-mono text-xs">{studio.tier || "—"}</p>
          </div>
          <div id="token-stats-entity-studio-gamecount">
            <p id="token-stats-entity-studio-gamecount-label" className="text-xs text-muted-foreground">{t("tokenStats.entityGameCount")}</p>
            <p id="token-stats-entity-studio-gamecount-val" className="font-medium">{studio.game_count}</p>
          </div>
          <div id="token-stats-entity-studio-owner">
            <p id="token-stats-entity-studio-owner-label" className="text-xs text-muted-foreground">{t("tokenStats.entityOwnerID")}</p>
            <p id="token-stats-entity-studio-owner-val" className="font-mono text-xs truncate">{studio.owner_user_id}</p>
          </div>
          <div id="token-stats-entity-studio-status">
            <p id="token-stats-entity-studio-status-label" className="text-xs text-muted-foreground">{t("tokenStats.entityActive")}</p>
            <Badge id="token-stats-entity-studio-status-badge" variant={studio.is_active ? "default" : "secondary"}>
              {studio.is_active ? t("tokenStats.entityActive") : t("tokenStats.entityInactive")}
            </Badge>
          </div>
          <div id="token-stats-entity-studio-view">
            <p id="token-stats-entity-studio-view-label" className="text-xs text-muted-foreground">&nbsp;</p>
            <Link id="token-stats-entity-studio-view-link" href={`/studios/${studio.id}`} className="text-xs flex items-center gap-1 hover:underline text-primary">
              <ExternalLink id="token-stats-entity-studio-view-icon" className="h-3 w-3" />
              {t("tokenStats.entityViewLink")}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main exported tab
// ---------------------------------------------------------------------------

export function TokenStatsTab() {
  const { t } = useTranslation()

  const [filterMode, setFilterMode] = useState<LLMTokenStatsFilterMode>("game_id")
  const [period, setPeriod] = useState<LLMTokenStatsPeriod>("daily")
  const [idValue, setIdValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LLMTokenStatsResult | null>(null)
  const [entityDetail, setEntityDetail] = useState<EntityDetailState | null>(null)

  const handleSearch = useCallback(async () => {
    const trimmedId = idValue.trim()

    if (!period) {
      setError(t("tokenStats.errorMissingPeriod"))
      return
    }
    if (!trimmedId) {
      setError(t("tokenStats.errorMissingFilter"))
      return
    }
    if (!UUID_REGEX.test(trimmedId)) {
      setError(t("tokenStats.errorInvalidUUID"))
      return
    }

    setError(null)
    setResult(null)
    setEntityDetail(null)
    setLoading(true)
    try {
      const [statsResult, entityResult] = await Promise.allSettled([
        getLLMTokenStats(period, filterMode, trimmedId),
        (async (): Promise<EntityDetailState | null> => {
          if (filterMode === "user_id") {
            const res = await getAllUsersAdmin({ id: trimmedId, page_size: 1 })
            if (res.users.length > 0) return { mode: "user_id", user: res.users[0] }
            return null
          }
          if (filterMode === "game_id") {
            const game = await getGame(trimmedId)
            return { mode: "game_id", game }
          }
          if (filterMode === "studio_id") {
            const studio = await fetchStudio(trimmedId)
            return { mode: "studio_id", studio }
          }
          return null
        })(),
      ])

      if (statsResult.status === "fulfilled") {
        setResult(statsResult.value)
      } else {
        setError(String(statsResult.reason))
      }

      if (entityResult.status === "fulfilled" && entityResult.value) {
        setEntityDetail(entityResult.value)
      }
    } finally {
      setLoading(false)
    }
  }, [period, filterMode, idValue, t])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSearch()
    },
    [handleSearch]
  )

  return (
    <div id="token-stats-tab-root" className="space-y-6">
      {/* Page header */}
      <div id="token-stats-tab-header">
        <h2 id="token-stats-tab-title" className="text-lg font-semibold">
          {t("tokenStats.title")}
        </h2>
        <p id="token-stats-tab-desc" className="text-sm text-muted-foreground">
          {t("tokenStats.description")}
        </p>
      </div>

      {/* Filter bar */}
      <Card id="token-stats-filter-card">
        <CardContent id="token-stats-filter-content" className="pt-6">
          <div id="token-stats-filter-row" className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            {/* Filter mode */}
            <div id="token-stats-filter-mode-group" className="space-y-2">
              <Label id="token-stats-filter-mode-label" className="text-xs font-medium uppercase tracking-wide">
                {t("tokenStats.filterMode")}
              </Label>
              <RadioGroup
                id="token-stats-filter-mode-radio"
                value={filterMode}
                onValueChange={(v) => {
                  setFilterMode(v as LLMTokenStatsFilterMode)
                  setResult(null)
                  setError(null)
                  setEntityDetail(null)
                }}
                className="flex gap-4"
              >
                <div id="token-stats-filter-mode-studio" className="flex items-center gap-1.5">
                  <RadioGroupItem id="token-stats-radio-studio" value="studio_id" />
                  <Label id="token-stats-radio-studio-label" htmlFor="token-stats-radio-studio">
                    {t("tokenStats.filterStudio")}
                  </Label>
                </div>
                <div id="token-stats-filter-mode-game" className="flex items-center gap-1.5">
                  <RadioGroupItem id="token-stats-radio-game" value="game_id" />
                  <Label id="token-stats-radio-game-label" htmlFor="token-stats-radio-game">
                    {t("tokenStats.filterGame")}
                  </Label>
                </div>
                <div id="token-stats-filter-mode-user" className="flex items-center gap-1.5">
                  <RadioGroupItem id="token-stats-radio-user" value="user_id" />
                  <Label id="token-stats-radio-user-label" htmlFor="token-stats-radio-user">
                    {t("tokenStats.filterUser")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Period */}
            <div id="token-stats-period-group" className="space-y-2">
              <Label id="token-stats-period-label" className="text-xs font-medium uppercase tracking-wide">
                {t("tokenStats.period")}
              </Label>
              <Select
                value={period}
                onValueChange={(v) => {
                  setPeriod(v as LLMTokenStatsPeriod)
                  setResult(null)
                  setError(null)
                }}
              >
                <SelectTrigger id="token-stats-period-trigger" className="w-36">
                  <SelectValue id="token-stats-period-value" />
                </SelectTrigger>
                <SelectContent id="token-stats-period-content">
                  <SelectItem id="token-stats-period-hourly" value="hourly">
                    {t("tokenStats.periodHourly")}
                  </SelectItem>
                  <SelectItem id="token-stats-period-daily" value="daily">
                    {t("tokenStats.periodDaily")}
                  </SelectItem>
                  <SelectItem id="token-stats-period-weekly" value="weekly">
                    {t("tokenStats.periodWeekly")}
                  </SelectItem>
                  <SelectItem id="token-stats-period-monthly" value="monthly">
                    {t("tokenStats.periodMonthly")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* UUID input + search */}
            <div id="token-stats-id-group" className="flex-1 space-y-2">
              <Label id="token-stats-id-label" className="text-xs font-medium uppercase tracking-wide">
                ID
              </Label>
              <div id="token-stats-id-row" className="flex gap-2">
                <Input
                  id="token-stats-id-input"
                  placeholder={t("tokenStats.idPlaceholder")}
                  value={idValue}
                  onChange={(e) => {
                    setIdValue(e.target.value)
                    setError(null)
                    setEntityDetail(null)
                  }}
                  onKeyDown={handleKeyDown}
                  className="font-mono text-sm"
                />
                <Button
                  id="token-stats-search-btn"
                  onClick={handleSearch}
                  disabled={loading}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  {loading ? (
                    <Loader2 id="token-stats-search-spinner" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search id="token-stats-search-icon" className="h-4 w-4" />
                  )}
                  {t("tokenStats.searchBtn")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card id="token-stats-error-card" className="border-destructive/50">
          <CardContent id="token-stats-error-content" className="pt-4 text-destructive text-sm">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div id="token-stats-skeleton-root" className="space-y-4">
          <div id="token-stats-skeleton-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton id="token-stats-skeleton-card-1" className="h-20" />
            <Skeleton id="token-stats-skeleton-card-2" className="h-20" />
            <Skeleton id="token-stats-skeleton-card-3" className="h-20" />
          </div>
          <Skeleton id="token-stats-skeleton-chart" className="h-[320px] w-full" />
          <Skeleton id="token-stats-skeleton-table" className="h-48 w-full" />
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div id="token-stats-results-root" className="space-y-6">
          {entityDetail && (
            <EntityDetailCard detail={entityDetail} t={t} />
          )}
          <SummaryCards result={result} t={t} />

          {result.buckets.length === 0 ? (
            <Card id="token-stats-no-data-card">
              <CardContent id="token-stats-no-data-content" className="pt-4 text-muted-foreground text-sm">
                {t("tokenStats.noData")}
              </CardContent>
            </Card>
          ) : (
            <>
              <TokenStatsChart buckets={result.buckets} period={result.period} t={t} />
              <TokenStatsTable buckets={result.buckets} period={result.period} t={t} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
