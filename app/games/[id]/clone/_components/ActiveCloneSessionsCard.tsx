"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveCloneSessions, type ActiveCloneSessionsResponse } from "@/lib/game-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { cn } from "@/lib/utils";
import { formatDurationCompact, formatTechnicalLabel, getCloneSessionErrorMessage, getCloneSessionStatusStyle } from "./cloneSessionProgressUtils";

type ActiveCloneSessionsCardProps = {
    sourceGameId: string;
};

function getRemainingSeconds(
    expiresInSeconds: number | undefined,
    expiresAt: number | undefined,
    loadedAtMs: number,
    nowMs: number,
) {
    if (typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)) {
        const elapsedSeconds = Math.max(0, Math.floor((nowMs - loadedAtMs) / 1000));
        return Math.max(0, Math.floor(expiresInSeconds) - elapsedSeconds);
    }

    if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
        return Math.max(0, Math.floor(expiresAt - nowMs / 1000));
    }

    return null;
}

export function ActiveCloneSessionsCard({ sourceGameId }: ActiveCloneSessionsCardProps) {
    const { t } = useTranslation();
    const [data, setData] = useState<ActiveCloneSessionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadedAtMs, setLoadedAtMs] = useState(() => Date.now());
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNowMs(Date.now());
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await getActiveCloneSessions(sourceGameId);
                if (cancelled) {
                    return;
                }

                setData(response);
                setLoadedAtMs(Date.now());
            } catch (nextError) {
                if (cancelled) {
                    return;
                }

                const status = (nextError as { status?: number } | null | undefined)?.status;
                if (status === 404) {
                    setData({
                        source_game_id: sourceGameId,
                        active_session_count: 0,
                        active_sessions: [],
                    });
                    setLoadedAtMs(Date.now());
                } else {
                    setData(null);
                    setError(getCloneSessionErrorMessage(nextError, t));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [sourceGameId, t]);

    const activeSessions = useMemo(() => (
        Array.isArray(data?.active_sessions) ? data.active_sessions : []
    ), [data?.active_sessions]);

    return (
        <Card id="clone-game-active-source-sessions-card">
            <CardHeader id="clone-game-active-source-sessions-header" className="flex flex-row items-start justify-between gap-3">
                <div id="clone-game-active-source-sessions-header-copy" className="space-y-1">
                    <CardTitle id="clone-game-active-source-sessions-title">
                        {t("cloneGame.activeSourceSessionsTitle")}
                    </CardTitle>
                    <CardDescription id="clone-game-active-source-sessions-description">
                        {t("cloneGame.activeSourceSessionsDescription")}
                    </CardDescription>
                </div>
                <Button
                    id="clone-game-active-source-sessions-refresh-btn"
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        setLoading(true);
                        setError(null);
                        void getActiveCloneSessions(sourceGameId)
                            .then((response) => {
                                setData(response);
                                setLoadedAtMs(Date.now());
                            })
                            .catch((nextError) => {
                                const status = (nextError as { status?: number } | null | undefined)?.status;
                                if (status === 404) {
                                    setData({
                                        source_game_id: sourceGameId,
                                        active_session_count: 0,
                                        active_sessions: [],
                                    });
                                    setLoadedAtMs(Date.now());
                                } else {
                                    setData(null);
                                    setError(getCloneSessionErrorMessage(nextError, t));
                                }
                            })
                            .finally(() => setLoading(false));
                    }}
                    disabled={loading}
                    aria-label={t("common.refresh")}
                    title={t("common.refresh")}
                >
                    {loading ? (
                        <Loader2 id="clone-game-active-source-sessions-refresh-loading-icon" className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw id="clone-game-active-source-sessions-refresh-icon" className="h-4 w-4" />
                    )}
                </Button>
            </CardHeader>
            <CardContent id="clone-game-active-source-sessions-content" className="space-y-4">
                <div id="clone-game-active-source-sessions-summary" className="flex flex-wrap items-center gap-3 text-sm">
                    <div id="clone-game-active-source-sessions-count-wrap" className="space-y-1">
                        <p id="clone-game-active-source-sessions-count-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.activeSourceSessionsCountLabel")}
                        </p>
                        <p id="clone-game-active-source-sessions-count-value" className="font-medium">
                            {data?.active_session_count ?? activeSessions.length}
                        </p>
                    </div>
                    {data?.session_ttl_seconds ? (
                        <div id="clone-game-active-source-sessions-ttl-wrap" className="space-y-1">
                            <p id="clone-game-active-source-sessions-ttl-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                                {t("cloneGame.sourceGameCurrentSessionTtlLabel")}
                            </p>
                            <p id="clone-game-active-source-sessions-ttl-value" className="font-medium">
                                {formatDurationCompact(data.session_ttl_seconds)}
                            </p>
                        </div>
                    ) : null}
                </div>

                {loading && !data ? (
                    <div id="clone-game-active-source-sessions-loading" className="flex items-center gap-2 rounded-md border px-3 py-4 text-sm text-muted-foreground">
                        <Loader2 id="clone-game-active-source-sessions-loading-icon" className="h-4 w-4 animate-spin" />
                        <span id="clone-game-active-source-sessions-loading-text">{t("common.loading")}</span>
                    </div>
                ) : error ? (
                    <div id="clone-game-active-source-sessions-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        {error}
                    </div>
                ) : activeSessions.length === 0 ? (
                    <div id="clone-game-active-source-sessions-empty" className="rounded-md border px-3 py-4 text-sm text-muted-foreground">
                        {t("cloneGame.activeSourceSessionsEmpty")}
                    </div>
                ) : (
                    <div id="clone-game-active-source-sessions-list" className="space-y-3">
                        {activeSessions.map((session) => {
                            const remainingSeconds = getRemainingSeconds(
                                session.expires_in_seconds,
                                session.expires_at,
                                loadedAtMs,
                                nowMs,
                            );
                            const statusStyle = getCloneSessionStatusStyle(session.status);
                            const expiresInText = formatDurationCompact(remainingSeconds ?? undefined);

                            return (
                                <div
                                    id={`clone-game-active-source-session-${session.session_id}`}
                                    key={session.session_id}
                                    className="rounded-md border px-3 py-3"
                                >
                                    <div id={`clone-game-active-source-session-header-${session.session_id}`} className="flex flex-wrap items-start justify-between gap-3">
                                        <div id={`clone-game-active-source-session-main-${session.session_id}`} className="min-w-0 space-y-2">
                                            <div id={`clone-game-active-source-session-target-wrap-${session.session_id}`} className="space-y-1">
                                                <p id={`clone-game-active-source-session-target-label-${session.session_id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    {t("cloneGame.activeSourceSessionsTargetGameLabel")}
                                                </p>
                                                <Link
                                                    id={`clone-game-active-source-session-target-link-${session.session_id}`}
                                                    href={`/games/${session.target_game_id}/clone`}
                                                    className="block font-medium hover:underline"
                                                >
                                                    {session.target_game_name || session.target_game_id}
                                                </Link>
                                            </div>
                                            <div id={`clone-game-active-source-session-id-wrap-${session.session_id}`} className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                                <span id={`clone-game-active-source-session-id-label-${session.session_id}`}>
                                                    {t("cloneGame.activeSourceSessionsSessionIdLabel")}:
                                                </span>
                                                <span id={`clone-game-active-source-session-id-value-${session.session_id}`} className="font-mono break-all">
                                                    {session.session_id}
                                                </span>
                                                <CopyButton
                                                    id={`clone-game-active-source-session-id-copy-btn-${session.session_id}`}
                                                    iconId={`clone-game-active-source-session-id-copy-icon-${session.session_id}`}
                                                    text={session.session_id}
                                                    size="h-3 w-3"
                                                    className="ml-0"
                                                />
                                            </div>
                                        </div>
                                        <Badge
                                            id={`clone-game-active-source-session-status-${session.session_id}`}
                                            variant="outline"
                                            className={cn("inline-flex items-center gap-1.5", statusStyle.pill)}
                                        >
                                            <span
                                                id={`clone-game-active-source-session-status-dot-${session.session_id}`}
                                                className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)}
                                            />
                                            {formatTechnicalLabel(session.status) || t("common.unknown")}
                                        </Badge>
                                    </div>
                                    <div id={`clone-game-active-source-session-meta-${session.session_id}`} className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                                        <div id={`clone-game-active-source-session-expiry-${session.session_id}`} className="space-y-1">
                                            <p id={`clone-game-active-source-session-expiry-label-${session.session_id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                                                {t("cloneGame.sourceGameCurrentSessionExpiresInLabel")}
                                            </p>
                                            <p id={`clone-game-active-source-session-expiry-value-${session.session_id}`} className="font-medium tabular-nums">
                                                {expiresInText ?? t("common.unknown")}
                                            </p>
                                        </div>
                                        <div id={`clone-game-active-source-session-expires-at-${session.session_id}`} className="space-y-1">
                                            <p id={`clone-game-active-source-session-expires-at-label-${session.session_id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                                                {t("cloneGame.sourceGameCurrentSessionExpiresAtLabel")}
                                            </p>
                                            <p id={`clone-game-active-source-session-expires-at-value-${session.session_id}`} className="font-medium">
                                                {formatTimestamp(session.expires_at)}
                                            </p>
                                        </div>
                                        <div id={`clone-game-active-source-session-target-id-${session.session_id}`} className="space-y-1">
                                            <p id={`clone-game-active-source-session-target-id-label-${session.session_id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                                                {t("cloneGame.activeSourceSessionsTargetGameIdLabel")}
                                            </p>
                                            <p id={`clone-game-active-source-session-target-id-value-${session.session_id}`} className="font-mono text-xs break-all">
                                                {session.target_game_id}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
