"use client"

import { Fragment, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCapabilities } from "@/hooks/use-capabilities"
import { Users, ShieldAlert, Search, RefreshCw, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, Globe, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { getAllUsersAdmin, AdminUser } from "@/lib/admin-api"
import { formatTimestamp, formatISODate } from "@/lib/utils/date-utils"
import { CopyButton } from "@/components/CopyButton"

export default function AllUsersPage() {
  const router = useRouter()
  const capabilities = useCapabilities()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [emailFilter, setEmailFilter] = useState("")
  const [usernameFilter, setUsernameFilter] = useState("")
  const [displayNameFilter, setDisplayNameFilter] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [emailSearch, setEmailSearch] = useState("")
  const [usernameSearch, setUsernameSearch] = useState("")
  const [displayNameSearch, setDisplayNameSearch] = useState("")

  useEffect(() => {
    if (!capabilities.is_super_admin) {
      router.push("/")
    }
  }, [capabilities, router])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const result = await getAllUsersAdmin({
        email: emailSearch || undefined,
        username: usernameSearch || undefined,
        display_name: displayNameSearch || undefined,
      })
      setUsers(result.users)
      setTotalCount(result.total_count)
      setError(null)
    } catch (err) {
      console.error("Failed to load users", err)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (capabilities.is_super_admin) {
      loadUsers()
    }
  }, [capabilities.is_super_admin])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailSearch(emailFilter)
    setUsernameSearch(usernameFilter)
    setDisplayNameSearch(displayNameFilter)
    loadUsers()
  }

  const handleClearFilters = () => {
    setEmailFilter("")
    setUsernameFilter("")
    setDisplayNameFilter("")
    setEmailSearch("")
    setUsernameSearch("")
    setDisplayNameSearch("")
    loadUsers()
  }

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatGeoTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString()
  }

  const renderGeoInfo = (label: string, geo: Record<string, unknown>) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div className="space-y-1 text-sm">
        <div className="font-medium">{label}</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
          <span>IP: <span className="font-mono text-foreground">{String(geo.ip)}</span></span>
          <span>City: <span className="text-foreground">{String(geo.city_name)}</span></span>
          <span>Country: <span className="text-foreground">{String(geo.country_name)} ({String(geo.country_code)})</span></span>
          <span>Continent: <span className="text-foreground">{String(geo.continent_code)}</span></span>
          {geo.detected_at && <span>Detected: <span className="text-foreground">{formatGeoTimestamp(geo.detected_at as number)}</span></span>}
        </div>
      </div>
    </div>
  )

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
            <Users className="h-8 w-8" />
            All Users
          </h1>
          <p className="text-muted-foreground">
            {totalCount} user{totalCount !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadUsers}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  placeholder="Search by email..."
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  placeholder="Search by username..."
                  value={usernameFilter}
                  onChange={(e) => setUsernameFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  placeholder="Search by display name..."
                  value={displayNameFilter}
                  onChange={(e) => setDisplayNameFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              {(emailSearch || usernameSearch || displayNameSearch) && (
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadUsers}>
                Try Again
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
              {(emailSearch || usernameSearch || displayNameSearch) && (
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
                    <TableHead className="w-8"></TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isExpanded = expandedRows.has(user.id)
                    const customData = user.custom_data || {}
                    const registeredGeo = customData.registered_geo as Record<string, unknown> | undefined
                    const lastLoginGeo = customData.last_login_geo as Record<string, unknown> | undefined
                    const googleAuth = customData.google_auth as Record<string, unknown> | undefined

                    return (
                      <Fragment key={user.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(user.id)}
                        >
                          <TableCell className="w-8 px-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-1.5">
                                {user.display_name}
                                {lastLoginGeo?.country_code ? (
                                  <img
                                    src={`https://flagcdn.com/16x12/${String(lastLoginGeo.country_code).toLowerCase()}.png`}
                                    alt={String(lastLoginGeo.country_name)}
                                    title={`${String(lastLoginGeo.city_name)}, ${String(lastLoginGeo.country_name)}`}
                                    className="inline-block"
                                    width={16}
                                    height={12}
                                  />
                                ) : (
                                  <Globe className="h-4 w-4 text-muted-foreground" title="Unknown location" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">{user.username}</div>
                              <div className="text-xs text-muted-foreground font-mono flex items-center">{user.id}<CopyButton text={user.id} /></div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{user.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {user.is_active ? (
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
                              {user.is_verified ? (
                                <Badge variant="outline" className="w-fit text-xs">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="w-fit text-xs text-muted-foreground">
                                  Unverified
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {user.last_login_at ? formatISODate(user.last_login_at) : "Never"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatTimestamp(user.created_at)}</div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Globe className="h-4 w-4" />
                                  User Details
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {registeredGeo && renderGeoInfo("Registered Location", registeredGeo)}
                                  {lastLoginGeo && renderGeoInfo("Last Login Location", lastLoginGeo)}
                                </div>
                                {googleAuth && (
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-sm font-medium mb-2">Google Auth</div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                      <span>Name: <span className="text-foreground">{String(googleAuth.name)}</span></span>
                                      <span>Email: <span className="text-foreground">{String(googleAuth.email)}</span></span>
                                      {googleAuth.last_login_at && (
                                        <span>Last Login: <span className="text-foreground">{formatGeoTimestamp(googleAuth.last_login_at as number)}</span></span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  Updated: {formatTimestamp(user.updated_at)}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
