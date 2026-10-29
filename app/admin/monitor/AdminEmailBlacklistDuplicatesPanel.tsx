"use client";
import { useCallback, useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/CopyButton";
import { toast } from "@/hooks/use-toast";
import { EmailBlacklistDuplicateGroup, EmailBlacklistEntry, getEmailBlacklistDuplicates, removeEmailBlacklistDuplicate } from "@/lib/admin-api";
import { formatISODate } from "@/lib/utils/date-utils";

interface AdminEmailBlacklistDuplicatesPanelProps {
    /** Called after an entry is removed so the blacklist table can reload. */
    onRemoved?: () => void;
}

export function AdminEmailBlacklistDuplicatesPanel({ onRemoved }: AdminEmailBlacklistDuplicatesPanelProps) {
    const [groups, setGroups] = useState<EmailBlacklistDuplicateGroup[]>([]);
    const [nextAfter, setNextAfter] = useState("");
    const [hasMore, setHasMore] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [removeTarget, setRemoveTarget] = useState<EmailBlacklistEntry | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const load = useCallback(async (after?: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await getEmailBlacklistDuplicates({ after });
            setGroups((prev) => (after ? [...prev, ...result.groups] : result.groups));
            setHasMore(result.has_more);
            setNextAfter(result.next_after);
            setScanned(true);
        }
        catch {
            setError("Failed to scan duplicate emails");
        }
        finally {
            setLoading(false);
        }
    }, []);

    const handleConfirmRemove = async () => {
        if (!removeTarget)
            return;
        const entry = removeTarget;
        setRemoveTarget(null);
        setRemovingId(entry.id);
        try {
            await removeEmailBlacklistDuplicate(entry.id);
            toast({ title: "Duplicate removed", description: `Removed one ${entry.email} entry.` });
            setGroups((prev) => prev
                .map((g) => ({ ...g, entries: g.entries.filter((e) => e.id !== entry.id) }))
                .filter((g) => g.entries.length > 1));
            onRemoved?.();
        }
        catch {
            // The api client already surfaces the error toast.
        }
        finally {
            setRemovingId(null);
        }
    };

    return (<Card id="email-blacklist-duplicates-panel">
      <CardHeader id="email-blacklist-duplicates-header" className="pb-3">
        <div id="email-blacklist-duplicates-header-row" className="flex flex-wrap items-center justify-between gap-3">
          <div id="email-blacklist-duplicates-title-wrap">
            <CardTitle id="email-blacklist-duplicates-title" className="text-base">Duplicate Emails</CardTitle>
            <CardDescription id="email-blacklist-duplicates-description">
              Blacklist entries sharing the same email. Remove the extra entries and keep one per email; the most recently updated entry is marked as latest.
            </CardDescription>
          </div>
          <Button id="email-blacklist-duplicates-scan-btn" variant="outline" size="sm" onClick={() => load()} disabled={loading} className="flex items-center gap-2">
            {loading && !groups.length ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
            {scanned ? "Rescan" : "Scan for duplicates"}
          </Button>
        </div>
      </CardHeader>

      {(error || scanned) && (<CardContent id="email-blacklist-duplicates-content" className="space-y-4">
          {error && <p id="email-blacklist-duplicates-error" className="text-sm text-destructive">{error}</p>}
          {scanned && !error && groups.length === 0 && (<p id="email-blacklist-duplicates-empty" className="text-sm text-muted-foreground">No duplicate emails found.</p>)}

          {groups.map((group) => (<div key={group.email} id={`email-blacklist-duplicate-group-${group.email}`} className="rounded-md border">
              <div id={`email-blacklist-duplicate-group-header-${group.email}`} className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <span id={`email-blacklist-duplicate-group-email-${group.email}`} className="font-mono text-sm font-medium">{group.email}</span>
                <Badge id={`email-blacklist-duplicate-group-count-${group.email}`} variant="secondary">{group.entries.length} entries</Badge>
              </div>
              <Table id={`email-blacklist-duplicate-group-table-${group.email}`}>
                <TableHeader id={`email-blacklist-duplicate-group-table-header-${group.email}`}>
                  <TableRow id={`email-blacklist-duplicate-group-table-header-row-${group.email}`}>
                    <TableHead id={`email-blacklist-duplicate-group-col-entry-${group.email}`}>Entry</TableHead>
                    <TableHead id={`email-blacklist-duplicate-group-col-reason-${group.email}`}>Reason</TableHead>
                    <TableHead id={`email-blacklist-duplicate-group-col-status-${group.email}`}>Status</TableHead>
                    <TableHead id={`email-blacklist-duplicate-group-col-created-${group.email}`}>Created</TableHead>
                    <TableHead id={`email-blacklist-duplicate-group-col-updated-${group.email}`}>Updated</TableHead>
                    <TableHead id={`email-blacklist-duplicate-group-col-actions-${group.email}`}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody id={`email-blacklist-duplicate-group-table-body-${group.email}`}>
                  {group.entries.map((entry, index) => (<TableRow key={entry.id} id={`email-blacklist-duplicate-row-${entry.id}`}>
                      <TableCell id={`email-blacklist-duplicate-id-${entry.id}`}>
                        <div id={`email-blacklist-duplicate-id-wrap-${entry.id}`} className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          {entry.id}
                          <CopyButton text={entry.id}/>
                          {index === 0 && (<Badge id={`email-blacklist-duplicate-latest-${entry.id}`} variant="outline" className="ml-1">Latest</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell id={`email-blacklist-duplicate-reason-${entry.id}`} className="text-xs">{entry.reason || "—"}</TableCell>
                      <TableCell id={`email-blacklist-duplicate-status-${entry.id}`}>
                        <Badge id={`email-blacklist-duplicate-status-badge-${entry.id}`} variant={entry.status === "allowed" ? "default" : "secondary"}>{entry.status}</Badge>
                      </TableCell>
                      <TableCell id={`email-blacklist-duplicate-created-${entry.id}`} className="text-sm">{formatISODate(entry.created_at)}</TableCell>
                      <TableCell id={`email-blacklist-duplicate-updated-${entry.id}`} className="text-sm">{formatISODate(entry.updated_at)}</TableCell>
                      <TableCell id={`email-blacklist-duplicate-actions-${entry.id}`}>
                        <Button id={`email-blacklist-duplicate-remove-btn-${entry.id}`} variant="outline" size="sm" onClick={() => setRemoveTarget(entry)} disabled={removingId === entry.id || group.entries.length <= 1} className="flex items-center gap-1.5 text-destructive">
                          {removingId === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5"/>}
                          Remove duplicate
                        </Button>
                      </TableCell>
                    </TableRow>))}
                </TableBody>
              </Table>
            </div>))}

          {hasMore && (<Button id="email-blacklist-duplicates-load-more-btn" variant="outline" size="sm" onClick={() => load(nextAfter)} disabled={loading} className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
              Load more
            </Button>)}
        </CardContent>)}

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent id="email-blacklist-duplicates-remove-dialog">
          <AlertDialogHeader id="email-blacklist-duplicates-remove-dialog-header">
            <AlertDialogTitle id="email-blacklist-duplicates-remove-dialog-title">Remove duplicate entry</AlertDialogTitle>
            <AlertDialogDescription id="email-blacklist-duplicates-remove-dialog-description">
              The <strong>{removeTarget?.status}</strong> entry of <strong>{removeTarget?.email}</strong> ({removeTarget?.id}) will be permanently deleted. At least one entry for this email always remains.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter id="email-blacklist-duplicates-remove-dialog-footer">
            <AlertDialogCancel id="email-blacklist-duplicates-remove-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction id="email-blacklist-duplicates-remove-confirm-btn" onClick={handleConfirmRemove}>Remove duplicate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>);
}
