"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CurrentCloneSessionLoadingCard() {
    return (
        <Card id="clone-game-source-current-session-loading-card" className="border-primary/30">
            <CardHeader id="clone-game-source-current-session-loading-header" className="space-y-2">
                <div id="clone-game-source-current-session-loading-title" className="h-5 w-56 rounded bg-muted" />
                <div id="clone-game-source-current-session-loading-description" className="h-4 w-3/4 rounded bg-muted" />
            </CardHeader>
            <CardContent id="clone-game-source-current-session-loading-content" className="space-y-3">
                <div id="clone-game-source-current-session-loading-line-1" className="h-4 w-full rounded bg-muted" />
                <div id="clone-game-source-current-session-loading-line-2" className="h-4 w-2/3 rounded bg-muted" />
            </CardContent>
        </Card>
    );
}
