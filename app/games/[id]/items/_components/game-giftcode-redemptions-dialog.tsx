"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

import { listGameGiftCodeRedemptions } from "@/lib/game-giftcode-api";
import type { GameGiftCode, GameGiftCodeRedemption } from "@/types/game-giftcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type GameGiftCodeRedemptionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  giftCode: GameGiftCode | null;
};

export function GameGiftCodeRedemptionsDialog({
  open,
  onOpenChange,
  gameId,
  giftCode,
}: GameGiftCodeRedemptionsDialogProps) {
  const [redemptions, setRedemptions] = useState<GameGiftCodeRedemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchRedemptions = useCallback(() => {
    if (!open || !gameId || !giftCode) return;
    
    setLoading(true);
    setError(null);
    listGameGiftCodeRedemptions(gameId, giftCode.id, 100, 0)
      .then(res => setRedemptions(res.redemptions ?? []))
      .catch(err => setError(err.message || "Failed to load redemptions"))
      .finally(() => setLoading(false));
  }, [open, gameId, giftCode]);

  useEffect(() => {
    if (open) {
      setSearch("");
      fetchRedemptions();
    } else {
      setRedemptions([]);
    }
  }, [open, fetchRedemptions]);

  const filtered = search
    ? redemptions.filter(r => 
        (r.display_name || "").toLowerCase().includes(search.toLowerCase()) || 
        (r.email || "").toLowerCase().includes(search.toLowerCase()) ||
        r.user_id.toLowerCase().includes(search.toLowerCase())
      )
    : redemptions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Giftcode Redemptions</DialogTitle>
          <DialogDescription>
            Players who have redeemed the code <strong className="font-mono text-foreground">{giftCode?.code}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 my-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchRedemptions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead className="text-right">Redeemed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[120px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-destructive h-24">
                    {error}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                    {search ? "No players match your search" : "No redemptions yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.display_name || "Unknown"}</span>
                        {r.email && <span className="text-xs text-muted-foreground">{r.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
                        {r.user_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <span title={format(new Date(r.redeemed_at), "PPp")}>
                        {format(new Date(r.redeemed_at), "MMM d, yyyy HH:mm")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
