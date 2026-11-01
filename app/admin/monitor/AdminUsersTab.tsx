"use client";
import { Fragment, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, RefreshCw, Search, MapPin, Globe, BadgeCheck, XCircle, Clock, ChevronRight, ChevronDown, ChevronLeft } from "lucide-react";
import { getAllUsersAdmin, updateUserActiveStatus, type AdminUser } from "@/lib/admin-api";
import { formatTimestamp, formatISODate } from "@/lib/utils/date-utils";
import { CopyButton } from "@/components/CopyButton";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useAdminUserTwoFactor } from "@/hooks/use-admin-user-two-factor";
import { AdminDuplicateUsersPanel } from "./AdminDuplicateUsersPanel";
import { AdminUserTwoFactorToggle } from "./AdminUserTwoFactorToggle";
const USERS_PAGE_SIZE = 20;
export function AdminUsersTab() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const { t } = useTranslation();
    const twoFactor = useAdminUserTwoFactor(users);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [idFilter, setIdFilter] = useState("");
    const [emailFilter, setEmailFilter] = useState("");
    const [usernameFilter, setUsernameFilter] = useState("");
    const [displayNameFilter, setDisplayNameFilter] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [searchParams, setSearchParams] = useState<{
        id?: string;
        email?: string;
        username?: string;
        display_name?: string;
    }>({});
    const [confirmDialog, setConfirmDialog] = useState<{
        user: AdminUser;
        newStatus: boolean;
    } | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const loadUsers = useCallback(async (p: number, params: typeof searchParams) => {
        try {
            setLoading(true);
            const result = await getAllUsersAdmin({
                page: p, page_size: USERS_PAGE_SIZE,
                id: params.id || undefined,
                email: params.email || undefined,
                username: params.username || undefined,
                display_name: params.display_name || undefined,
            });
            setUsers(result.users);
            setTotalCount(result.total_count);
            setError(null);
        }
        catch {
            setError("Failed to load users");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadUsers(page, searchParams);
    }, [page, searchParams, loadUsers]);
    const handleConfirmToggle = useCallback(async () => {
        if (!confirmDialog)
            return;
        const { user, newStatus } = confirmDialog;
        setConfirmDialog(null);
        setToggling(user.id);
        try {
            await updateUserActiveStatus(user.id, newStatus);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
        }
        catch {
            console.error("Failed to update user status");
        }
        finally {
            setToggling(null);
        }
    }, [confirmDialog]);
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearchParams({
            id: idFilter || undefined,
            email: emailFilter || undefined,
            username: usernameFilter || undefined,
            display_name: displayNameFilter || undefined,
        });
    };
    const hasActiveFilters = !!(searchParams.id || searchParams.email || searchParams.username || searchParams.display_name);
    const handleClearFilters = () => {
        setIdFilter("");
        setEmailFilter("");
        setUsernameFilter("");
        setDisplayNameFilter("");
        setPage(1);
        setSearchParams({});
    };
    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const totalPages = Math.max(1, Math.ceil(totalCount / USERS_PAGE_SIZE));
    const formatGeoTimestamp = (ts: number) => new Date(ts * 1000).toLocaleString();
    const renderGeoInfo = (userId: string, label: string, geo: Record<string, unknown>) => (<div id={`admin-users-div-1-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <MapPin id={`admin-users-map-pin-2-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="h-4 w-4 mt-0.5 text-muted-foreground"/>
      <div id={`admin-users-div-3-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="space-y-1 text-sm">
        <div id={`admin-users-div-4-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="font-medium">{label}</div>
        <div id={`admin-users-div-5-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
          <span id={`admin-users-span-6-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>IP: <span id={`admin-users-span-7-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="font-mono text-foreground">{String(geo.ip)}</span></span>
          <span id={`admin-users-span-8-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>City: <span id={`admin-users-span-9-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="text-foreground">{String(geo.city_name)}</span></span>
          <span id={`admin-users-span-10-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>Country: <span id={`admin-users-span-11-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="text-foreground">{String(geo.country_name)} ({String(geo.country_code)})</span></span>
          <span id={`admin-users-span-12-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>Continent: <span id={`admin-users-span-13-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="text-foreground">{String(geo.continent_code)}</span></span>
          {typeof geo.detected_at === "number" && <span id={`admin-users-span-14-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>Detected: <span id={`admin-users-span-15-${userId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="text-foreground">{formatGeoTimestamp(geo.detected_at as number)}</span></span>}
        </div>
      </div>
    </div>);
    return (<div id="admin-users-div-16" className="space-y-4">
      <div id="admin-users-div-17" className="flex flex-wrap items-center justify-between gap-3">
        <div id="admin-users-div-18" className="flex items-center gap-3">
          <h2 id="admin-users-h2-19" className="text-lg font-semibold">All Users</h2>
          {!loading && <span id="admin-users-span-20" className="text-xs text-muted-foreground">{totalCount} user{totalCount !== 1 ? "s" : ""}</span>}
        </div>
        <TooltipProvider><Tooltip><TooltipTrigger id="admin-users-tooltip-trigger-21" asChild><Button id="admin-users-button-22" variant="outline" size="icon" aria-label={t("common.refresh")} onClick={() => loadUsers(page, searchParams)} disabled={loading}><RefreshCw id="admin-users-refresh-cw-23" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button></TooltipTrigger><TooltipContent id="admin-users-tooltip-content-24" side="top">{t("common.refresh")}</TooltipContent></Tooltip></TooltipProvider>
      </div>

      <AdminDuplicateUsersPanel/>

      {/* Search Filters */}
      <form id="admin-users-form-25" onSubmit={handleSearch}>
        <Card id="admin-users-card-26">
          <CardHeader id="admin-users-card-header-27" className="pb-3">
            <CardTitle id="admin-users-card-title-28" className="text-base">Search Filters</CardTitle>
          </CardHeader>
          <CardContent id="admin-users-card-content-29" className="space-y-4">
            <div id="admin-users-div-30" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div id="admin-users-div-31" className="space-y-2">
                <label id="admin-users-label-32" className="text-sm font-medium">User ID</label>
                <Input id="admin-users-input-33" placeholder="Exact UUID..." value={idFilter} onChange={(e) => setIdFilter(e.target.value)}/>
              </div>
              <div id="admin-users-div-34" className="space-y-2">
                <label id="admin-users-label-35" className="text-sm font-medium">Email</label>
                <Input id="admin-users-input-36" placeholder="Search by email..." value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)}/>
              </div>
              <div id="admin-users-div-37" className="space-y-2">
                <label id="admin-users-label-38" className="text-sm font-medium">Username</label>
                <Input id="admin-users-input-39" placeholder="Search by username..." value={usernameFilter} onChange={(e) => setUsernameFilter(e.target.value)}/>
              </div>
              <div id="admin-users-div-40" className="space-y-2">
                <label id="admin-users-label-41" className="text-sm font-medium">Display Name</label>
                <Input id="admin-users-input-42" placeholder="Search by display name..." value={displayNameFilter} onChange={(e) => setDisplayNameFilter(e.target.value)}/>
              </div>
            </div>
            <div id="admin-users-div-43" className="flex gap-2">
              <Button id="admin-users-button-44" type="submit" size="sm"><Search id="admin-users-search-45" className="h-4 w-4 mr-2"/>Search</Button>
              {hasActiveFilters && <Button id="admin-users-button-46" type="button" variant="outline" size="sm" onClick={handleClearFilters}>Clear Filters</Button>}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Users Table */}
      <Card id="admin-users-card-47">
        <CardContent id="admin-users-card-content-48" className="p-0">
          {loading ? (<div id="admin-users-div-49" className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (<div id={`admin-users-div-50-${i}`} key={i} className="flex items-center gap-4">
                  <Skeleton id={`admin-users-skeleton-51-${i}`} className="h-10 w-10 rounded-full"/>
                  <div id={`admin-users-div-52-${i}`} className="space-y-2 flex-1"><Skeleton id={`admin-users-skeleton-53-${i}`} className="h-4 w-1/3"/><Skeleton id={`admin-users-skeleton-54-${i}`} className="h-3 w-1/4"/></div>
                </div>))}
            </div>) : error ? (<div id="admin-users-div-55" className="p-6 text-center text-destructive">
              <p id="admin-users-p-56">{error}</p>
              <Button id="admin-users-button-57" variant="outline" className="mt-4" onClick={() => loadUsers(page, searchParams)}>Try Again</Button>
            </div>) : users.length === 0 ? (<div id="admin-users-div-58" className="p-6 text-center text-muted-foreground">
              <Users id="admin-users-users-59" className="h-12 w-12 mx-auto mb-2 opacity-50"/>
              <p id="admin-users-p-60">No users found</p>
              {hasActiveFilters && <Button id="admin-users-button-61" variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>Clear Filters</Button>}
            </div>) : (<div id="admin-users-div-62" className="overflow-x-auto">
              <Table id="admin-users-table-63">
                <TableHeader id="admin-users-table-header-64">
                  <TableRow id="admin-users-table-row-65">
                    <TableHead id="admin-users-table-head-66" className="w-8"></TableHead>
                    <TableHead id="admin-users-table-head-67">User</TableHead>
                    <TableHead id="admin-users-table-head-68">Email</TableHead>
                    <TableHead id="admin-users-table-head-69">Status</TableHead>
                    <TableHead id="admin-users-table-head-71">Last Login</TableHead>
                    <TableHead id="admin-users-table-head-72">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody id="admin-users-table-body-73">
                  {users.map((user) => {
                const isExpanded = expandedRows.has(user.id);
                const customData = user.custom_data || {};
                const registeredGeo = customData.registered_geo as Record<string, unknown> | undefined;
                const lastLoginGeo = customData.last_login_geo as Record<string, unknown> | undefined;
                const googleAuth = customData.google_auth as Record<string, unknown> | undefined;
                return (<Fragment key={user.id}>
                        <TableRow id={`admin-users-table-row-74-${user.id}`} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(user.id)}>
                          <TableCell id={`admin-users-table-cell-75-${user.id}`} className="w-8 px-2">
                            {isExpanded ? <ChevronDown id={`admin-users-chevron-down-76-${user.id}`} className="h-4 w-4"/> : <ChevronRight id={`admin-users-chevron-right-77-${user.id}`} className="h-4 w-4"/>}
                          </TableCell>
                          <TableCell id={`admin-users-table-cell-78-${user.id}`}>
                            <div id={`admin-users-div-79-${user.id}`}>
                              <div id={`admin-users-div-80-${user.id}`} className="font-medium flex items-center gap-1.5">
                                {user.display_name}
                                {lastLoginGeo?.country_code ? (<img id={`admin-users-img-81-${user.id}`} src={`https://flagcdn.com/16x12/${String(lastLoginGeo.country_code).toLowerCase()}.png`} alt={String(lastLoginGeo.country_name)} title={`${String(lastLoginGeo.city_name)}, ${String(lastLoginGeo.country_name)}`} className="inline-block" width={16} height={12}/>) : (<Globe id={`admin-users-globe-82-${user.id}`} className="h-4 w-4 text-muted-foreground" aria-label={t("adminTwoFactor.unknownLocation")}/>)}
                              </div>
                              <div id={`admin-users-div-83-${user.id}`} className="text-xs text-muted-foreground font-mono">{user.username}</div>
                              <div id={`admin-users-div-84-${user.id}`} className="text-xs text-muted-foreground font-mono flex items-center">{user.id}<CopyButton id={`admin-users-copy-button-85-${user.id}`} text={user.id}/></div>
                            </div>
                          </TableCell>
                          <TableCell id={`admin-users-table-cell-87-${user.id}`}>
                            <div id={`admin-users-div-88-${user.id}`} className="text-sm flex items-center gap-1">
                              {user.email}
                              {user.is_verified ? (<BadgeCheck id={`admin-users-badge-check-89-${user.id}`} className="h-4 w-4 text-blue-500 flex-shrink-0" aria-label={t("adminTwoFactor.emailVerified")}/>) : (<XCircle id={`admin-users-xcircle-90-${user.id}`} className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-label={t("adminTwoFactor.emailNotVerified")}/>)}
                            </div>
                          </TableCell>
                          <TableCell id={`admin-users-table-cell-91-${user.id}`}>
                            <div id={`admin-users-div-92-${user.id}`} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Switch id={`admin-users-switch-93-${user.id}`} checked={user.is_active} disabled={toggling === user.id} onCheckedChange={(checked) => setConfirmDialog({ user, newStatus: checked })}/>
                              <span id={`admin-users-span-94-${user.id}`} className="text-sm text-muted-foreground">{user.is_active ? "Active" : "Banned"}</span>
                            </div>
                          </TableCell>
                          <TableCell id={`admin-users-table-cell-95-${user.id}`}>
                            <div id={`admin-users-div-96-${user.id}`} className="text-sm flex items-center gap-1">
                              <Clock id={`admin-users-clock-97-${user.id}`} className="h-3 w-3"/>
                              {user.last_login_at ? formatISODate(user.last_login_at) : "Never"}
                            </div>
                          </TableCell>
                          <TableCell id={`admin-users-table-cell-98-${user.id}`}>
                            <div id={`admin-users-div-99-${user.id}`} className="text-sm">{formatTimestamp(user.created_at)}</div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (<TableRow id={`admin-users-table-row-100-${user.id}`}>
                            <TableCell id={`admin-users-table-cell-101-${user.id}`} colSpan={6} className="bg-muted/30 p-4">
                              <div id={`admin-users-div-102-${user.id}`} className="space-y-3">
                                <div id={`admin-users-div-103-${user.id}`} className="flex items-center gap-2 text-sm font-medium"><Globe id={`admin-users-globe-104-${user.id}`} className="h-4 w-4"/>User Details</div>
                                <div id={`admin-users-div-105-${user.id}`} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {registeredGeo && renderGeoInfo(user.id, "Registered Location", registeredGeo)}
                                  {lastLoginGeo && renderGeoInfo(user.id, "Last Login Location", lastLoginGeo)}
                                </div>
                                <div id={`admin-users-auth-columns-${user.id}`} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  {googleAuth && (<div id={`admin-users-div-106-${user.id}`} className="p-3 rounded-lg bg-muted/50">
                                    <div id={`admin-users-div-107-${user.id}`} className="text-sm font-medium mb-2">Google Auth</div>
                                    <div id={`admin-users-div-108-${user.id}`} className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                      <span id={`admin-users-span-109-${user.id}`}>Name: <span id={`admin-users-span-110-${user.id}`} className="text-foreground">{String(googleAuth.name)}</span></span>
                                      <span id={`admin-users-span-111-${user.id}`}>Email: <span id={`admin-users-span-112-${user.id}`} className="text-foreground">{String(googleAuth.email)}</span></span>
                                      {typeof googleAuth.last_login_at === "number" && (<span id={`admin-users-span-113-${user.id}`}>Last Login: <span id={`admin-users-span-114-${user.id}`} className="text-foreground">{formatGeoTimestamp(googleAuth.last_login_at as number)}</span></span>)}
                                    </div>
                                  </div>)}
                                  <div id={`admin-users-two-factor-${user.id}`} className="space-y-2 rounded-lg bg-muted/50 p-3 md:col-start-2">
                                    <div id={`admin-users-two-factor-title-${user.id}`} className="text-sm font-medium">{t("adminTwoFactor.column")}</div>
                                    <AdminUserTwoFactorToggle userId={user.id} name={user.display_name || user.username} enabled={twoFactor.flags[user.id]} loading={twoFactor.loading} onDisabled={twoFactor.markDisabled} />
                                  </div>
                                </div>
                                <div id={`admin-users-div-115-${user.id}`} className="text-xs text-muted-foreground">Updated: {formatTimestamp(user.updated_at)}</div>
                              </div>
                            </TableCell>
                          </TableRow>)}
                      </Fragment>);
            })}
                </TableBody>
              </Table>
            </div>)}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (<div id="admin-users-div-116" className="flex items-center justify-between">
          <p id="admin-users-p-117" className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div id="admin-users-div-118" className="flex gap-2">
            <Button id="admin-users-button-119" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft id="admin-users-chevron-left-120" className="h-4 w-4 mr-1"/>Previous
            </Button>
            <Button id="admin-users-button-121" variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight id="admin-users-chevron-right-122" className="h-4 w-4 ml-1"/>
            </Button>
          </div>
        </div>)}

      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => {
            if (!open)
                setConfirmDialog(null);
        }}>
        <AlertDialogContent id="admin-users-alert-dialog-content-123">
          <AlertDialogHeader id="admin-users-alert-dialog-header-124">
            <AlertDialogTitle id="admin-users-alert-dialog-title-125">Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription id="admin-users-alert-dialog-description-126">
              Are you sure you want to {confirmDialog?.newStatus ? "unban" : "ban"} user <strong id="admin-users-strong-127">{confirmDialog?.user.display_name}</strong> ({confirmDialog?.user.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter id="admin-users-alert-dialog-footer-128">
            <AlertDialogCancel id="admin-users-alert-dialog-cancel-129">Cancel</AlertDialogCancel>
            <AlertDialogAction id="admin-users-alert-dialog-action-130" onClick={handleConfirmToggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);
}
