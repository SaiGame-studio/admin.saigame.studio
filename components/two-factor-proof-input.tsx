"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/use-translation";

export function TwoFactorProofInput({ id, value, onChange, recovery, onRecoveryChange, disabled, onComplete, allowRecovery = true }: {
    id: string; value: string; onChange: (value: string) => void; recovery: boolean;
    onRecoveryChange: (value: boolean) => void; disabled: boolean; onComplete: (value: string) => void; allowRecovery?: boolean;
}) {
    const { t } = useTranslation();
    return <div id={id} className="space-y-3">
        <Label id={`${id}-label`} htmlFor={`${id}-value`}>{t(recovery ? "twoFactor.recoveryCode" : "twoFactor.code")}</Label>
        <Input id={`${id}-value`} value={value} onChange={event => {
            if (disabled) return;
            const next = recovery ? event.target.value.replace(/[^a-f0-9-]/gi, "").toUpperCase().slice(0, 35) : event.target.value.replace(/\D/g, "").slice(0, 6);
            onChange(next);
            if (!recovery && next.length === 6 && next !== value) onComplete(next);
        }}
            inputMode={recovery ? "text" : "numeric"} autoComplete={recovery ? "off" : "one-time-code"} maxLength={recovery ? 35 : 6} required disabled={disabled} spellCheck={false} />
        {allowRecovery && <Button id={`${id}-toggle`} type="button" variant="link" disabled={disabled} onClick={() => { onChange(""); onRecoveryChange(!recovery); }}>{t(recovery ? "twoFactor.useAuthenticator" : "twoFactor.useRecovery")}</Button>}
    </div>;
}
