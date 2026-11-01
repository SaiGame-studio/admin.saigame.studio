"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TwoFactorProofInput } from "@/components/two-factor-proof-input";

import { useTranslation } from "@/lib/i18n/use-translation";
import { twoFactorApi, twoFactorErrorKey, factorProof, validFactorProof, type TwoFactorChallenge, type TwoFactorLogin as LoginResult } from "@/lib/two-factor-api";

export function TwoFactorLogin({ id, challenge, onSuccess, onCancel }: { id: string; challenge: TwoFactorChallenge; onSuccess: (result: LoginResult) => void; onCancel: () => void }) {
    const { t } = useTranslation();
    const [code, setCode] = useState("");
    const [recovery, setRecovery] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const submitting = useRef(false);
    const submit = async (event?: FormEvent, value = code) => {
        event?.preventDefault();
        if (submitting.current || !validFactorProof(value, recovery)) return;
        submitting.current = true; setBusy(true); setError("");
        try { onSuccess(await twoFactorApi.verify(challenge, factorProof(value,recovery))); }
        catch (err) { setError(t(twoFactorErrorKey(err))); setCode(""); }
        finally { submitting.current = false; setBusy(false); }
    };
    return <form id={id} onSubmit={submit} className="space-y-4 rounded-lg border p-6">
        <h2 id="login-2fa-title" className="text-lg font-semibold">{t("twoFactor.title")}</h2>
        <p id="login-2fa-help" className="text-sm text-muted-foreground">{t("twoFactor.loginHelp")}</p>
        {error && <p id="login-2fa-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <TwoFactorProofInput id="login-2fa-proof" value={code} onChange={setCode} onComplete={value => void submit(undefined, value)} recovery={recovery} onRecoveryChange={setRecovery} disabled={busy} />
        <Button id="login-2fa-submit" type="submit" disabled={busy || !validFactorProof(code,recovery)}>{t("twoFactor.verify")}</Button>
        <Button id="login-2fa-back" type="button" variant="outline" disabled={busy} onClick={onCancel}>{t("twoFactor.back")}</Button>
    </form>;
}
