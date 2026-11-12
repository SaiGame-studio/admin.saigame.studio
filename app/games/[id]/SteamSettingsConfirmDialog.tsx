"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTwoFactorLockout } from "@/hooks/use-two-factor-lockout";
import { ApiError } from "@/lib/api-client";
import { factorProof, twoFactorErrorKey, validFactorProof } from "@/lib/two-factor-api";
import { saveGameSteamSettings, type GameSteamSettings, type UpdateGameSteamSettings } from "@/lib/game-steam-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { TwoFactorProofInput } from "@/components/two-factor-proof-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SteamSettingsConfirmDialog({ gameId, input, onSaved, onClose }: {
    gameId: string; input: UpdateGameSteamSettings; onSaved: (settings: GameSteamSettings) => void; onClose: () => void;
}) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { secondsRemaining, lockFor } = useTwoFactorLockout(user?.id);
    const [proof, setProof] = useState("");
    const [recovery, setRecovery] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submitting = useRef(false);
    const locked = secondsRemaining > 0;
    const submit = async (value = proof) => {
        if (submitting.current || locked || !validFactorProof(value, recovery)) return;
        submitting.current = true; setBusy(true); setError(null);
        try { onSaved(await saveGameSteamSettings(gameId, input, factorProof(value, recovery))); }
        catch (err) {
            const code = err instanceof ApiError ? err.data?.message_code : undefined;
            if (code === "TWO_FACTOR_RATE_LIMITED") {
                const seconds = Number(err instanceof ApiError ? err.data?.retry_after : undefined);
                lockFor(Number.isFinite(seconds) && seconds > 0 ? Math.min(300, Math.ceil(seconds)) : 300);
            } else {
                const key = typeof code === "string" && code.startsWith("TWO_FACTOR_") ? twoFactorErrorKey(err)
                    : code === "STEAM_SECRETS_UNAVAILABLE" ? "steam.secretsUnavailable"
                    : code === "STEAM_REWARD_ITEM_NOT_FOUND" ? "steam.itemInvalid"
                    : code === "STEAM_SETTINGS_INVALID" ? "steam.invalid" : "steam.saveFailed";
                setError(t(key));
            }
        } finally { submitting.current = false; setBusy(false); }
    };
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
        <DialogContent id="game-steam-confirm-dialog">
            <DialogHeader id="game-steam-confirm-header">
                <DialogTitle id="game-steam-confirm-title">{t("steam.confirmTitle")}</DialogTitle>
                <DialogDescription id="game-steam-confirm-description">{t("steam.confirmDescription")}</DialogDescription>
            </DialogHeader>
            <TwoFactorProofInput id="game-steam-confirm-proof" value={proof} onChange={setProof} recovery={recovery} onRecoveryChange={setRecovery} onComplete={value => void submit(value)} disabled={busy || locked}/>
            {(error || locked) && <p id="game-steam-confirm-error" role="alert" className="text-sm text-destructive">{locked ? t("twoFactor.retryIn", { time: `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}` }) : error}</p>}
            <DialogFooter id="game-steam-confirm-footer">
                <Button id="game-steam-confirm-cancel" variant="outline" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button>
                <Button id="game-steam-confirm-save" disabled={busy || locked || !validFactorProof(proof, recovery)} onClick={() => void submit()}>{t(busy ? "common.saving" : "common.confirm")}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>;
}
