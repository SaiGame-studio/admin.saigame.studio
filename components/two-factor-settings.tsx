"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "@/lib/i18n/use-translation";
import { factorProof, validFactorProof, twoFactorApi, twoFactorErrorKey, type TwoFactorSetup, type TwoFactorStatus, type TwoFactorChange } from "@/lib/two-factor-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TwoFactorProofInput } from "@/components/two-factor-proof-input";
import { TwoFactorRecoveryCodes } from "@/components/two-factor-recovery-codes";
import { SUPPORT_CHAT_OPEN_EVENT } from "@/components/support-chat-widget";

type SecurityAction = "disable" | "replace" | "regenerate" | null;

export function TwoFactorSettings({ id }: { id: string }) {
    const { t } = useTranslation();
    const { logout, user } = useAuth();
    const [status, setStatus] = useState<TwoFactorStatus | null>(null);
    const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
    const [action, setAction] = useState<SecurityAction>(null);
    const [code, setCode] = useState("");
    const [recovery, setRecovery] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<TwoFactorChange | null>(null);
    useEffect(() => {
        if (result) return;
        let cancelled = false;
        twoFactorApi.status().then(value => { if (!cancelled) setStatus(value); })
            .catch(err => { if (!cancelled) setError(t(twoFactorErrorKey(err))); });
        return () => { cancelled = true; };
    }, [t, result]);
    const reset = () => { setSetup(null); setAction(null); setCode(""); setRecovery(false); setError(""); };
    const selectAction = (value: SecurityAction) => { reset(); setAction(value); };
    const begin = async () => {
        setBusy(true); setError("");
        try { setSetup(await twoFactorApi.setup()); setCode(""); setRecovery(false); }
        catch (err) { setError(t(twoFactorErrorKey(err))); }
        finally { setBusy(false); }
    };
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setBusy(true); setError("");
        try {
            if (action === "replace" && !setup) {
                setSetup(await twoFactorApi.replacementSetup(factorProof(code, recovery)));
                setCode(""); setRecovery(false);
                return;
            }
            const changed = setup
                ? action === "replace" ? await twoFactorApi.replacementConfirm(code) : await twoFactorApi.change(true, { code })
                : action === "regenerate" ? await twoFactorApi.regenerateRecovery(factorProof(code, recovery))
                : await twoFactorApi.change(false, factorProof(code, recovery));
            reset(); setResult(changed);
        } catch (err) {
            setError(t(twoFactorErrorKey(err)));
            twoFactorApi.status().then(setStatus).catch(() => undefined);
        } finally { setBusy(false); }
    };
    const hasForm = setup !== null || action !== null;
    const submitKey = setup ? "twoFactor.confirm" : action === "replace" ? "twoFactor.continueReplacement" : action === "regenerate" ? "twoFactor.regenerateCodes" : "twoFactor.disable";
    return <Card id={id}>
        <CardHeader id="user-2fa-header"><CardTitle id="user-2fa-title">{t("twoFactor.title")}</CardTitle></CardHeader>
        <CardContent id="user-2fa-content" className="space-y-4">
            {error && <p id="user-2fa-error" role="alert" className="text-sm text-destructive">{error}</p>}
            {result ? result.recovery_codes?.length ? <TwoFactorRecoveryCodes id="user-2fa-recovery-codes" codes={result.recovery_codes} issuer={result.issuer || "SaiGame"} accountEmail={user?.email || ""} onContinue={logout} /> : <div id="user-2fa-completed" className="space-y-3">
                <p id="user-2fa-completed-message" className="text-sm">{t("twoFactor.changed")}</p>
                <Button id="user-2fa-sign-in" onClick={logout}>{t("twoFactor.signInAgain")}</Button>
            </div> : status && <>
                <p id="user-2fa-status" className="text-sm">{t(status.enabled ? "twoFactor.enabled" : "twoFactor.disabled")}</p>
                {!status.available && <p id="user-2fa-unavailable" className="text-sm text-muted-foreground">{t("twoFactor.unavailable")}</p>}
                {status.enabled && <p id="user-2fa-recovery-count" className="text-sm">{t("twoFactor.codesRemaining", { count: status.recovery_codes_remaining })}</p>}
                {status.enabled && status.recovery_codes_remaining === 0 && <p id="user-2fa-recovery-warning" className="text-sm text-destructive">{t("twoFactor.noRecoveryCodes")}</p>}
                {!hasForm && <div id="user-2fa-management-actions" className="flex flex-wrap gap-2">
                    {!status.enabled ? <Button id="user-2fa-enable" disabled={busy || !status.available} onClick={begin}>{t("twoFactor.enable")}</Button> : <>
                        <Button id="user-2fa-replace" variant="outline" disabled={busy || !status.available} onClick={() => selectAction("replace")}>{t("twoFactor.changeDevice")}</Button>
                        <Button id="user-2fa-regenerate" variant="outline" disabled={busy} onClick={() => selectAction("regenerate")}>{t("twoFactor.regenerateCodes")}</Button>
                    </>}
                </div>}
                {!hasForm && status.enabled && <div id="user-2fa-disable-row" className="flex flex-wrap items-center gap-2">
                    <Button id="user-2fa-disable" variant="outline" disabled={busy || !status.can_disable} onClick={() => selectAction("disable")}>{t("twoFactor.disable")}</Button>
                    {!status.can_disable && <div id="user-2fa-disable-notes" className="text-sm text-muted-foreground">
                        <p id="user-2fa-studio-lock">{t("twoFactor.studioLocked")}</p>
                        <p id="user-2fa-support-note">{t("twoFactor.disableSupportNote")} <button id="user-2fa-support-chat" type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => window.dispatchEvent(new CustomEvent(SUPPORT_CHAT_OPEN_EVENT))}>Sai</button></p>
                    </div>}
                </div>}
                {action === "replace" && <p id="user-2fa-replace-help" className="text-sm text-muted-foreground">{t(setup ? "twoFactor.replacementScanHelp" : "twoFactor.replacementHelp")}</p>}
                {action === "regenerate" && <p id="user-2fa-regenerate-help" className="text-sm text-muted-foreground">{t("twoFactor.regenerateHelp")}</p>}
                {setup && <div id="user-2fa-setup" className="space-y-3">
                    <p id="user-2fa-scan-help" className="text-sm">{t("twoFactor.scan")}</p>
                    <img id="user-2fa-qr" src={setup.qr_code} alt={t("twoFactor.qrAlt")} width={256} height={256} />
                    <p id="user-2fa-manual-help" className="text-sm">{t("twoFactor.manualKey")}</p>
                    <code id="user-2fa-secret" className="block break-all rounded bg-muted p-2">{setup.secret}</code>
                    <p id="user-2fa-expiry" className="text-xs text-muted-foreground">{t("twoFactor.setupExpiry")}</p>
                </div>}
                {hasForm && <form id="user-2fa-form" onSubmit={submit} className="space-y-3">
                    <TwoFactorProofInput id="user-2fa-proof" value={code} onChange={setCode} recovery={recovery} onRecoveryChange={setRecovery} disabled={busy} allowRecovery={!setup} />
                    <div id="user-2fa-actions" className="flex gap-2">
                        <Button id="user-2fa-submit" disabled={busy || !validFactorProof(code, recovery)}>{t(submitKey)}</Button>
                        <Button id="user-2fa-cancel" type="button" variant="outline" disabled={busy} onClick={reset}>{t("twoFactor.cancel")}</Button>
                    </div>
                </form>}
            </>}
        </CardContent>
    </Card>;
}
