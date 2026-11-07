"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GameAPIKey } from "@/lib/game-api-keys";
import { useTranslation } from "@/lib/i18n/use-translation";
import { GameAPIKeyAuditList } from "./GameAPIKeyAuditList";
import { GameAPIKeyItemGrantLogList } from "./GameAPIKeyItemGrantLogList";

const LOG_TABS = ["key-changes", "item-grants"] as const;
type LogTab = (typeof LOG_TABS)[number];

export function GameAPIKeyActivityLogs({ gameId, keys }: { gameId: string; keys: GameAPIKey[] }) {
    const { t } = useTranslation();
    const tr = (key: string) => t(`game.apiKeys.${key}`);
    const router = useRouter();
    const searchParams = useSearchParams();
    const requested = searchParams.get("subTab");
    const active: LogTab = LOG_TABS.includes(requested as LogTab) ? requested as LogTab : "key-changes";

    return <section id="game-api-keys-audit-section" className="space-y-3 pt-6">
        <h3 id="game-api-keys-audit-title" className="text-lg font-semibold">{tr("auditTitle")}</h3>
        <Tabs id="game-api-keys-log-tabs" value={active} onValueChange={value => router.replace(`?tab=api-keys&subTab=${encodeURIComponent(value)}`, { scroll: false })}>
            <TabsList id="game-api-keys-log-tabs-list">
                <TabsTrigger id="game-api-keys-log-tab-key-changes" value="key-changes">{tr("auditTabKeyChanges")}</TabsTrigger>
                <TabsTrigger id="game-api-keys-log-tab-item-grants" value="item-grants">{tr("auditTabItemGrants")}</TabsTrigger>
            </TabsList>
            <TabsContent id="game-api-keys-log-panel-key-changes" value="key-changes" className="mt-3">
                <GameAPIKeyAuditList gameId={gameId} revision={keys} />
            </TabsContent>
            <TabsContent id="game-api-keys-log-panel-item-grants" value="item-grants" className="mt-3">
                <GameAPIKeyItemGrantLogList gameId={gameId} keys={keys} />
            </TabsContent>
        </Tabs>
    </section>;
}
