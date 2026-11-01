"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteGame } from "@/lib/game-api";
import type { Game } from "@/types/game";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DeletionTwoFactorFields, useDeletionTwoFactor } from "@/components/deletion-two-factor";
interface DeleteGameDialogProps {
    game: Game;
}
export function DeleteGameDialog({ game }: DeleteGameDialogProps) {
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const factor = useDeletionTwoFactor(open);
    const submitting = useRef(false);
    const isConfirmed = confirmText === game.name;
    async function handleDelete(code = factor.value) {
        if (!open || !isConfirmed || loading || submitting.current || !factor.canSubmit(code))
            return;
        submitting.current = true;
        try {
            setLoading(true);
            await deleteGame(game.id, factor.proofFor(code));
            toast({
                title: "Success",
                description: "Game deleted successfully.",
            });
            setOpen(false);
            // Redirect to studio page or games list
            if (game.studio_id) {
                router.push(`/studios/${game.studio_id}`);
            }
            else {
                router.push("/games");
            }
        }
        catch (err) {
            if (factor.handleError(err)) return;
            console.error("Failed to delete game:", err);
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to delete game. Please try again.",
                variant: "destructive",
            });
        }
        finally {
            submitting.current = false;
            setLoading(false);
        }
    }
    return (<AlertDialog open={open} onOpenChange={value => { if (!loading) { setOpen(value); setConfirmText(""); } }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4"/>
          Delete Game
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Game - Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold text-destructive">
              This action cannot be undone! This will permanently delete:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>The game <strong>{game.name}</strong></li>
              <li>All game data and configurations</li>
              <li>All associated shops and items</li>
              <li>All player data and progress</li>
              <li>All statistics and analytics</li>
            </ul>
            <div className="pt-4 space-y-2">
              <Label htmlFor="confirm-name" className="text-foreground">
                Please type <strong className="font-mono bg-muted px-1 py-0.5 rounded">{game.name}</strong> to confirm:
              </Label>
              <Input id="confirm-name" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type game name here" disabled={loading} className="font-mono"/>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <DeletionTwoFactorFields id="game-delete-two-factor" factor={factor} disabled={loading || !isConfirmed} onComplete={code => void handleDelete(code)} />
        <AlertDialogFooter id="game-delete-footer" className="flex-row items-center justify-between gap-3 sm:space-x-0">
          {factor.error && <p id="game-delete-two-factor-error" role="alert" className="min-w-0 flex-1 text-left text-sm text-destructive">{factor.error}</p>}
          <div id="game-delete-actions" className="ml-auto flex shrink-0 items-center gap-2">
          <AlertDialogCancel id="game-delete-cancel" className="mt-0" disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => {
            e.preventDefault();
            handleDelete();
        }} disabled={loading || !isConfirmed || !factor.ready} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Delete Permanently
          </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>);
}
