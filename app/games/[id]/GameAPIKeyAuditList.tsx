"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { listGameAPIKeyAudit, type GameAPIKeyAudit, type GameAPIKey } from "@/lib/game-api-keys";
import { useTranslation } from "@/lib/i18n/use-translation";

export function GameAPIKeyAuditList({ gameId, revision }: { gameId: string; revision: GameAPIKey[] }) {
 const { t, locale } = useTranslation();
 const tr = (key: string) => t(`game.apiKeys.${key}`);
 const [items, setItems] = useState<GameAPIKeyAudit[]>([]);
 const [cursor, setCursor] = useState<string>();
 const [loading, setLoading] = useState(false);
 const [failed, setFailed] = useState(false);
 const generation = useRef(0);
 const load = useCallback(async (after?: string) => {
  const current = ++generation.current;
  setLoading(true); setFailed(false);
  try {
   const result = await listGameAPIKeyAudit(gameId, after);
   if (current !== generation.current) return;
   setItems(previous => after ? [...previous, ...result.data.filter(item => !previous.some(old => old.id === item.id))] : result.data);
   setCursor(result.meta.next_cursor);
  } catch {
   if (current !== generation.current) return;
   setFailed(true); setItems([]); setCursor(undefined);
  } finally { if (current === generation.current) setLoading(false); }
 }, [gameId]);
 useEffect(() => {
  setItems([]); setCursor(undefined); void load();
  return () => { generation.current++; };
 }, [load, revision]);
 return <section id="game-api-keys-audit-section" className="space-y-3 pt-6">
  <h3 id="game-api-keys-audit-title" className="text-lg font-semibold">{tr("auditTitle")}</h3>
  {failed && <p id="game-api-keys-audit-error" role="alert" className="text-sm text-destructive">{tr("failed")}</p>}
  {failed && <Button id="game-api-keys-audit-retry" variant="outline" disabled={loading} onClick={() => void load()}>{tr("retry")}</Button>}
  {loading && <p id="game-api-keys-audit-loading" className="text-sm text-muted-foreground">{tr("loading")}</p>}
  {!loading && !failed && items.length === 0 && <p id="game-api-keys-audit-empty" className="text-sm text-muted-foreground">{tr("auditEmpty")}</p>}
  {items.length > 0 && <div id="game-api-keys-audit-wrapper" className="overflow-x-auto rounded-md border">
   <table id="game-api-keys-audit-table" className="w-full text-sm">
    <thead id="game-api-keys-audit-head" className="bg-muted/50 text-left"><tr id="game-api-keys-audit-heading-row">
     {["auditTime", "actions", "name", "auditActor", "auditActorId", "auditActorEmail"].map(column => <th id={`game-api-keys-audit-column-${column.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`} key={column} className="px-3 py-3 font-medium">{tr(column)}</th>)}
    </tr></thead>
    <tbody id="game-api-keys-audit-body">{items.map(item => <tr id={`game-api-keys-audit-row-${item.id}`} key={item.id} className="border-t">
     <td id={`game-api-keys-audit-time-${item.id}`} className="whitespace-nowrap px-3 py-3">{new Date(item.created_at).toLocaleString(locale)}</td>
     <td id={`game-api-keys-audit-action-${item.id}`} className="px-3 py-3">{tr(item.action)}</td>
     <td id={`game-api-keys-audit-key-${item.id}`} className="px-3 py-3">{item.key_name}</td>
     <td id={`game-api-keys-audit-actor-${item.id}`} className="px-3 py-3">{item.actor.name}</td>
     <td id={`game-api-keys-audit-actor-id-${item.id}`} className="px-3 py-3 font-mono">{item.actor.id}</td>
     <td id={`game-api-keys-audit-email-${item.id}`} className="px-3 py-3">{item.actor.email}</td>
    </tr>)}</tbody>
   </table>
  </div>}
  {cursor && <Button id="game-api-keys-audit-more" variant="outline" disabled={loading} onClick={() => void load(cursor)}>{tr("loadMore")}</Button>}
 </section>;
}
