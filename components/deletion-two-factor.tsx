"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTwoFactorLockout } from "@/hooks/use-two-factor-lockout";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { factorProof, twoFactorApi, twoFactorErrorKey, validFactorProof } from "@/lib/two-factor-api";
import { TwoFactorProofInput } from "@/components/two-factor-proof-input";

export function useDeletionTwoFactor(open: boolean) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { secondsRemaining, lockFor } = useTwoFactorLockout(user?.id);
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [value, setValue] = useState("");
    const [recovery, setRecovery] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setEnabled(null);
        setValue("");
        setRecovery(false);
        setError(null);
        if (open && user?.id) {
            twoFactorApi.status()
                .then(status => { if (!cancelled) setEnabled(status.enabled); })
                .catch(() => { if (!cancelled) setError(t("twoFactor.unavailable")); });
        }
        return () => { cancelled = true; };
    }, [open, user?.id, t]);

    const handleError = (err: unknown) => {
        const code = err instanceof ApiError ? err.data?.message_code : undefined;
        if (typeof code !== "string" || !code.startsWith("TWO_FACTOR_")) return false;
        if (code === "TWO_FACTOR_INVALID_CODE") {
            setEnabled(true);
        } else {
            setValue("");
        }
        if (code === "TWO_FACTOR_RATE_LIMITED") {
            const seconds = Number(err instanceof ApiError ? err.data?.retry_after : undefined);
            lockFor(Number.isFinite(seconds) && seconds > 0 ? Math.min(300, Math.ceil(seconds)) : 300);
        }
        setError(t(twoFactorErrorKey(err)));
        return true;
    };

    const waitTime = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`;
    const canSubmit = (code: string) => enabled !== null && (!enabled || (secondsRemaining === 0 && validFactorProof(code, recovery)));
    return {
        enabled, value, setValue, recovery, setRecovery, handleError,
        locked: secondsRemaining > 0,
        ready: canSubmit(value),
        canSubmit,
        proofFor: (code: string) => enabled ? factorProof(code, recovery) : {},
        error: secondsRemaining > 0 ? t("twoFactor.retryIn", { time: waitTime }) : error,
    };
}

export function DeletionTwoFactorFields({ id, factor, disabled, onComplete }: {
    id: string; factor: ReturnType<typeof useDeletionTwoFactor>; disabled: boolean; onComplete: (code: string) => void;
}) {
    const { t } = useTranslation();
    return <div id={id} className="space-y-3">
        {factor.enabled === null && !factor.error && <p id={`${id}-loading`} className="text-sm text-muted-foreground">{t("common.loading")}</p>}
        {factor.enabled && <TwoFactorProofInput id={`${id}-proof`} value={factor.value} onChange={factor.setValue} recovery={factor.recovery} onRecoveryChange={factor.setRecovery} disabled={disabled || factor.locked} onComplete={onComplete} />}
    </div>;
}
