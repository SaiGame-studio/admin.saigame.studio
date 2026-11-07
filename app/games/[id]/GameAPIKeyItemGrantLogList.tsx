"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listGameAPIKeyItemGrantLogs, type GameAPIKey, type GameAPIKeyItemGrantLog, type GameAPIKeyItemGrantLogFilters } from "@/lib/game-api-keys";
import { useTranslation } from "@/lib/i18n/use-translation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function GameAPIKeyItemGrantLogList({ gameId, keys }: { gameId: string; keys: GameAPIKey[] }) {
    const { t, locale } = useTranslation();
    const tr = (key: string) => t(`game.apiKeys.${key}`);
    const [items, setItems] = useState<GameAPIKeyItemGrantLog[]>([]);
    const [cursor, setCursor] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [gamerProgressInput, setGamerProgressInput] = useState("");
    const [itemCodeInput, setItemCodeInput] = useState("");
    const [filters, setFilters] = useState<GameAPIKeyItemGrantLogFilters>({});
    const [invalidGamerProgress, setInvalidGamerProgress] = useState(false);
    const generation = useRef(0);
    const keyNames = new Map(keys.map(key => [key.id, key.key_name]));

    const load = useCallback(async (after?: string) => {
        const current = ++generation.current;
        setLoading(true); setFailed(false);
        try {
            const result = await listGameAPIKeyItemGrantLogs(gameId, filters, after);
            if (current !== generation.current) return;
            setItems(previous => after ? [...previous, ...result.data.filter(item => !previous.some(old => old.id === item.id))] : result.data);
            setCursor(result.meta.next_cursor);
        } catch {
            if (current !== generation.current) return;
            setFailed(true); setItems([]); setCursor(undefined);
        } finally { if (current === generation.current) setLoading(false); }
    }, [gameId, filters]);

    useEffect(() => {
        setItems([]); setCursor(undefined); void load();
        return () => { generation.current++; };
    }, [load]);

    function applyFilters() {
        const gamerProgressId = gamerProgressInput.trim();
        if (gamerProgressId && !UUID_PATTERN.test(gamerProgressId)) {
            setInvalidGamerProgress(true);
            return;
        }
        setInvalidGamerProgress(false);
        setFilters({ gamerProgressId: gamerProgressId || undefined, itemCode: itemCodeInput.trim() || undefined });
    }
    function clearFilters() {
        setGamerProgressInput(""); setItemCodeInput(""); setInvalidGamerProgress(false); setFilters({});
    }
    const submitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") { event.preventDefault(); applyFilters(); } };
    const hasFilters = Boolean(filters.gamerProgressId || filters.itemCode);

    return <div id="game-api-keys-grants" className="space-y-3">
        <div id="game-api-keys-grants-filters" className="flex flex-wrap items-start gap-2">
            <div id="game-api-keys-grants-filter-gamer-progress-field" className="min-w-0 flex-1 basis-72 space-y-1">
                <Input id="game-api-keys-grants-filter-gamer-progress" value={gamerProgressInput} placeholder={tr("grantFilterGamerProgress")} autoComplete="off" className="font-mono" aria-invalid={invalidGamerProgress} onChange={event => setGamerProgressInput(event.target.value)} onKeyDown={submitOnEnter} />
                {invalidGamerProgress && <p id="game-api-keys-grants-filter-gamer-progress-error" role="alert" className="text-xs text-destructive">{tr("grantInvalidGamerProgress")}</p>}
            </div>
            <Input id="game-api-keys-grants-filter-item-code" value={itemCodeInput} maxLength={100} placeholder={tr("grantFilterItemCode")} autoComplete="off" className="min-w-0 flex-1 basis-48" onChange={event => setItemCodeInput(event.target.value)} onKeyDown={submitOnEnter} />
            <Button id="game-api-keys-grants-search" variant="outline" disabled={loading} onClick={applyFilters}>{tr("grantSearch")}</Button>
            {(hasFilters || gamerProgressInput || itemCodeInput) && <Button id="game-api-keys-grants-clear" variant="ghost" disabled={loading} onClick={clearFilters}>{tr("grantClear")}</Button>}
        </div>
        {failed && <p id="game-api-keys-grants-error" role="alert" className="text-sm text-destructive">{tr("failed")}</p>}
        {failed && <Button id="game-api-keys-grants-retry" variant="outline" disabled={loading} onClick={() => void load()}>{tr("retry")}</Button>}
        {loading && items.length === 0 && <p id="game-api-keys-grants-loading" className="text-sm text-muted-foreground">{tr("grantLoading")}</p>}
        {!loading && !failed && items.length === 0 && <p id="game-api-keys-grants-empty" className="text-sm text-muted-foreground">{tr(hasFilters ? "grantEmptyFiltered" : "grantEmpty")}</p>}
        {items.length > 0 && <div id="game-api-keys-grants-wrapper" className="overflow-x-auto rounded-md border">
            <table id="game-api-keys-grants-table" className="w-full text-sm">
                <thead id="game-api-keys-grants-head" className="bg-muted/50 text-left"><tr id="game-api-keys-grants-heading-row">
                    {["auditTime", "grantStatus", "grantGamerProgress", "grantItemCode", "grantQuantity", "grantMessageCode", "grantKey", "grantCallerIp"].map(column => <th id={`game-api-keys-grants-column-${column.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`} key={column} className="whitespace-nowrap px-3 py-3 font-medium">{tr(column)}</th>)}
                </tr></thead>
                <tbody id="game-api-keys-grants-body">{items.map(item => <tr id={`game-api-keys-grants-row-${item.id}`} key={item.id} className="border-t">
                    <td id={`game-api-keys-grants-time-${item.id}`} className="whitespace-nowrap px-3 py-3">{new Date(item.created_at).toLocaleString(locale)}</td>
                    <td id={`game-api-keys-grants-status-${item.id}`} className="px-3 py-3"><Badge id={`game-api-keys-grants-status-badge-${item.id}`} variant={item.status === "success" ? "default" : "destructive"}>{tr(item.status === "success" ? "grantSuccess" : "grantFailed")}</Badge></td>
                    <td id={`game-api-keys-grants-gamer-progress-${item.id}`} className="px-3 py-3 font-mono text-xs">{item.gamer_progress_id ?? "-"}</td>
                    <td id={`game-api-keys-grants-item-code-${item.id}`} className="px-3 py-3 font-mono">{item.item_code || "-"}</td>
                    <td id={`game-api-keys-grants-quantity-${item.id}`} className="px-3 py-3 text-right tabular-nums">{item.quantity}</td>
                    <td id={`game-api-keys-grants-message-code-${item.id}`} className="px-3 py-3 font-mono text-xs">{item.message_code || "-"}</td>
                    <td id={`game-api-keys-grants-key-${item.id}`} className="px-3 py-3">{keyNames.get(item.api_key_id) ?? <span id={`game-api-keys-grants-key-id-${item.id}`} className="font-mono text-xs">{item.api_key_id.slice(0, 8)}</span>}</td>
                    <td id={`game-api-keys-grants-caller-ip-${item.id}`} className="px-3 py-3 font-mono text-xs">{item.caller_ip}</td>
                </tr>)}</tbody>
            </table>
        </div>}
        {cursor && <Button id="game-api-keys-grants-more" variant="outline" disabled={loading} onClick={() => void load(cursor)}>{loading ? tr("grantLoading") : tr("loadMore")}</Button>}
    </div>;
}
