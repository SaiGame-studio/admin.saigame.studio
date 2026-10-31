"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AddTeamToGameDialog } from "@/components/AddTeamToGameDialog";
import { RemoveTeamFromGameDialog } from "@/components/RemoveTeamFromGameDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";
import type { Team } from "@/types/team";

type Props = {
    game: Game;
    teams: Team[];
    teamsLoading: boolean;
    /** Reloads the teams after one is added or removed. */
    onTeamsChanged: () => void;
};

/** Teams that have access to the game, with add / remove. */
export function GameTeamsCard({ game, teams, teamsLoading, onTeamsChanged }: Props) {
    const { t } = useTranslation();
    return (
        <Card id="game-detail-teams-card" className="game-detail-teams-card">
            <CardHeader id="game-detail-teams-header" className="game-detail-teams-header flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
                <div id="game-detail-teams-heading" className="game-detail-teams-heading min-w-0">
                    <CardTitle id="game-detail-teams-title" className="game-detail-teams-title">{t('studio.teams')}</CardTitle>
                    <CardDescription id="game-detail-teams-description" className="game-detail-teams-description">{t('game.teamsDesc')}</CardDescription>
                </div>
                {game.studio_id && (<div id="game-detail-teams-actions" className="game-detail-teams-actions shrink-0">
                        <AddTeamToGameDialog gameId={game.id} studioId={game.studio_id} existingTeamIds={teams.map(t => t.id)} onTeamsAdded={onTeamsChanged}/>
                    </div>)}
            </CardHeader>
            <CardContent id="game-detail-teams-content" className="game-detail-teams-content group">
                {teamsLoading ? (<div id="game-detail-teams-loading" className="game-detail-teams-loading space-y-2">
                        <Skeleton id="game-detail-teams-loading-skeleton" className="game-detail-teams-loading-skeleton h-6 w-full"/>
                    </div>) : teams.length > 0 ? (<div id="game-detail-teams-list" className="game-detail-teams-list flex flex-wrap items-center gap-2">
                        {teams.map((team, index) => (<React.Fragment key={team.id}>
                                <div id={`game-detail-team-${team.id}`} className="game-detail-team inline-flex items-center gap-1">
                                    <Link id={`game-detail-team-link-${team.id}`} href={`/teams/${team.id}`} className="game-detail-team-link inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                        {team.name}
                                        <ExternalLink className="w-4 h-4"/>
                                    </Link>
                                    <RemoveTeamFromGameDialog gameId={game.id} team={team} onTeamRemoved={onTeamsChanged}/>
                                </div>
                                {index < teams.length - 1 && (<span id={`game-detail-team-separator-${team.id}`} className="game-detail-team-separator text-muted-foreground">•</span>)}
                            </React.Fragment>))}
                    </div>) : (<p id="game-detail-teams-empty-state" className="game-detail-teams-empty-state text-sm text-muted-foreground">{t('game.noTeamsAssigned')}</p>)}
            </CardContent>
        </Card>
    );
}
