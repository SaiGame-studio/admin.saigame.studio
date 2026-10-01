"use client";
import { useCallback, useState } from "react";
import { BadgeCheck, Loader2, Pencil, Search, UserX, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/CopyButton";
import { toast } from "@/hooks/use-toast";
import { DuplicateUser, DuplicateUserGroup, disableDuplicateUserAdmin, getDuplicateUsersAdmin, updateUserActiveStatus, updateUserEmailAdmin } from "@/lib/admin-api";
import { formatISODate, formatTimestamp } from "@/lib/utils/date-utils";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function AdminDuplicateUsersPanel() {
    const [groups, setGroups] = useState<DuplicateUserGroup[]>([]);
    const [nextAfter, setNextAfter] = useState("");
    const [hasMore, setHasMore] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<DuplicateUser | null>(null);
    const [newEmail, setNewEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [statusTarget, setStatusTarget] = useState<{ user: DuplicateUser; newStatus: boolean } | null>(null);
    const [disableTarget, setDisableTarget] = useState<DuplicateUser | null>(null);
    const [disablingId, setDisablingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const load = useCallback(async (after?: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await getDuplicateUsersAdmin({ after });
            setGroups((prev) => (after ? [...prev, ...result.groups] : result.groups));
            setHasMore(result.has_more);
            setNextAfter(result.next_after);
            setScanned(true);
        }
        catch {
            setError("Failed to scan duplicate users");
        }
        finally {
            setLoading(false);
        }
    }, []);

    const openEdit = (user: DuplicateUser) => {
        setEditTarget(user);
        setNewEmail(user.email);
    };

    const handleSaveEmail = async () => {
        if (!editTarget)
            return;
        setSaving(true);
        try {
            const result = await updateUserEmailAdmin(editTarget.id, newEmail);
            toast({ title: "Email updated", description: `${editTarget.username} is now ${result.email}.` });
            // The user leaves its group; drop groups that no longer hold a duplicate.
            setGroups((prev) => prev
                .map((g) => ({ ...g, users: g.users.filter((u) => u.id !== editTarget.id) }))
                .filter((g) => g.users.length > 1));
            setEditTarget(null);
        }
        catch {
            // The api client already surfaces the error toast.
        }
        finally {
            setSaving(false);
        }
    };

    const handleConfirmDisable = async () => {
        if (!disableTarget)
            return;
        const user = disableTarget;
        setDisableTarget(null);
        setDisablingId(user.id);
        try {
            const result = await disableDuplicateUserAdmin(user.id);
            toast({ title: "Duplicate disabled", description: `${user.username} is now ${result.username} (${result.email}).` });
            // The account now has a unique email, so it leaves its group.
            setGroups((prev) => prev
                .map((g) => ({ ...g, users: g.users.filter((u) => u.id !== user.id) }))
                .filter((g) => g.users.length > 1));
        }
        catch {
            // The api client already surfaces the error toast.
        }
        finally {
            setDisablingId(null);
        }
    };

    const handleConfirmStatus = async () => {
        if (!statusTarget)
            return;
        const { user, newStatus } = statusTarget;
        setStatusTarget(null);
        setTogglingId(user.id);
        try {
            await updateUserActiveStatus(user.id, newStatus);
            setGroups((prev) => prev.map((g) => ({
                ...g,
                users: g.users.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u)),
            })));
        }
        catch {
            // The api client already surfaces the error toast.
        }
        finally {
            setTogglingId(null);
        }
    };

    const newEmailUnchanged = !!editTarget && normalizeEmail(newEmail) === normalizeEmail(editTarget.email) && newEmail === editTarget.email;

    return (<Card id="duplicate-users-panel">
      <CardHeader id="duplicate-users-header" className="pb-3">
        <div id="duplicate-users-header-row" className="flex flex-wrap items-center justify-between gap-3">
          <div id="duplicate-users-title-wrap">
            <CardTitle id="duplicate-users-title" className="text-base">Duplicate Accounts</CardTitle>
            <CardDescription id="duplicate-users-description">
              Accounts sharing the same email, ignoring case and surrounding spaces. Edit an email to remove the account from the duplicate list; disabling blocks sign-in but the email stays duplicated.
            </CardDescription>
          </div>
          <Button id="duplicate-users-scan-btn" variant="outline" size="sm" onClick={() => load()} disabled={loading} className="flex items-center gap-2">
            {loading && !groups.length ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
            {scanned ? "Rescan" : "Scan for duplicates"}
          </Button>
        </div>
      </CardHeader>

      {(error || scanned) && (<CardContent id="duplicate-users-content" className="space-y-4">
          {error && <p id="duplicate-users-error" className="text-sm text-destructive">{error}</p>}
          {scanned && !error && groups.length === 0 && (<p id="duplicate-users-empty" className="text-sm text-muted-foreground">No duplicate accounts found.</p>)}

          {groups.map((group) => {
            const activeCount = group.users.filter((u) => u.is_active).length;
            return (<div key={group.normalized_email} id={`duplicate-group-${group.normalized_email}`} className="rounded-md border">
              <div id={`duplicate-group-header-${group.normalized_email}`} className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <span className="font-mono text-sm font-medium">{group.normalized_email}</span>
                <Badge id={`duplicate-group-count-${group.normalized_email}`} variant="secondary">{group.users.length} accounts</Badge>
                {activeCount <= 1 && (<Badge id={`duplicate-group-resolved-${group.normalized_email}`} className="bg-green-500 text-white">Only {activeCount} active</Badge>)}
              </div>
              <Table id={`duplicate-group-table-${group.normalized_email}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.users.map((user) => (<TableRow key={user.id} id={`duplicate-user-row-${user.id}`}>
                        <TableCell id={`duplicate-user-name-${user.id}`}>
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{user.username}</div>
                          <div className="text-xs text-muted-foreground font-mono flex items-center">{user.id}<CopyButton text={user.id}/></div>
                        </TableCell>
                        <TableCell id={`duplicate-user-email-${user.id}`}>
                          <div className="text-sm flex items-center gap-1">
                            {user.email}
                            {user.is_verified ? (<BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" aria-label="Email verified"/>) : (<XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-label="Email not verified"/>)}
                          </div>
                        </TableCell>
                        <TableCell id={`duplicate-user-last-login-${user.id}`} className="text-sm">{user.last_login_at ? formatISODate(user.last_login_at) : "Never"}</TableCell>
                        <TableCell id={`duplicate-user-created-${user.id}`} className="text-sm">{formatTimestamp(user.created_at)}</TableCell>
                        <TableCell id={`duplicate-user-active-${user.id}`}>
                          <Switch id={`duplicate-user-active-switch-${user.id}`} checked={user.is_active} disabled={togglingId === user.id} onCheckedChange={(checked) => setStatusTarget({ user, newStatus: checked })}/>
                        </TableCell>
                        <TableCell id={`duplicate-user-actions-${user.id}`} className="flex items-center gap-2">
                          <Button id={`duplicate-user-edit-btn-${user.id}`} variant="outline" size="sm" onClick={() => openEdit(user)} className="flex items-center gap-1.5">
                            <Pencil className="h-3.5 w-3.5"/>
                            Edit email
                          </Button>
                          <Button id={`duplicate-user-disable-btn-${user.id}`} variant="outline" size="sm" onClick={() => setDisableTarget(user)} disabled={disablingId === user.id || (user.is_active && activeCount <= 1)} title={user.is_active && activeCount <= 1 ? "Keep at least one active account for this email" : undefined} className="flex items-center gap-1.5 text-destructive">
                            {disablingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <UserX className="h-3.5 w-3.5"/>}
                            Disable duplicate
                          </Button>
                        </TableCell>
                      </TableRow>))}
                </TableBody>
              </Table>
            </div>);
        })}

          {hasMore && (<Button id="duplicate-users-load-more-btn" variant="outline" size="sm" onClick={() => load(nextAfter)} disabled={loading} className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
              Load more
            </Button>)}
        </CardContent>)}

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent id="duplicate-users-edit-dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit email</DialogTitle>
            <DialogDescription>Set a unique email for {editTarget?.username}. It is saved trimmed and lowercased.</DialogDescription>
          </DialogHeader>
          <div id="duplicate-users-edit-field" className="space-y-1.5 py-2">
            <Label htmlFor="duplicate-users-edit-input">New email</Label>
            <Input id="duplicate-users-edit-input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}/>
          </div>
          <DialogFooter>
            <Button id="duplicate-users-edit-cancel-btn" variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
            <Button id="duplicate-users-edit-save-btn" onClick={handleSaveEmail} disabled={saving || !newEmail.trim() || newEmailUnchanged}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!disableTarget} onOpenChange={(open) => { if (!open) setDisableTarget(null); }}>
        <AlertDialogContent id="duplicate-users-disable-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable duplicate account</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{disableTarget?.username}</strong> ({disableTarget?.email}) will be disabled and get a placeholder email and username so it no longer collides with any account. The original email and username are kept in its custom data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="duplicate-users-disable-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction id="duplicate-users-disable-confirm-btn" onClick={handleConfirmDisable}>Disable duplicate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!statusTarget} onOpenChange={(open) => { if (!open) setStatusTarget(null); }}>
        <AlertDialogContent id="duplicate-users-status-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {statusTarget?.newStatus ? "enable" : "disable"} user <strong>{statusTarget?.user.username}</strong> ({statusTarget?.user.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="duplicate-users-status-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction id="duplicate-users-status-confirm-btn" onClick={handleConfirmStatus}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>);
}
