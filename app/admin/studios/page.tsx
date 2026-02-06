"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCapabilities } from "@/hooks/use-capabilities"
import { Brush, ShieldAlert, Search, RefreshCw, CheckCircle2, XCircle, Gamepad2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { getAllStudiosAdmin, AdminStudio } from "@/lib/admin-api"
import { formatTimestamp } from "@/lib/utils/date-utils"

export default function AllStudiosPage() {
  const router = useRouter()
  const capabilities = useCapabilities()
  const [studios, setStudios] = useState<AdminStudio[]>([])
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

  const loadStudios = async () => {
    try {
      setLoading(true)
      const result = await getAllStudiosAdmin({
        name: nameSearch || undefined,
      })
      setStudios(result.studios)
      setTotalCount(result.count)
      setError(null)
    } catch (err) {
      console.error("Failed to load studios", err)
      setError("Failed to load studios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (capabilities.is_super_admin) {
      loadStudios()
    }
  }, [capabilities.is_super_admin])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setNameSearch(nameFilter)
    loadStudios()
  }

  const handleClearFilters = () => {
    setNameFilter("")
    setNameSearch("")
    loadStudios()
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
            <Brush className="h-8 w-8" />
            All Studios
          </h1>
          <p className="text-muted-foreground">
            {totalCount} studio{totalCount !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStudios}
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
                <label className="text-sm font-medium">Studio Name</label>
                <Input
                  placeholder="Search by studio name..."
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

      {/* Studios Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
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
              <Button variant="outline" className="mt-4" onClick={loadStudios}>
                Try Again
              </Button>
            </div>
          ) : studios.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Brush className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No studios found</p>
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
                    <TableHead>Studio</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Games</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studios.map((studio) => (
                    <TableRow key={studio.id}>
                      <TableCell>
                        <div className="font-medium">{studio.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{studio.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-md truncate">
                          {studio.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{studio.game_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {studio.is_active ? (
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
                        <div className="text-sm">{formatTimestamp(studio.created_at)}</div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/studios/${studio.id}`} className="flex items-center gap-1">
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>
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
