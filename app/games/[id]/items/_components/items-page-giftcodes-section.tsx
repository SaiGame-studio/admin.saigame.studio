"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import type React from "react";
import { Copy, Gift, Info, Loader2, Pencil, RefreshCw, Search, Trash2, X, Eye, XCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  listGameGiftCodes,
  deleteGameGiftCode,
  updateGameGiftCode,
} from "@/lib/game-giftcode-api";
import type { GameGiftCode } from "@/types/game-giftcode";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GameGiftCodeSheet } from "./game-giftcode-sheet";
import { GameGiftCodeRedemptionsDialog } from "./game-giftcode-redemptions-dialog";

type ItemsPageGiftCodesSectionProps = {
  gameId: string;
  activeTab: string;
};

export function ItemsPageGiftCodesSection({
  gameId,
  activeTab,
}: ItemsPageGiftCodesSectionProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [giftCodes, setGiftCodes] = useState<GameGiftCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

  // Sheets and Modals
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<GameGiftCode | null>(null);
  const [deletingCode, setDeletingCode] = useState<GameGiftCode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingRedemptions, setViewingRedemptions] = useState<GameGiftCode | null>(null);

  const fetchGiftCodes = useCallback(() => {
    if (!gameId) return;

    setLoading(true);
    setError(null);

    listGameGiftCodes(gameId, 100, 0)
      .then((res) => {
        setGiftCodes(res.game_gift_codes ?? []);
      })
      .catch((e) => setError(e?.message ?? "Failed to load gift codes"))
      .finally(() => {
        setHasFetched(true);
        setLoading(false);
      });
  }, [gameId]);

  useEffect(() => {
    if (activeTab !== "giftcode" || !gameId) return;
    if (giftCodes.length > 0 || loading || hasFetched) return;
    fetchGiftCodes();
  }, [activeTab, fetchGiftCodes, gameId, loading, giftCodes.length, hasFetched]);

  function openCreate() {
    setEditingCode(null);
    setSheetOpen(true);
  }

  function openEdit(code: GameGiftCode, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingCode(code);
    setSheetOpen(true);
  }

  function openRedemptions(code: GameGiftCode, e: React.MouseEvent) {
    e.stopPropagation();
    setViewingRedemptions(code);
  }

  async function handleDelete() {
    if (!deletingCode) return;

    setDeleteLoading(true);
    try {
      await deleteGameGiftCode(gameId, deletingCode.id);
      setGiftCodes(giftCodes.filter((c) => c.id !== deletingCode.id));
      toast({ title: "Giftcode deleted" });
      setDeletingCode(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("items.failedToDelete");
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  }

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleToggleActive = async (code: GameGiftCode, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingActiveId(code.id);
    try {
      await updateGameGiftCode(gameId, code.id, { is_active: !code.is_active });
      setGiftCodes(codes => codes.map(c => c.id === code.id ? { ...c, is_active: !code.is_active } : c));
      toast({ title: !code.is_active ? "Giftcode activated" : "Giftcode deactivated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to toggle status", description: e.message });
    } finally {
      setTogglingActiveId(null);
    }
  };

  const filtered = useMemo(() => search
    ? giftCodes.filter(
        (code) =>
          code.code.toLowerCase().includes(search.toLowerCase()) ||
          (code.description || "").toLowerCase().includes(search.toLowerCase())
      )
    : giftCodes, [search, giftCodes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Game Giftcodes</h2>
          <p className="text-sm text-muted-foreground">
            {giftCodes.length > 0 ? (
              <>{giftCodes.length} codes</>
            ) : (
              "No gift codes created yet"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchGiftCodes} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Gift className="h-3.5 w-3.5 mr-1" /> New Giftcode
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Gift className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{search ? "No gift codes match your search" : "No gift codes yet"}</p>
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Gift className="h-3.5 w-3.5 mr-1" /> New Giftcode
            </Button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((code) => {
            const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
            const isDepleted = code.max_uses > 0 && code.used_count >= code.max_uses;
            const notYetActive = code.active_at && new Date(code.active_at) > new Date();
            let statusBadge = null;
            
            if (isExpired) {
              statusBadge = <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Expired</Badge>;
            } else if (isDepleted) {
              statusBadge = <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">Depleted</Badge>;
            } else if (notYetActive) {
              statusBadge = <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">Scheduled</Badge>;
            } else if (!code.is_active) {
              statusBadge = <Badge variant="secondary" className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-[10px]">Inactive</Badge>;
            } else {
              statusBadge = <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">Active</Badge>;
            }

            return (
              <Card key={code.id} className={`relative group overflow-hidden ${!code.is_active ? 'opacity-70' : ''}`}>
                <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur" onClick={(e) => openEdit(code, e)} title={t("common.edit")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-background/80 backdrop-blur text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingCode(code);
                    }}
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardContent className="p-0">
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-4 pr-16">
                      <div className="flex items-center gap-2 max-w-full">
                        <div 
                          className="font-mono text-lg font-bold truncate cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5"
                          onClick={(e) => handleCopy(e, code.code, code.id)}
                          title="Click to copy"
                        >
                          {code.code}
                          {copiedId === code.id && <span className="text-[10px] text-green-500 font-sans tracking-tight">Copied!</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {statusBadge}
                        <Badge variant="outline" className="text-[10px] font-normal font-mono">
                          {code.used_count} / {code.max_uses === -1 ? '∞' : code.max_uses} used
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={(e) => openRedemptions(code, e)}>
                        <Eye className="h-3 w-3 mr-1" /> View Users
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {code.description || <span className="italic opacity-50">No description</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-y-1.5 gap-x-3 text-xs border-t pt-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground/70">Packs</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="text-left font-medium truncate">
                              {code.gacha_pack_ids.length} pack(s)
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[200px]">
                              {code.gacha_pack_ids.map(id => <div key={id} className="font-mono truncate opacity-75">{id.split('-')[0]}...</div>)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground/70">Validity</span>
                        <span className="font-medium truncate" title={code.expires_at ? format(new Date(code.expires_at), "PPp") : 'Forever'}>
                          {code.expires_at ? format(new Date(code.expires_at), "MMM d, yyyy") : 'Never expires'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end justify-center">
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Switch 
                            checked={code.is_active} 
                            onCheckedChange={() => handleToggleActive(code, { stopPropagation: () => {} } as any)} 
                            disabled={togglingActiveId === code.id}
                            className="scale-75 origin-right"
                          />
                          {togglingActiveId === code.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sheet to Create/Edit */}
      <GameGiftCodeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        gameId={gameId}
        existingCode={editingCode}
        onSaved={(code) => {
          if (editingCode) {
            setGiftCodes(giftCodes.map((c) => (c.id === code.id ? code : c)));
          } else {
            setGiftCodes([code, ...giftCodes]);
          }
        }}
      />

      {/* Dialog for redemptions list */}
      <GameGiftCodeRedemptionsDialog
        open={!!viewingRedemptions}
        onOpenChange={(open) => {
          if (!open) setViewingRedemptions(null);
        }}
        gameId={gameId}
        giftCode={viewingRedemptions}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCode}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCode(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Giftcode "{deletingCode?.code}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the giftcode. Players will no longer be able to claim it.
              Existing redemptions will not be affected (items are already in player's inventory).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
