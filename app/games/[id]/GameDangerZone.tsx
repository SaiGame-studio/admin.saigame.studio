"use client";

import { DeleteGameDialog } from "@/components/DeleteGameDialog";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";

/** Delete Game tab: the danger zone with the delete action (confirmed by typing the game name). */
export function GameDangerZone({ game }: { game: Game }) {
    const { t } = useTranslation();
    return (
        <div id="game-detail-danger-zone" className="game-detail-danger-zone flex flex-col gap-4 rounded-md border border-destructive/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div id="game-detail-danger-zone-text" className="game-detail-danger-zone-text space-y-1">
                <h3 id="game-detail-danger-zone-title" className="game-detail-danger-zone-title font-semibold text-destructive">{t("game.deleteGameTitle")}</h3>
                <p id="game-detail-danger-zone-description" className="game-detail-danger-zone-description text-sm text-muted-foreground">{t("game.deleteGameDescription")}</p>
            </div>
            <DeleteGameDialog game={game}/>
        </div>
    );
}
