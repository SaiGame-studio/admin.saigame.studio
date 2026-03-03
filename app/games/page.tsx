"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getAllGames } from "@/lib/game-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import type { Game } from "@/types/game"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Gamepad2, ArrowRight, RefreshCw, ExternalLink, ChevronDown, X } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function GamesPage() {
  const router = useRouter()
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [studioNames, setStudioNames] = useState<Record<string, { id: string; name: string }>>({})

  // Available status options
  const statusOptions = [
    { value: "released", label: t('games.statusReleased') },
    { value: "beta", label: t('games.statusBeta') },
    { value: "alpha", label: t('games.statusAlpha') },
    { value: "development", label: t('games.statusDevelopment') },
    { value: "archived", label: t('games.statusArchived') }
  ]

  // Filter games based on status
  const filteredGames = statusFilter.length === 0 
    ? games 
    : games.filter(game => statusFilter.includes(game.status.toLowerCase()))

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter([])
  }

  // Load studio names for games that don't have studio info embedded
  async function loadStudioNames(gamesData: Game[]) {
    const studioIds = [...new Set(gamesData.filter(g => g.studio_id && !g.studio?.name).map(g => g.studio_id))]
    if (studioIds.length === 0) return

    const names: Record<string, { id: string; name: string }> = {}
    await Promise.all(
      studioIds.map(async (studioId) => {
        try {
          const studio = await fetchStudioWithCache(studioId)
          names[studioId] = { id: studio.id, name: studio.name }
        } catch (err) {
          console.error(`Failed to load studio ${studioId}`, err)
        }
      })
    )
    setStudioNames(prev => ({ ...prev, ...names }))
  }

  useEffect(() => {
    async function loadGames() {
      try {
        setLoading(true)
        const gamesData = await getAllGames()
        setGames(gamesData)
        setError(null)
        loadStudioNames(gamesData)
      } catch (err) {
        setError(t('games.loadError'))
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadGames();
  }, [])

  const refreshGames = async () => {
    try {
      setLoading(true)
      const gamesData = await getAllGames()
      setGames(gamesData)
      setError(null)
      loadStudioNames(gamesData)
    } catch (err) {
      setError(t('games.refreshError'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case "released":
        return "bg-green-500"
      case "beta":
        return "bg-blue-500"
      case "alpha":
        return "bg-purple-500"
      case "development":
        return "bg-yellow-500"
      case "archived":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('games.title')}</h1>
          <p className="">{t('games.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/games/new">{t('games.createGame')}</Link>
          </Button>
          <Button onClick={refreshGames} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {t('games.refresh')}
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm font-medium">{t('games.filterByStatus')}:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {statusFilter.length > 0 ? t('games.selectedStatuses') : t('games.selectStatus')}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px]">
            <div className="flex flex-col gap-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={statusFilter.includes(option.value)}
                    onCheckedChange={(checked) => toggleStatusFilter(option.value)}
                  />
                  <label
                    htmlFor={option.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {statusFilter.length > 0 && (
          <span className="text-sm ">
            {t('games.showingGames')}: {filteredGames.length} / {games.length}
          </span>
        )}
      </div>

      {/* Active Filters */}
      {statusFilter.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{t('games.activeFilters')}:</span>
          {statusFilter.map((status) => {
            const statusOption = statusOptions.find(opt => opt.value === status)
            return (
              <Badge key={status} variant="secondary" className="flex items-center gap-1">
                {statusOption?.label}
                <X 
                  className="h-3 w-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground rounded-full" 
                  onClick={() => toggleStatusFilter(status)}
                />
              </Badge>
            )
          })}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
            {t('games.clearAll')}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50 rounded-t-lg" />
              <CardContent className="p-6">
                <div className="h-4 w-3/4 bg-muted/50 rounded mb-4" />
                <div className="h-4 w-1/2 bg-muted/50 rounded" />
              </CardContent>
              <CardFooter className="bg-muted/20 h-12 rounded-b-lg" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.error')}</CardTitle>
            <CardDescription>{t('games.loadErrorDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={refreshGames}>
              {t('games.tryAgain')}
            </Button>
          </CardFooter>
        </Card>
      ) : games.length === 0 ? (
        <Card className="text-center p-6">
          <CardHeader>
            <Gamepad2 className="mx-auto h-12 w-12 " />
            <CardTitle className="mt-4">{t('games.noGamesFound')}</CardTitle>
            <CardDescription>{t('games.noGamesDesc')}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/studios">{t('games.goToStudios')}</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : filteredGames.length === 0 ? (
        <Card className="text-center p-6">
          <CardHeader>
            <Gamepad2 className="mx-auto h-12 w-12 " />
            <CardTitle className="mt-4">{t('games.noFilteredGames')}</CardTitle>
            <CardDescription>{t('games.noFilteredGamesDesc')}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={clearAllFilters}>
              {t('games.clearFilter')}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => (
            <Card key={game.id} className="overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex flex-col space-y-2">
                  <CardTitle className="text-xl">
                    <Link href={`/games/${game.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                      {game.name}
                      <ExternalLink className="w-4 h-4 " />
                    </Link>
                  </CardTitle>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm ">{t('games.status')}:</span>
                      <Badge className={getStatusColor(game.status)}>{game.status}</Badge>
                    </div>
                    {game.tier && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm ">{t('games.tier')}:</span>
                        <span className="text-sm ">{game.tier}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/games/${game.id}`}>{t('games.viewDetails')}</Link>
                </Button>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-col gap-1 text-sm ">
                  <span>{t('games.studio')}: {game.studio?.name && game.studio?.id ? (
                    <Link href={`/studios/${game.studio.id}`} className="inline-flex items-center gap-1 hover:text-primary font-semibold">
                      {game.studio.name}
                      <ExternalLink className="w-3 h-3 " />
                    </Link>
                  ) : studioNames[game.studio_id] ? (
                    <Link href={`/studios/${studioNames[game.studio_id].id}`} className="inline-flex items-center gap-1 hover:text-primary font-semibold">
                      {studioNames[game.studio_id].name}
                      <ExternalLink className="w-3 h-3 " />
                    </Link>
                  ) : game.studio_id ? (
                    <span className="font-semibold text-muted-foreground">...</span>
                  ) : (
                    <span className="font-semibold">-</span>
                  )}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
