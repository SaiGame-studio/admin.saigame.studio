"use client";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AdminUser, UserLimitsDetail, getUserLimits, updateUserLimits } from "@/lib/admin-api";
interface Props {
    user: AdminUser;
}
function UsageBar({ value, limit }: {
    value: number;
    limit: number | null | undefined;
}) {
    if (limit == null || limit <= 0)
        return null;
    const pct = Math.min(100, Math.round((value / limit) * 100));
    return (<div className="w-full h-2 rounded-full bg-border overflow-hidden">
      <div className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${pct}%` }}/>
    </div>);
}
export function AdminUserLimitsDialog({ user }: Props) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState<UserLimitsDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [maxStudios, setMaxStudios] = useState("");
    const load = async () => {
        setLoading(true);
        try {
            const res = await getUserLimits(user.id);
            setDetail(res);
            setMaxStudios(res.limits?.max_studios != null ? String(res.limits.max_studios) : "");
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
    const parseLimit = (val: string, label: string): number | null | "error" => {
        if (val.trim() === "")
            return null;
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0) {
            toast({ title: "Invalid value", description: `${label} must be a non-negative integer.`, variant: "destructive" });
            return "error";
        }
        return n;
    };
    const handleSave = async () => {
        const studiosVal = parseLimit(maxStudios, "Max Studios");
        if (studiosVal === "error")
            return;
        setSaving(true);
        try {
            await updateUserLimits(user.id, {
                max_studios: studiosVal,
            });
            toast({ title: "Saved", description: `Limits updated for "${user.display_name || user.username}".` });
            await load();
        }
        catch (err: any) {
            toast({ title: "Failed", description: err?.message || "Could not update limits.", variant: "destructive" });
        }
        finally {
            setSaving(false);
        }
    };
    const u = detail?.usage;
    const l = detail?.limits;
    const fields: {
        key: string;
        label: string;
        usage: number;
        limit?: number | null;
        value: string;
        setter: (v: string) => void;
    }[] = [
        { key: "max_studios", label: "Studios", usage: u?.studios ?? 0, limit: l?.max_studios, value: maxStudios, setter: setMaxStudios },
    ];
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
            User Limits — {user.display_name || user.username}
          </DialogTitle>
          <DialogDescription className="text-xs font-mono break-all">{user.id}</DialogDescription>
        </DialogHeader>

        {loading ? (<div className="space-y-3 py-2">
            <Skeleton className="h-20 w-full"/>
            <Skeleton className="h-10 w-full"/>
          </div>) : (<div className="space-y-5 py-2">
            {/* Usage summary */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Usage</p>
              {fields.map((f) => (<div key={f.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-semibold">
                      {f.usage}
                      {f.limit != null ? (<span className="text-muted-foreground font-normal"> / {f.limit}</span>) : (<span className="text-muted-foreground font-normal"> / ∞</span>)}
                    </span>
                  </div>
                  <UsageBar value={f.usage} limit={f.limit}/>
                </div>))}
            </div>

            {/* Edit limits */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit Limits</p>
              {fields.map((f) => (<div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={f.key}>Max {f.label}</Label>
                    <span className="text-xs text-muted-foreground">
                      Current usage: <span className="font-semibold text-foreground">{f.usage}</span>
                    </span>
                  </div>
                  <Input id={f.key} type="number" min={0} placeholder="unlimited" value={f.value} onChange={(e) => f.setter(e.target.value)}/>
                </div>))}
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
