"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TwoFactorProofInput } from "@/components/two-factor-proof-input";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { updateGame } from "@/lib/game-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { factorProof, twoFactorErrorKey, validFactorProof } from "@/lib/two-factor-api";
import type { Game } from "@/types/game";

export function GameSettingTwoFactorDialog({ game, setting, enabled, onUpdate, onClose }: {
    game: Game;
    setting: "allow_player_2fa" | "allow_new_players";
    enabled: boolean;
    onUpdate: (game: Game) => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [proof, setProof] = useState("");
    const [recovery, setRecovery] = useState(false);
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const isPlayer2FA = setting === "allow_player_2fa";

    const submit = async (value = proof) => {
        if (submitting.current || !validFactorProof(value, recovery)) return;
        submitting.current = true;
        setBusy(true);
        setError(null);
        try {
            const updated = await updateGame(game.id, {
                settings: { ...game.settings, [setting]: enabled },
                ...factorProof(value, recovery),
            }, { suppressToast: true });
            onUpdate(updated);
            toast({ title: t("game.settingsUpdated"), description: t(isPlayer2FA ? "game.allowPlayer2FA" : "gameUsers.allowNewPlayers") });
            onClose();
        } catch (err) {
            const code = err instanceof ApiError ? err.data?.message_code : undefined;
            setError(t(typeof code === "string" && code.startsWith("TWO_FACTOR_") ? twoFactorErrorKey(err) : "game.failedUpdateSettings"));
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    };

    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
        <DialogContent id="game-player-2fa-dialog">
            <DialogHeader id="game-player-2fa-dialog-header">
                <DialogTitle id="game-player-2fa-dialog-title">{t(isPlayer2FA ? "game.player2FAConfirmTitle" : "game.newPlayersConfirmTitle")}</DialogTitle>
                <DialogDescription id="game-player-2fa-dialog-description">{t(isPlayer2FA ? "game.player2FAConfirmDesc" : "game.newPlayersConfirmDesc")}</DialogDescription>
            </DialogHeader>
            <TwoFactorProofInput id="game-player-2fa-proof" value={proof} onChange={value => {
                setProof(value);
                if (!recovery && validFactorProof(value, false)) void submit(value);
            }} recovery={recovery} onRecoveryChange={setRecovery} disabled={busy}/>
            <DialogFooter id="game-player-2fa-dialog-footer" className="flex-col gap-3 sm:items-center sm:space-x-0">
                {error && <p id="game-player-2fa-dialog-error" role="alert" className="text-left text-sm text-destructive sm:mr-auto">{error}</p>}
                <div id="game-player-2fa-dialog-actions" className="flex justify-end gap-2">
                    <Button id="game-player-2fa-dialog-cancel" variant="outline" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button>
                    <Button id="game-player-2fa-dialog-confirm" disabled={busy || !validFactorProof(proof, recovery)} onClick={() => void submit()}>{t(busy ? "common.saving" : "common.confirm")}</Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>;
}
