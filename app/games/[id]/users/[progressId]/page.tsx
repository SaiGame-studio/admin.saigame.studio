"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Coins, Loader2, RefreshCw, ShieldBan, ShieldCheck, Star, Trophy, User } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { getGame } from "@/lib/game-api"
import { banProgress, getGameProgressDetail, getGameProgressList, GameProgressDetail, getPlayerIdentityMapByUserIds, PlayerIdentity, unbanProgress } from "@/lib/game-user-api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useTranslation } from "@/lib/i18n/useTranslation"

export default function GameUserProgressDetailPage({
  params,
}: {
  params: { id: string; progressId: string }
}) {
  const gameId = params.id
  const progressId = params.progressId
  const router = useRouter()
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  const [game, setGame] = useState<any>(null)
  const [detail, setDetail] = useState<GameProgressDetail | null>(null)
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmittingBan, setIsSubmittingBan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [gameRes, detailRes, progressRes] = await Promise.all([
        getGame(gameId),
        getGameProgressDetail(progressId),
        getGameProgressList(gameId),
      ])
      const listItem = progressRes.progress.find((item) => item.id === progressId)
      const mergedDetail: GameProgressDetail = {
        ...detailRes,
        user_display_name: detailRes.user_display_name ?? listItem?.user_display_name,
        user_email: detailRes.user_email ?? listItem?.user_email,
        user_created_at: detailRes.user_created_at ?? listItem?.user_created_at,
        banned_at: detailRes.banned_at ?? listItem?.banned_at ?? null,
        banned_by: detailRes.banned_by ?? listItem?.banned_by ?? null,
      }
      const identityMap = await getPlayerIdentityMapByUserIds(
        [mergedDetail.user_id],
        [{
          user_id: mergedDetail.user_id,
          user_display_name: mergedDetail.user_display_name,
          user_email: mergedDetail.user_email,
        }]
      )
      setGame(gameRes)
      setDetail(mergedDetail)
      setIdentity(identityMap[mergedDetail.user_id] || null)
      setError(null)
    } catch (err) {
      console.error(err)
      setError("Failed to load player detail")
    } finally {
      setLoading(false)
    }
  }, [gameId, progressId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const renderMetaRow = (label: string, value?: string | number | null) => (
    <div className="flex items-start justify-between gap-4 border-b pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-all">{value ?? "-"}</span>
    </div>
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push(`/games/${gameId}/users`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back")}
        </Button>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {game && (
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href={`/studios/${game.studio?.id}`}>{game.studio?.name || t("common.studio")}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${game.id}`}>{game.name}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${game.id}/users`}>Players</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>{detail?.user_display_name || "Player detail"}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-52" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(8)].map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : error || !detail ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t("common.error")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>{error || "Player detail not found"}</p>
            <Button variant="outline" onClick={loadData}>Try Again</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {identity?.display_name || detail.user_display_name || "Unknown"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {detail.banned_at && <Badge variant="destructive">Banned</Badge>}
                  <Badge variant="secondary">v{detail.version}</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant={detail.banned_at ? "outline" : "destructive"}
                        size="sm"
                        disabled={isSubmittingBan}
                      >
                        {isSubmittingBan ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : detail.banned_at ? (
                          <><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Unban</>
                        ) : (
                          <><ShieldBan className="h-3.5 w-3.5 mr-1" /> Ban</>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {detail.banned_at ? "Unban" : "Ban"} player?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to {detail.banned_at ? "unban" : "ban"}{" "}
                          <strong>{identity?.display_name || detail.user_display_name || "this player"}</strong>?
                          {!detail.banned_at && " This player will no longer be able to access the game."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className={!detail.banned_at ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                          onClick={async () => {
                            setIsSubmittingBan(true)
                            try {
                              if (detail.banned_at) {
                                await unbanProgress(detail.id)
                              } else {
                                await banProgress(detail.id)
                              }

                              setDetail((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      banned_at: prev.banned_at ? null : new Date().toISOString(),
                                    }
                                  : prev
                              )
                            } catch (err) {
                              console.error("Ban/unban failed", err)
                            } finally {
                              setIsSubmittingBan(false)
                            }
                          }}
                        >
                          {detail.banned_at ? "Unban" : "Ban"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{identity?.masked_email || "***@saigame.studio"}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {renderMetaRow("Gamer Name", identity?.gamer_name || "-")}
              {renderMetaRow("Progress ID", detail.id)}
              {renderMetaRow("User ID", detail.user_id)}
              {renderMetaRow("Game ID", detail.game_id)}
              {renderMetaRow("User Created", detail.user_created_at ? formatTimestamp(detail.user_created_at) : "-")}
              {renderMetaRow("Created", formatTimestamp(detail.created_at))}
              {renderMetaRow("Updated", formatTimestamp(detail.updated_at))}
              {renderMetaRow("Banned At", detail.banned_at || "-")}
              {renderMetaRow("Banned By", detail.banned_by || "-")}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Star className="h-4 w-4 text-yellow-500" />Level</span>
                  <span className="font-semibold">{detail.level}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Trophy className="h-4 w-4 text-blue-500" />EXP</span>
                  <span className="font-semibold">{detail.experience}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Coins className="h-4 w-4 text-amber-500" />Gold</span>
                  <span className="font-semibold">{detail.gold}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Game Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(detail.game_data ?? {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
