"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RemoveTeamFromGameDialog } from "@/components/RemoveTeamFromGameDialog";
import { fetchTeamGames, fetchTeamMembers } from "@/lib/team-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatTimestamp } from "@/lib/utils/date-utils";
import type { Team, TeamMember } from "@/types/team";
import type { Game } from "@/types/game";

export function GameTeamRow({ team, gameId, onTeamRemoved }: {
    team: Team;
    gameId: string;
    onTeamRemoved: () => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<TeamMember[] | null>(null);
    const [games, setGames] = useState<Game[] | null>(null);
    const [membersError, setMembersError] = useState(false);
    const [gamesError, setGamesError] = useState(false);
    const id = `game-team-${team.id}`;

    async function loadDetails() {
        if (loading) return;
        setLoading(true);
        const [memberResult, gameResult] = await Promise.allSettled([
            fetchTeamMembers(team.id), fetchTeamGames(team.id),
        ]);
        setMembersError(memberResult.status === "rejected");
        setGamesError(gameResult.status === "rejected");
        if (memberResult.status === "fulfilled") setMembers(memberResult.value);
        if (gameResult.status === "fulfilled") setGames(gameResult.value);
        setLoading(false);
    }

    return <Collapsible id={id} open={open} onOpenChange={value => {
        setOpen(value);
        if (value && (members === null || games === null)) void loadDetails();
    }} className="border-b border-border/40 last:border-b-0">
        <div id={`${id}-row`} className="flex items-center gap-2 p-2">
            <CollapsibleTrigger id={`${id}-trigger`} className="flex min-w-0 flex-1 items-start gap-3 rounded-md p-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronDown id={`${id}-chevron`} className={`mt-1 h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}/>
                <div id={`${id}-summary`} className="min-w-0 flex-1 space-y-2">
                    <div id={`${id}-heading`} className="flex flex-wrap items-center gap-2">
                        <span id={`${id}-name`} className="break-words font-semibold">{team.name}</span>
                        <Badge id={`${id}-status`} variant={team.is_active ? "default" : "secondary"}>{t(team.is_active ? "common.active" : "common.inactive")}</Badge>
                        <span id={`${id}-slug`} className="break-all text-xs text-muted-foreground">{t("team.slug")}: {team.slug || "—"}</span>
                    </div>
                    {team.description && <p id={`${id}-description`} className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{team.description}</p>}
                    <p id={`${id}-identifier`} className="break-all font-mono text-xs text-muted-foreground">{team.id}</p>
                    <div id={`${id}-timestamps`} className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span id={`${id}-created`}>{t("team.createdAt")}: {formatTimestamp(team.created_at)}</span>
                        <span id={`${id}-updated`}>{t("team.updatedAt")}: {formatTimestamp(team.updated_at)}</span>
                    </div>
                </div>
            </CollapsibleTrigger>
            <div id={`${id}-actions`} className="flex shrink-0 flex-wrap items-center gap-2">
                <Button id={`${id}-edit`} variant="ghost" size="sm" asChild>
                    <Link id={`${id}-edit-link`} href={`/teams/${team.id}`}><Pencil id={`${id}-edit-icon`} className="mr-2 h-4 w-4"/>{t("common.edit")}</Link>
                </Button>
                <RemoveTeamFromGameDialog gameId={gameId} team={team} onTeamRemoved={onTeamRemoved}/>
            </div>
        </div>
        <CollapsibleContent id={`${id}-content`} className="px-4 pb-5 pt-2 sm:pl-11">
            {loading && <p id={`${id}-loading`} role="status" className="text-sm text-muted-foreground">{t("common.loading")}</p>}
            {(membersError || gamesError) && <div id={`${id}-errors`} role="alert" className="mb-4 space-y-2 text-sm text-destructive">
                {membersError && <p id={`${id}-members-error`}>{t("team.loadMembersError")}</p>}
                {gamesError && <p id={`${id}-games-error`}>{t("team.loadGamesError")}</p>}
                <Button id={`${id}-retry`} variant="outline" size="sm" disabled={loading} onClick={() => void loadDetails()}>{t("common.retry")}</Button>
            </div>}
            <div id={`${id}-details`} className="grid gap-6 lg:grid-cols-2">
                <section id={`${id}-members`} className="min-w-0 space-y-3">
                    <h3 id={`${id}-members-title`} className="font-medium">{t("team.membersTitle")}{members && ` (${members.length})`}</h3>
                    {members?.length === 0 && <p id={`${id}-members-empty`} className="text-sm text-muted-foreground">{t("team.noMembersInTeam")}</p>}
                    {members?.map(member => <div id={`${id}-member-${member.id}`} key={member.id} className="break-words py-1 text-sm">
                        <span id={`${id}-member-${member.id}-name`}>{member.display_name || member.username || member.email || member.user_id}</span>{" "}
                        <span id={`${id}-member-${member.id}-role`} className="text-muted-foreground">({member.role_name || member.role_id})</span>
                    </div>)}
                </section>
                <section id={`${id}-games`} className="min-w-0 space-y-3">
                    <h3 id={`${id}-games-title`} className="font-medium">{t("team.games")}{games && ` (${games.length})`}</h3>
                    {games?.length === 0 && <p id={`${id}-games-empty`} className="text-sm text-muted-foreground">{t("team.noGames")}</p>}
                    {games?.map(game => <Link id={`${id}-game-${game.id}`} key={game.id} href={`/games/${game.id}`} className="block space-y-1 rounded-md px-2 py-3 text-sm hover:bg-muted/50">
                        <p id={`${id}-game-${game.id}-name`} className="break-words font-medium text-primary">{game.name}</p>
                    </Link>)}
                </section>
            </div>
        </CollapsibleContent>
    </Collapsible>;
}
