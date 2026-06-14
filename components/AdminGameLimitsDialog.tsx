"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGame } from "@/lib/admin-api";
import { getGame } from "@/lib/game-api";
import type { Game } from "@/types/game";
interface Props {
    game: AdminGame;
}
function UsageBar({ value, limit }: {
    value: number;
    limit: number | null | undefined;
}) {
    if (limit == null || limit <= 0)
        return null;
    const pct = Math.min(100, Math.round((value / limit) * 100));
    return (<div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
      <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }}/>
    </div>);
}
export function AdminGameLimitsDialog({ game }: Props) {
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState<Game | null>(null);
    const [loading, setLoading] = useState(false);
    const load = async () => {
        setLoading(true);
        try {
            const res = await getGame(game.id);
            setDetail(res);
        }
        catch {
            setDetail(null);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (open)
            load();
    }, [open]);
    const u = detail?.usage;
    const l = detail?.limits;
    const fields: {
        key: string;
        label: string;
        usage: number;
        limit?: number | null;
    }[] = [
        { key: "max_player_profiles", label: "Player Profiles", usage: u?.player_profiles ?? 0, limit: l?.max_player_profiles },
        { key: "max_concurrent_users", label: "Concurrent Users", usage: u?.concurrent_users ?? 0, limit: l?.max_concurrent_users },
        { key: "max_items", label: "Items", usage: u?.items ?? 0, limit: l?.max_items },
        { key: "max_shops", label: "Shops", usage: u?.shops ?? 0, limit: l?.max_shops },
        { key: "max_node_definitions", label: "Journey Node", usage: u?.node_definitions ?? 0, limit: l?.max_node_definitions },
        { key: "max_event_types", label: "Event Types", usage: u?.event_types ?? 0, limit: l?.max_event_types },
    ];
    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5"/>
          Limits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="h-4 w-4"/>
            Game Limits — {game.name}
          </DialogTitle>
          <DialogDescription className="text-xs font-mono break-all">{game.id}</DialogDescription>
        </DialogHeader>

        {loading ? (<div className="space-y-3 py-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full"/>)}
          </div>) : (<div className="py-1">
            <div className="space-y-1">
              {fields.map((f) => {
                const atLimit = f.limit != null && f.usage >= f.limit;
                return (<div key={f.key} className="rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">{f.label}</span>
                      <span className={`text-sm font-semibold tabular-nums ${atLimit ? "text-destructive" : ""}`}>
                        {f.usage}
                        <span className={`font-normal ${atLimit ? "text-destructive/70" : "text-muted-foreground"}`}>
                          {" / "}{f.limit != null ? f.limit : "∞"}
                        </span>
                      </span>
                    </div>
                    <UsageBar value={f.usage} limit={f.limit}/>
                  </div>);
            })}
            </div>

            <div className="mt-3 pt-3 border-t flex items-center justify-end">
              <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="shrink-0">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
                Reload
              </Button>
            </div>
          </div>)}
      </DialogContent>
    </Dialog>);
}
