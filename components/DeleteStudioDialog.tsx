"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { ApiError } from "@/lib/api-client";
import { deleteStudio } from "@/lib/studio-api";
import type { Studio } from "@/types/studio";
import { Button } from "@/components/ui/button";
import { DeletionTwoFactorFields, useDeletionTwoFactor } from "@/components/deletion-two-factor";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DeleteStudioDialog({ id, studio, disabled }: { id: string; studio: Studio; disabled: boolean }) {
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user, refreshUser } = useAuth();
    const { t } = useTranslation();
    const { toast } = useToast();
    const router = useRouter();
    const factor = useDeletionTwoFactor(open);
    const submitting = useRef(false);

    if (user?.id !== studio.owner_user_id) return null;

    async function handleDelete(code = factor.value) {
        if (!open || disabled || deleting || submitting.current || !factor.canSubmit(code)) return;
        submitting.current = true;
        setDeleting(true);
        setError(null);
        try {
            await deleteStudio(studio.id, factor.proofFor(code));
        } catch (err) {
            submitting.current = false;
            if (factor.handleError(err)) {
                setDeleting(false);
                return;
            }
            const code = err instanceof ApiError ? err.data?.message_code : undefined;
            const key = code === "STUDIO_HAS_GAMES" ? "deleteHasGames"
                : code === "FORBIDDEN" ? "deleteForbidden"
                : code === "STUDIO_NOT_FOUND" ? "deleteNotFound" : "deleteFailed";
            setError(t(`studio.${key}`));
            setDeleting(false);
            return;
        }
        toast({ title: t("studio.deleteSuccess") });
        await refreshUser();
        router.replace("/studios");
        router.refresh();
    }

    return (
        <AlertDialog open={open} onOpenChange={value => {
            if (!deleting) { setOpen(value); setError(null); }
        }}>
            <AlertDialogTrigger id={`${id}-trigger`} asChild>
                <Button id={`${id}-button`} variant="destructive" disabled={disabled || deleting}>
                    <Trash2 id={`${id}-icon`} className="mr-2 h-4 w-4" />
                    {t("studio.deleteAction")}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent id={`${id}-dialog`}>
                <AlertDialogHeader id={`${id}-header`}>
                    <AlertDialogTitle id={`${id}-title`}>{t("studio.deleteTitle", { name: studio.name })}</AlertDialogTitle>
                    <AlertDialogDescription id={`${id}-description`}>{t("studio.deleteDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <DeletionTwoFactorFields id={`${id}-two-factor`} factor={factor} disabled={deleting || disabled} onComplete={code => void handleDelete(code)} />
                <AlertDialogFooter id={`${id}-footer`} className="flex-row items-center justify-between gap-3 sm:space-x-0">
                    {(factor.error || error) && <p id={`${id}-error`} role="alert" className="min-w-0 flex-1 text-left text-sm text-destructive">{factor.error || error}</p>}
                    <div id={`${id}-actions`} className="ml-auto flex shrink-0 items-center gap-2">
                    <AlertDialogCancel id={`${id}-cancel`} className="mt-0" disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction id={`${id}-confirm`} disabled={disabled || deleting || !factor.ready} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={event => {
                        event.preventDefault();
                        void handleDelete();
                    }}>{deleting ? t("common.loading") : t("studio.deleteAction")}</AlertDialogAction>
                    </div>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
