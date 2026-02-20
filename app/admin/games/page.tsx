"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCapabilities } from "@/hooks/use-capabilities"
import {
  Brush,
  CheckCircle2,
  ExternalLink,
  Gamepad2,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { getAllGamesAdmin, AdminGame } from "@/lib/admin-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { AdminGameLimitsDialog } from "@/components/AdminGameLimitsDialog"

export default function AllGamesPage() {
  const router = useRouter()
  const capabilities = useCapabilities()
  const [games, setGames] = useState<AdminGame[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [nameFilter, setNameFilter] = useState("")
  const [nameSearch, setNameSearch] = useState("")

  useEffect(() => {
    if (!capabilities.is_super_admin) {
      router.push("/")
    }
  }, [capabilities, router])

  const loadGames = async (name?: string) => {
    try {
      setLoading(true)
      const result = await getAllGamesAdmin({ name: name || undefined })
      setGames(result.games)
      setTotalCount(result.count)
      setError(null)
    } catch (err) {
      console.error("Failed to load games", err)
      setError("Failed to load games")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (capabilities.is_super_admin) {
      loadGames()
    }
  }, [capabilities.is_super_admin])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setNameSearch(nameFilter)
    loadGames(nameFilter)
  }

  const handleClearFilters = () => {
    setNameFilter("")
    setNameSearch("")
    loadGames("")
  }

  if (!capabilities.is_super_admin) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              You don't have permission to access this page. Super admin privileges required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gamepad2 className="h-8 w-8" />
            All Games
          </h1>
          <p className="text-muted-foreground">
            {totalCount} game{totalCount !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadGames(nameSearch)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search Filters */}
      <form onSubmit={handleSearch} className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Game Name</label>
                <Input
                  placeholder="Search by game name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              {nameSearch && (
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Games Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => loadGames(nameSearch)}>
                Try Again
              </Button>
            </div>
          ) : games.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No games found</p>
              {nameSearch && (
                <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        <div className="font-medium">{game.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{game.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {game.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Brush className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          {game.studio_name ? (
                            <Link
                              href={`/studios/${game.studio_id}`}
                              className="hover:underline truncate max-w-[140px]"
                            >
                              {game.studio_name}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">
                              {game.studio_id}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {game.is_active ? (
                          <Badge variant="default" className="w-fit">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="w-fit">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatTimestamp(game.created_at)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AdminGameLimitsDialog game={game} />
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/games/${game.id}`} className="flex items-center gap-1">
                              <ExternalLink className="h-3.5 w-3.5" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
