"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { createTeam } from "@/lib/team-api";
import { fetchStudio } from "@/lib/studio-api";
import type { Team } from "@/types/team";
import type { StudioLimits, StudioUsage } from "@/types/studio";
import { useTranslation } from "@/lib/i18n/use-translation";
const TEAM_COST = 10;
interface CreateTeamDialogProps {
    studioId: string;
    existingTeamCount?: number;
    onTeamCreated: (team: Team) => void;
}
export default function CreateTeamDialog({ studioId, existingTeamCount = 0, onTeamCreated }: CreateTeamDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [usageLimits, setUsageLimits] = useState<{
        usage: StudioUsage;
        limits: StudioLimits;
    } | null>(null);
    const [usageLoading, setUsageLoading] = useState(false);
    const { t } = useTranslation();
    // Fetch fresh studio usage whenever the dialog opens
    useEffect(() => {
        if (!open)
            return;
        setUsageLoading(true);
        fetchStudio(studioId)
            .then(s => {
            if (s.usage && s.limits) {
                setUsageLimits({ usage: s.usage, limits: s.limits });
            }
        })
            .catch(() => { })
            .finally(() => setUsageLoading(false));
    }, [open, studioId]);
    // Use fetched data if available, otherwise fall back to prop
    const currentTeamCount = usageLimits?.usage.teams ?? existingTeamCount;
    const maxTeams = usageLimits?.limits.max_teams ?? null;
    const willCharge = maxTeams != null ? currentTeamCount >= maxTeams : currentTeamCount >= 1;
    const doCreate = async () => {
        try {
            setLoading(true);
            setError(null);
            const newTeam = await createTeam(studioId, {
                name: name.trim(),
                description: description.trim() || undefined,
            });
            window.dispatchEvent(new Event("wallet:refresh"));
            onTeamCreated(newTeam);
            setOpen(false);
            setName("");
            setDescription("");
        }
        catch (err) {
            console.error("Failed to create team:", err);
            setError(err instanceof Error ? err.message : t('team.failedCreate'));
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError(t('team.nameRequired'));
            return;
        }
        if (willCharge) {
            setShowConfirm(true);
            return;
        }
        await doCreate();
    };
    const handleOpenChange = (newOpen: boolean) => {
        if (!loading) {
            setOpen(newOpen);
            if (!newOpen) {
                setName("");
                setDescription("");
                setError(null);
                setUsageLimits(null);
            }
        }
    };
    return (<>
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4"/>
        {t('team.create')}
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <SheetHeader>
            <SheetTitle>{t('team.createTitle')}</SheetTitle>
            <SheetDescription>
              {t('team.createDesc')}
            </SheetDescription>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {t('team.createCostHintPt1')}<span className="text-green-500 font-medium">{t('team.createCostHintFree')}</span>{t('team.createCostHintPt2')}<span className="text-yellow-500 font-medium">🪙 {TEAM_COST} coins</span>
              </p>
              {usageLoading ? (<Badge variant="outline" className="text-xs shrink-0 ml-2">
                  <Loader2 className="h-3 w-3 animate-spin mr-1"/>
                  Loading...
                </Badge>) : (<Badge variant="outline" className={`text-xs shrink-0 ml-2 ${maxTeams != null && currentTeamCount >= maxTeams
                ? "border-red-400 text-red-500"
                : "border-muted-foreground/40 text-muted-foreground"}`}>
                  Teams: {currentTeamCount}{maxTeams != null ? ` / ${maxTeams}` : ""}
                </Badge>)}
            </div>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('team.nameLabel')} <span className="text-destructive">*</span>
              </Label>
              <Input id="name" placeholder={t('team.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} disabled={loading} required/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('team.descriptionLabel')}</Label>
              <Textarea id="description" placeholder={t('team.descriptionPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} rows={4}/>
            </div>
            {error && (<div className="text-sm text-destructive">{error}</div>)}
          </div>
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {loading ? t('team.creating') : t('team.create')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Create Team</AlertDialogTitle>
            <AlertDialogDescription>
              🪙 <strong>{TEAM_COST} coins</strong> will be charged from your wallet to create this team. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={loading} onClick={async () => {
            setShowConfirm(false);
            await doCreate();
        }}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);
}
