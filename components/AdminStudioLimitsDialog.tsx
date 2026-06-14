"use client";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AdminStudio, updateStudioLimits } from "@/lib/admin-api";
import { fetchStudio } from "@/lib/studio-api";
import type { Studio } from "@/types/studio";
interface Props {
    studio: AdminStudio;
}
function UsageRow({ label, usage, limit, }: {
    label: string;
    usage: number;
    limit?: number | null;
}) {
    const pct = limit != null && limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : null;
    return (<div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {usage}
          {limit != null ? (<span className="text-muted-foreground font-normal"> / {limit}</span>) : (<span className="text-muted-foreground font-normal"> / ∞</span>)}
        </span>
      </div>
      {pct !== null && (<div className="w-full h-2 rounded-full bg-border overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${pct}%` }}/>
        </div>)}
    </div>);
}
export function AdminStudioLimitsDialog({ studio }: Props) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState<Studio | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [maxGames, setMaxGames] = useState("");
    const [maxMembers, setMaxMembers] = useState("");
    const load = async () => {
        setLoading(true);
        try {
            const res = await fetchStudio(studio.id);
            setDetail(res);
            setMaxGames(res.limits?.max_games != null ? String(res.limits.max_games) : "");
            setMaxMembers(res.limits?.max_total_members != null ? String(res.limits.max_total_members) : "");
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
    const handleSave = async () => {
        const parseVal = (v: string): number | null | undefined => {
            if (v.trim() === "")
                return null;
            const n = parseInt(v, 10);
            return isNaN(n) || n < 0 ? undefined : n;
        };
        const gamesVal = parseVal(maxGames);
        const membersVal = parseVal(maxMembers);
        if (gamesVal === undefined) {
            toast({ title: "Invalid value", description: "Max Games must be a non-negative integer.", variant: "destructive" });
            return;
        }
        if (membersVal === undefined) {
            toast({ title: "Invalid value", description: "Max Members must be a non-negative integer.", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            await updateStudioLimits(studio.id, {
                max_games: gamesVal,
                max_total_members: membersVal,
            });
            toast({ title: "Saved", description: `Limits updated for "${studio.name}".` });
            await load();
        }
        catch (err: any) {
            toast({ title: "Failed", description: err?.message || "Could not update limits.", variant: "destructive" });
        }
        finally {
            setSaving(false);
        }
    };
    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5"/>
          Limits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="h-4 w-4"/>
            Studio Limits — {studio.name}
          </DialogTitle>
          <DialogDescription className="text-xs font-mono break-all">{studio.id}</DialogDescription>
        </DialogHeader>

        {loading ? (<div className="space-y-3 py-2">
            <Skeleton className="h-24 w-full"/>
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/>
          </div>) : (<div className="space-y-5 py-2">
            {/* Usage summary */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Usage</p>
              <UsageRow label="Games" usage={detail?.usage?.games ?? studio.game_count} limit={detail?.limits?.max_games}/>
              <UsageRow label="Total Members" usage={detail?.usage?.total_members ?? 0} limit={detail?.limits?.max_total_members}/>
            </div>

            {/* Edit limits */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit Limits</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max_games">Max Games</Label>
                  <span className="text-xs text-muted-foreground">
                    Current usage: <span className="font-semibold text-foreground">{detail?.usage?.games ?? studio.game_count}</span>
                  </span>
                </div>
                <Input id="max_games" type="number" min={0} placeholder="unlimited" value={maxGames} onChange={(e) => setMaxGames(e.target.value)}/>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max_total_members">Max Total Members</Label>
                  <span className="text-xs text-muted-foreground">
                    Current usage: <span className="font-semibold text-foreground">{detail?.usage?.total_members ?? 0}</span>
                  </span>
                </div>
                <Input id="max_total_members" type="number" min={0} placeholder="unlimited" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)}/>
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to remove the limit.</p>
            </div>

            <div className="flex justify-between items-center pt-1">
              <Button variant="ghost" size="sm" onClick={load} disabled={loading || saving}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
                Reload
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (<Loader2 className="h-4 w-4 animate-spin mr-2"/>) : (<Save className="h-4 w-4 mr-2"/>)}
                Save
              </Button>
            </div>
          </div>)}
      </DialogContent>
    </Dialog>);
}
