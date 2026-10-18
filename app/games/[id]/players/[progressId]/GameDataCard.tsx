"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GameDataCardProps {
    gameData?: Record<string, any>;
    maxBytes?: number;
    sizeLabel: string;
}

function formatBytes(bytes: number): string {
    if (bytes <= 0)
        return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function usageColorClass(percent: number): string {
    if (percent >= 90)
        return "[&>div]:bg-destructive";
    if (percent >= 70)
        return "[&>div]:bg-amber-500";
    return "[&>div]:bg-emerald-500";
}

export function GameDataCard({ gameData, maxBytes, sizeLabel }: GameDataCardProps) {
    const data = gameData ?? {};
    // Size of the serialized (compact) JSON in UTF-8 bytes, matching how the backend measures it.
    const currentBytes = useMemo(() => new TextEncoder().encode(JSON.stringify(data)).length, [data]);
    const hasMax = typeof maxBytes === "number" && maxBytes > 0;
    const percent = hasMax ? Math.min(100, (currentBytes / maxBytes) * 100) : 0;

    return (<Card id="player-game-data-card" className="player-game-data-card">
      <CardHeader id="player-game-data-header" className="player-game-data-header space-y-2">
        <CardTitle id="player-game-data-title" className="player-game-data-title text-base">Game Data</CardTitle>
        <div id="player-game-data-usage" className="player-game-data-usage space-y-1.5">
          <div id="player-game-data-usage-row" className="player-game-data-usage-row flex items-center justify-between text-xs text-muted-foreground">
            <span id="player-game-data-usage-label" className="player-game-data-usage-label">{sizeLabel}</span>
            <span id="player-game-data-usage-value" className="player-game-data-usage-value font-mono">
              <span id="player-game-data-usage-current" className="player-game-data-usage-current font-semibold text-foreground">{formatBytes(currentBytes)}</span>
              {hasMax && (<>
                  <span id="player-game-data-usage-separator" className="player-game-data-usage-separator"> / </span>
                  <span id="player-game-data-usage-max" className="player-game-data-usage-max">{formatBytes(maxBytes)}</span>
                  <span id="player-game-data-usage-percent" className="player-game-data-usage-percent"> ({percent < 0.01 && currentBytes > 0 ? "<0.01" : percent.toFixed(2)}%)</span>
                </>)}
            </span>
          </div>
          {hasMax && (<Progress id="player-game-data-usage-bar" className={cn("player-game-data-usage-bar h-1.5", usageColorClass(percent))} value={percent}/>)}
        </div>
      </CardHeader>
      <CardContent id="player-game-data-content" className="player-game-data-content">
        <pre id="player-game-data-json" className="player-game-data-json max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>);
}
