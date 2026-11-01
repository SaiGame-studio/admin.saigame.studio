"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { fetchStudioGames } from "@/lib/studio-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Studio } from "@/types/studio";
import DeleteStudioDialog from "@/components/DeleteStudioDialog";

export default function StudioDeletePanel({ studio }: { studio: Studio }) {
    const { t } = useTranslation();
    const [gameCount, setGameCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setGameCount(null);
        setFailed(false);
        fetchStudioGames(studio.id)
            .then(games => { if (!cancelled) setGameCount(games.length); })
            .catch(() => { if (!cancelled) setFailed(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [studio.id]);

    return (
        <div id="studio-delete-panel" className="space-y-4">
            <p id="studio-delete-game-count" className="text-sm font-medium" aria-live="polite">
                {t("studio.gamesCount")}: {loading ? t("common.loading") : gameCount ?? "—"}
            </p>
            {failed && <p id="studio-delete-count-error" role="alert" className="text-sm text-destructive">{t("common.error")}</p>}
            <div id="studio-delete-actions" className="flex items-center gap-3">
                <DeleteStudioDialog id="studio-details-delete" studio={studio} disabled={loading || failed || gameCount !== 0} />
                {gameCount !== null && gameCount > 0 && (
                    <div id="studio-delete-games-warning" role="alert" className="flex min-w-0 items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle id="studio-delete-games-warning-icon" className="h-4 w-4 shrink-0" />
                        <span id="studio-delete-games-warning-text">{t("studio.deleteHasGames")}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
