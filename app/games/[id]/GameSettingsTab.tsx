"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { DailyQuestMaxAdvanceDays } from "@/components/DailyQuestMaxAdvanceDays";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";
import { GameDangerZone } from "./GameDangerZone";
import { GameSettingTwoFactorDialog } from "./GameSettingTwoFactorDialog";

type SettingRowProps = {
    id: string;
    label: string;
    /** Element the label points to, when the control is a form field. */
    htmlFor?: string;
    description: ReactNode;
    control: ReactNode;
};

/** One setting per row: name and explanation on the left, its control on the right. */
function SettingRow({ id, label, htmlFor, description, control }: SettingRowProps) {
    return (
        <div id={`game-setting-${id}`} className="game-setting-row flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div id={`game-setting-${id}-text`} className="game-setting-text max-w-2xl space-y-1">
                <Label id={`game-setting-${id}-label`} htmlFor={htmlFor} className="game-setting-label text-sm font-medium">{label}</Label>
                <p id={`game-setting-${id}-description`} className="game-setting-description text-sm text-muted-foreground">{description}</p>
            </div>
            <div id={`game-setting-${id}-control`} className="game-setting-control shrink-0">{control}</div>
        </div>
    );
}

/** Settings tab: the game's settings, one per row with an explanation, and Delete Game at the bottom. */
export function GameSettingsTab({ game, onUpdate }: { game: Game; onUpdate: (updated: Game) => void }) {
    const { t } = useTranslation();
    const [pendingSetting, setPendingSetting] = useState<{ key: "allow_player_2fa" | "allow_new_players"; enabled: boolean } | null>(null);
    const tracingNote = (
        <>
            {t("game.tracingDescPre")}
            <Link id="game-setting-tracing-plugins-link" href={`/games/${game.id}/plugins`} className="font-medium text-blue-400 hover:underline">Rare</Link>
            {t("game.settingTracingAutoPost")}
        </>
    );
    // Read-only switch with the "cannot be changed manually" warning right under it.
    const lockedSwitch = (id: string, checked: boolean) => (
        <div id={`game-setting-${id}-locked`} className="game-setting-locked flex flex-col items-start gap-1 sm:items-end">
            <Switch id={`game-setting-${id}-switch`} checked={checked} disabled/>
            <span id={`game-setting-${id}-manual-warning`} className="game-setting-manual-warning text-xs font-medium text-amber-500 dark:text-amber-400">{t("game.settingCannotChangeManually")}</span>
        </div>
    );

    return (
        <div id="game-settings-tab" className="game-settings-tab space-y-8">
            <section id="game-settings-list" className="game-settings-list border-t border-border">
                <SettingRow
                    id="allow-new-players"
                    label={t("gameUsers.allowNewPlayers")}
                    htmlFor="game-setting-allow-new-players-switch"
                    description={(
                        <>
                            {t("game.settingAllowNewPlayersHelp")}{" "}
                            <Link id="game-setting-allow-new-players-link" href={`/games/${game.id}/players?tab=invited-emails`} className="game-setting-allow-new-players-link font-medium text-blue-400 hover:underline">
                                {t("game.users")} → {t("gameUsers.invitedEmails")}
                            </Link>
                        </>
                    )}
                    control={<Switch id="game-setting-allow-new-players-switch" checked={game.settings?.allow_new_players ?? true} disabled={pendingSetting !== null} onCheckedChange={enabled => setPendingSetting({ key: "allow_new_players", enabled })}/>}
                />
                <SettingRow
                    id="allow-player-2fa"
                    label={t("game.allowPlayer2FA")}
                    htmlFor="game-setting-allow-player-2fa-switch"
                    description={t("game.allowPlayer2FADesc")}
                    control={<Switch id="game-setting-allow-player-2fa-switch" checked={game.settings?.allow_player_2fa ?? false} disabled={pendingSetting !== null} onCheckedChange={enabled => setPendingSetting({ key: "allow_player_2fa", enabled })}/>}
                />
                <SettingRow
                    id="daily-quest-days"
                    label={t("game.dailyQuestAdvanceDays")}
                    description={(
                        <>
                            {t("game.settingDailyQuestDaysHelp")}{" "}
                            <Link id="game-setting-daily-quest-days-link" href={`/games/${game.id}/quests?tab=daily`} className="game-setting-daily-quest-days-link font-medium text-blue-400 hover:underline">
                                {t("game.quests")} → {t("quest.tabDaily")}
                            </Link>
                        </>
                    )}
                    control={<DailyQuestMaxAdvanceDays game={game} onUpdate={onUpdate}/>}
                />
                <SettingRow
                    id="allow-tracing-player-event"
                    label={t("game.allowTracingPlayerEvent")}
                    htmlFor="game-setting-allow-tracing-player-event-switch"
                    description={(
                        <>
                            {t("game.settingTracingPlayerEventHelp")} {tracingNote} {t("game.settingViewIn")}{" "}
                            <Link id="game-setting-allow-tracing-player-event-link" href={`/games/${game.id}/analytic`} className="game-setting-allow-tracing-player-event-link font-medium text-blue-400 hover:underline">
                                {t("game.navAnalytic")}
                            </Link>
                        </>
                    )}
                    control={lockedSwitch("allow-tracing-player-event", game.settings?.allow_tracing_player_event ?? false)}
                />
                <SettingRow
                    id="leaderboard-tracing"
                    label={t("game.leaderboardTracing")}
                    htmlFor="game-setting-leaderboard-tracing-switch"
                    description={(
                        <>
                            {t("game.settingLeaderboardTracingHelp")} {tracingNote} {t("game.settingViewIn")}{" "}
                            <Link id="game-setting-leaderboard-tracing-link" href={`/games/${game.id}/leaderboard`} className="game-setting-leaderboard-tracing-link font-medium text-blue-400 hover:underline">
                                {t("game.navLeaderboard")}
                            </Link>
                        </>
                    )}
                    control={lockedSwitch("leaderboard-tracing", game.settings?.leaderboard_tracing ?? false)}
                />
            </section>
            <GameDangerZone game={game}/>
            {pendingSetting !== null && <GameSettingTwoFactorDialog game={game} setting={pendingSetting.key} enabled={pendingSetting.enabled} onUpdate={onUpdate} onClose={() => setPendingSetting(null)}/>}
        </div>
    );
}
