"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { removeMemberFromTeam } from "@/lib/team-api";
import type { TeamMember } from "@/types/team";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
interface RemoveMemberDialogProps {
    teamId: string;
    member: TeamMember;
    onMemberRemoved?: () => void;
}
export function RemoveMemberDialog({ teamId, member, onMemberRemoved }: RemoveMemberDialogProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    async function handleRemove() {
        try {
            setLoading(true);
            await removeMemberFromTeam(teamId, member.id);
            toast({
                title: t('common.success'),
                description: t('team.removeMemberSuccess'),
            });
            setOpen(false);
            if (onMemberRemoved) {
                onMemberRemoved();
            }
        }
        catch (err) {
            console.error("Failed to remove member:", err);
            toast({
                title: t('common.error'),
                description: err instanceof Error ? err.message : t('studio.removeMemberError'),
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    }
    return (<AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
          <Trash2 className="h-3 w-3"/>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('team.removeMemberTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('team.removeMemberConfirmPrefix')} <strong>{member.display_name || member.username || "this member"}</strong> {t('team.removeMemberConfirmSuffix')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => {
            e.preventDefault();
            handleRemove();
        }} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {t('team.remove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>);
}
