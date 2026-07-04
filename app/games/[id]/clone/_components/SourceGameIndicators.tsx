"use client";

import { Building2, CircleCheck, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";

type SourceGameIndicatorsProps = {
    game: Game;
    scope: "card" | "selected";
    compact?: boolean;
};

export function SourceGameIndicators({ game, scope, compact = false }: SourceGameIndicatorsProps) {
    const { t } = useTranslation();

    if (!game.same_studio && !game.is_my_game && !game.is_purchased) {
        return null;
    }

    const iconClassName = compact ? "h-3.5 w-3.5" : "h-4 w-4";

    return (
        <TooltipProvider delayDuration={150}>
            <div
                id={`clone-game-source-${scope}-indicators-${game.id}`}
                className={`flex flex-wrap items-center gap-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
            >
                {game.same_studio ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                id={`clone-game-source-${scope}-indicator-same-studio-${game.id}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1"
                            >
                                <Building2
                                    id={`clone-game-source-${scope}-indicator-same-studio-icon-${game.id}`}
                                    className={iconClassName}
                                />
                                <span id={`clone-game-source-${scope}-indicator-same-studio-label-${game.id}`}>
                                    {t("cloneGame.sourceGameSameStudio")}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent id={`clone-game-source-${scope}-indicator-same-studio-tooltip-${game.id}`} side="top">
                            {t("cloneGame.sourceGameSameStudioTooltip")}
                        </TooltipContent>
                    </Tooltip>
                ) : null}
                {game.is_my_game ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                id={`clone-game-source-${scope}-indicator-my-game-${game.id}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1"
                            >
                                <User
                                    id={`clone-game-source-${scope}-indicator-my-game-icon-${game.id}`}
                                    className={iconClassName}
                                />
                                <span id={`clone-game-source-${scope}-indicator-my-game-label-${game.id}`}>
                                    {t("cloneGame.sourceGameMyGame")}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent id={`clone-game-source-${scope}-indicator-my-game-tooltip-${game.id}`} side="top">
                            {t("cloneGame.sourceGameMyGameTooltip")}
                        </TooltipContent>
                    </Tooltip>
                ) : null}
                {game.is_purchased ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                id={`clone-game-source-${scope}-indicator-purchased-${game.id}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1"
                            >
                                <CircleCheck
                                    id={`clone-game-source-${scope}-indicator-purchased-icon-${game.id}`}
                                    className={iconClassName}
                                />
                                <span id={`clone-game-source-${scope}-indicator-purchased-label-${game.id}`}>
                                    {t("cloneGame.sourceGamePurchased")}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent id={`clone-game-source-${scope}-indicator-purchased-tooltip-${game.id}`} side="top">
                            {t("cloneGame.sourceGamePurchasedTooltip")}
                        </TooltipContent>
                    </Tooltip>
                ) : null}
            </div>
        </TooltipProvider>
    );
}
