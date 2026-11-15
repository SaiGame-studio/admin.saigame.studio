"use client";

import { GameTeamRow } from "./GameTeamRow";
import { AddTeamToGameDialog } from "@/components/AddTeamToGameDialog";
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
        <Card id="game-detail-teams-card" className="game-detail-teams-card border-0 bg-transparent shadow-none">
            <CardHeader id="game-detail-teams-header" className="game-detail-teams-header flex flex-row items-start justify-between gap-3 space-y-0 px-0 pb-4 pt-0">
                <div id="game-detail-teams-heading" className="game-detail-teams-heading min-w-0">
                    <CardTitle id="game-detail-teams-title" className="game-detail-teams-title">{t('studio.teams')}</CardTitle>
                    <CardDescription id="game-detail-teams-description" className="game-detail-teams-description">{t('game.teamsDesc')}</CardDescription>
                </div>
                {game.studio_id && (<div id="game-detail-teams-actions" className="game-detail-teams-actions shrink-0">
                        <AddTeamToGameDialog gameId={game.id} studioId={game.studio_id} existingTeamIds={teams.map(t => t.id)} onTeamsAdded={onTeamsChanged}/>
                    </div>)}
            </CardHeader>
            <CardContent id="game-detail-teams-content" className="game-detail-teams-content group px-0 pb-0">
                {teamsLoading ? (<div id="game-detail-teams-loading" className="game-detail-teams-loading space-y-2">
                        <Skeleton id="game-detail-teams-loading-skeleton" className="game-detail-teams-loading-skeleton h-6 w-full"/>
                    </div>) : teams.length > 0 ? (<div id="game-detail-teams-list" className="game-detail-teams-list space-y-3">
                        {teams.map(team => <GameTeamRow key={team.id} team={team} gameId={game.id} onTeamRemoved={onTeamsChanged}/>)}
                    </div>) : (<p id="game-detail-teams-empty-state" className="game-detail-teams-empty-state text-sm text-muted-foreground">{t('game.noTeamsAssigned')}</p>)}
            </CardContent>
        </Card>
    );
}
