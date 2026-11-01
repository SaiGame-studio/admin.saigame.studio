"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { disableAdminUserTwoFactor } from "@/lib/admin-user-two-factor-api";

export function AdminUserTwoFactorToggle({ userId, name, enabled, loading, onDisabled }: {
    userId: string; name: string; enabled: boolean | undefined; loading: boolean; onDisabled: (userId: string) => void;
}) {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const id = `admin-user-2fa-${userId}`;
    const disable = async () => {
        if (busy || enabled !== true) return;
        setOpen(false); setBusy(true);
        try {
            const result = await disableAdminUserTwoFactor(userId);
            onDisabled(userId);
            toast({ title: t("adminTwoFactor.disabledSuccess"), description: t("adminTwoFactor.sessionsRevoked", { name }) });
            if (result.reauthentication_required) logout();
        } catch {
            toast({ variant: "destructive", title: t("adminTwoFactor.failed"), description: t("adminTwoFactor.failedHelp") });
        } finally { setBusy(false); }
    };
    const label = loading ? "adminTwoFactor.loading" : enabled === undefined ? "adminTwoFactor.unavailable" : enabled ? "twoFactor.enabled" : "twoFactor.disabled";
    return <div id={id} className="space-y-1" onClick={event => event.stopPropagation()}>
        <div id={`${id}-control`} className="flex items-center gap-2">
            <Switch id={`${id}-switch`} checked={enabled === true} disabled={loading || enabled !== true || busy}
                aria-label={t("adminTwoFactor.disableLabel", { name })}
                onCheckedChange={checked => { if (!checked && enabled === true && !busy) setOpen(true); }} />
            <span id={`${id}-status`} className="text-xs text-muted-foreground">{t(label)}</span>
        </div>
        <p id={`${id}-help`} className="max-w-48 text-xs text-muted-foreground">{t("adminTwoFactor.disableOnly")}</p>
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent id={`${id}-dialog`}>
                <AlertDialogHeader id={`${id}-dialog-header`}>
                    <AlertDialogTitle id={`${id}-dialog-title`}>{t("adminTwoFactor.confirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription id={`${id}-dialog-description`}>{t("adminTwoFactor.confirmHelp", { name })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter id={`${id}-dialog-footer`}>
                    <AlertDialogCancel id={`${id}-cancel`} disabled={busy}>{t("twoFactor.cancel")}</AlertDialogCancel>
                    <AlertDialogAction id={`${id}-confirm`} disabled={busy} onClick={disable}>{t("adminTwoFactor.confirmDisable")}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>;
}
