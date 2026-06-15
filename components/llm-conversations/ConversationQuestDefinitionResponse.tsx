'use client';
import { Loader2, ScrollText } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { splitQuestDefinitionResponseSegments } from './conversation-panel-utils';
interface ConversationQuestDefinitionResponseProps {
    responseText: string;
    turnId: string;
    responseIdx: number;
    gameId: string;
    savedQuestDefinitionIds: Record<string, string>;
    questDefinitionNames: Record<string, string>;
    onSaveQuestDefinition: (questDefinition: Record<string, unknown>, turnId: string, responseIdx: number, questDefinitionIdx: number) => void;
    t: (key: string) => string;
    resolvedTheme?: string | null;
    isDone: boolean;
}
export function ConversationQuestDefinitionResponse({ responseText, turnId, responseIdx, gameId, savedQuestDefinitionIds, questDefinitionNames, onSaveQuestDefinition, t, resolvedTheme, isDone, }: ConversationQuestDefinitionResponseProps) {
    let markdownPreIdx = 0;
    let markdownLinkIdx = 0;
    const markdownComponents = {
        pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
            const preId = `conv-panel-quest-md-pre-scroll-wrap-${turnId}-${responseIdx}-${markdownPreIdx++}`;
            return (<div id={preId} className="overflow-x-auto w-full my-2 rounded">
                <pre {...props} style={{ overflowWrap: 'normal', wordBreak: 'normal', whiteSpace: 'pre', minWidth: 0 }} className="m-0">
                  {children}
                </pre>
              </div>);
        },
        a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
            const linkId = `conv-panel-quest-md-link-${turnId}-${responseIdx}-${markdownLinkIdx++}`;
            return (<a id={linkId} href={href} {...props} style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                {children}
              </a>);
        },
    };
    return (<div id={`conv-panel-ai-response-quest-defs-${turnId}-${responseIdx}`} className="flex flex-col gap-1">
      {splitQuestDefinitionResponseSegments(responseText).map((seg, segIdx) => seg.type === 'text' ? (<div key={segIdx} id={`conv-panel-quest-def-segment-text-${turnId}-${responseIdx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
            {seg.text}
          </ReactMarkdown>
        </div>) : seg.type === 'questDefinition' ? (<div key={segIdx} id={`conv-panel-quest-def-segment-${turnId}-${responseIdx}-${seg.questDefinitionIdx}`} className="flex flex-col gap-1">
          {(() => {
                const quest = seg.questDefinition;
                const codeName = typeof quest.code_name === 'string' ? quest.code_name.trim() : '';
                const baseQuestName = typeof quest.name === 'string' ? quest.name.trim() : '';
                const description = typeof quest.description === 'string' ? quest.description.trim() : '';
                const questType = typeof quest.quest_type === 'string' ? quest.quest_type.trim() : '';
                const conditions = quest.conditions && typeof quest.conditions === 'object' && !Array.isArray(quest.conditions)
                    ? (quest.conditions as Record<string, unknown>)
                    : null;
                const rewards = Array.isArray(quest.rewards) ? quest.rewards : [];
                const normalizeRef = (value: string): string => {
                    const raw = value.trim();
                    return raw.startsWith('__REF:') ? raw : `__REF:${raw}`;
                };
                const collectItemRefs = (value: unknown): string[] => {
                    if (!value)
                        return [];
                    if (typeof value === 'string') {
                        const raw = value.trim();
                        return raw ? [normalizeRef(raw)] : [];
                    }
                    if (Array.isArray(value)) {
                        return value.flatMap((entry) => collectItemRefs(entry));
                    }
                    if (typeof value === 'object') {
                        const itemRecord = value as Record<string, unknown>;
                        const refs: string[] = [];
                        const directId = typeof itemRecord.item_definition_id === 'string' ? itemRecord.item_definition_id.trim() : '';
                        const directCode = typeof itemRecord.item_code === 'string' ? itemRecord.item_code.trim() : '';
                        if (directId)
                            refs.push(normalizeRef(directId));
                        if (!refs.length && directCode)
                            refs.push(normalizeRef(directCode));
                        return refs;
                    }
                    return [];
                };
                const collectDeepItemRefs = (value: unknown, keyHint = ''): string[] => {
                    if (!value)
                        return [];
                    if (typeof value === 'string') {
                        const raw = value.trim();
                        if (!raw)
                            return [];
                        if (!/item|ref|code/i.test(keyHint))
                            return [];
                        return [normalizeRef(raw)];
                    }
                    if (Array.isArray(value)) {
                        return value.flatMap((entry) => collectDeepItemRefs(entry, keyHint));
                    }
                    if (typeof value === 'object') {
                        const recordValue = value as Record<string, unknown>;
                        return Object.entries(recordValue).flatMap(([key, nested]) => {
                            const nextHint = `${keyHint}.${key}`;
                            if (/item(_definition)?_ids?$/i.test(key) || /item_definition/i.test(key) || key === 'item_code') {
                                return collectItemRefs(nested);
                            }
                            if (key === 'items' || key === 'required_items' || /item/i.test(key)) {
                                return collectDeepItemRefs(nested, nextHint);
                            }
                            return collectDeepItemRefs(nested, nextHint);
                        });
                    }
                    return [];
                };
                const renderRewardNode = (reward: unknown, depth = 0): React.ReactNode => {
                    if (!reward || typeof reward !== 'object' || Array.isArray(reward))
                        return null;
                    const record = reward as Record<string, unknown>;
                    const rewardType = typeof record.reward_type === 'string' ? record.reward_type.trim() : '';
                    const itemRefs = [
                        ...collectItemRefs(record.item_definition_id),
                        ...collectItemRefs(record.item_definition_ids),
                        ...collectItemRefs(record.item_definition),
                        ...collectItemRefs(record.item_definitions),
                        ...collectDeepItemRefs(record),
                    ];
                    const quantityMin = record.quantity_min != null ? String(record.quantity_min) : '';
                    const quantityMax = record.quantity_max != null ? String(record.quantity_max) : '';
                    const quantity = record.quantity != null ? String(record.quantity) : '';
                    const valueText = quantityMin || quantityMax
                        ? `${quantityMin || '0'} - ${quantityMax || quantityMin || '0'}`
                        : (quantity || '-');
                    const rewardDetails = record.details && typeof record.details === 'object' && !Array.isArray(record.details)
                        ? (record.details as Record<string, unknown>)
                        : null;
                    return (<div className={`px-2 py-1.5 space-y-3 ${depth === 0 ? '' : 'ml-4 pl-3 border-l-2 border-border/40'}`}>
                        <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">reward_type</div>
                          <div className="font-mono text-xs break-words text-foreground/90 text-left">{rewardType || 'item'}</div>
                        </div>
                        <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Item Definition</div>
                          <div className="space-y-1 text-left">
                            {itemRefs.length > 0 ? (itemRefs.map((itemRef, itemRefIdx) => (<div key={`quest-reward-item-${depth}-${itemRefIdx}`} className="font-mono text-foreground/90 break-all text-xs">{itemRef}</div>))) : (<div className="text-xs text-muted-foreground">-</div>)}
                          </div>
                        </div>
                        <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">quantity</div>
                          <div className="font-mono text-xs break-words text-foreground/90 text-left">{valueText}</div>
                        </div>
                        {rewardDetails ? (<div className="space-y-0.5">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('common.details')}</div>
                            <div className="rounded border border-dashed border-border/40 p-2 text-[11px] font-mono whitespace-pre-wrap break-words">{JSON.stringify(rewardDetails, null, 2)}</div>
                          </div>) : null}
                      </div>);
                };
                const renderConditionNode = (node: unknown, depth = 0): React.ReactNode => {
                    if (!node || typeof node !== 'object' || Array.isArray(node))
                        return null;
                    const record = node as Record<string, unknown>;
                    const isLeaf = typeof record.type === 'string';
                    if (!isLeaf) {
                        const operator = typeof record.operator === 'string' ? record.operator : 'AND';
                        const clauses = Array.isArray(record.clauses) ? record.clauses : [];
                        return (<div className={`space-y-2 ${depth === 0 ? '' : 'ml-4 pl-3 border-l border-border/40'}`}>
                            <div className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-background">{operator}</div>
                            <div className="space-y-2">{clauses.length > 0 ? clauses.map((clause, clauseIdx) => (<div key={`quest-condition-${depth}-${clauseIdx}`}>{renderConditionNode(clause, depth + 1)}</div>)) : (<div className="text-xs text-muted-foreground italic">{t('quest.noConditions')}</div>)}</div>
                          </div>);
                    }
                    const type = typeof record.type === 'string' ? record.type.trim() : '';
                    const target = record.target != null ? String(record.target) : '';
                    const itemRefs = Array.from(new Set([
                        ...collectItemRefs(record.item_definition_id),
                        ...collectItemRefs(record.item_definition_ids),
                        ...collectItemRefs(record.item_definition),
                        ...collectItemRefs(record.item_definitions),
                        ...collectDeepItemRefs(record),
                    ]));
                    const packs = record.packs && typeof record.packs === 'object' && !Array.isArray(record.packs) ? (record.packs as Record<string, unknown>) : null;
                    const details = record.details && typeof record.details === 'object' && !Array.isArray(record.details) ? (record.details as Record<string, unknown>) : null;
                    return (<div className={`px-2 py-1.5 space-y-3 ${depth === 0 ? '' : 'ml-4 pl-3 border-l-2 border-border/40'}`}>
                        <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">type</div>
                          <div className="font-mono text-xs break-words text-foreground/90 text-left">{type || 'condition'}</div>
                        </div>
                        <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Item Definition</div>
                          <div className="space-y-1 text-left">
                            {itemRefs.length > 0 ? (itemRefs.map((itemRef, itemRefIdx) => (<div key={`quest-condition-direct-item-${depth}-${itemRefIdx}`} className="font-mono text-foreground/90 break-all text-xs">{itemRef}</div>))) : (<div className="text-xs text-muted-foreground">-</div>)}
                          </div>
                        </div>
                        <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">target</div>
                          <div className="font-mono text-xs break-words text-foreground/90 text-left">{target || '-'}</div>
                        </div>
                        {packs ? (<div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">packs</div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-0.5">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">gacha_pack_id</div>
                                <div className="font-mono text-xs break-all text-foreground/90">{typeof packs.gacha_pack_id === 'string' ? packs.gacha_pack_id : '-'}</div>
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">quantity</div>
                                <div className="font-mono text-xs text-foreground/90">{packs.quantity != null ? String(packs.quantity) : '1'}</div>
                              </div>
                            </div>
                          </div>) : null}
                        {details ? (<div className="space-y-0.5">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('common.details')}</div>
                            <div className="rounded border border-dashed border-border/40 p-2 text-[11px] font-mono whitespace-pre-wrap break-words">{JSON.stringify(details, null, 2)}</div>
                          </div>) : null}
                      </div>);
                };
                const renderRewards = (): React.ReactNode => {
                    if (rewards.length === 0) {
                        return <div className="text-xs break-words text-foreground/90">-</div>;
                    }
                    return (<div className="space-y-2">{rewards.map((reward, rewardIdx) => (<div key={`quest-reward-${turnId}-${responseIdx}-${seg.questDefinitionIdx}-${rewardIdx}`}>{renderRewardNode(reward, 0)}</div>))}</div>);
                };
                const savedQuestId = savedQuestDefinitionIds[`${turnId}:${responseIdx}:${seg.questDefinitionIdx}`];
                const questCodeName = typeof quest.code_name === 'string' ? quest.code_name.trim() : '';
                const questName = baseQuestName || questCodeName || `Quest ${seg.questDefinitionIdx + 1}`;
                const linkedName = savedQuestId ? (questDefinitionNames[savedQuestId] ?? questName) : questName;
                return (<>
                    <div id={`conv-panel-quest-def-summary-${turnId}-${responseIdx}-${seg.questDefinitionIdx}`} className="rounded-xl bg-muted/25 px-3 py-2 text-xs space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-0.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('quest.codeName')}</div>
                          <div className="font-mono text-xs break-all">{codeName || questName}</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('quest.type')}</div>
                          <div className="text-xs break-words">{questType || 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('quest.description')}</div>
                        <div className="text-xs leading-5 break-words text-foreground/90">{description || '-'}</div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('quest.conditions')}</div>
                        <div className="space-y-2">{conditions ? renderConditionNode(conditions) : (<div className="text-xs break-words text-foreground/90">-</div>)}</div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">rewards</div>
                        <div className="space-y-2">{renderRewards()}</div>
                      </div>
                    </div>
                    <div id={`conv-panel-quest-def-segment-json-${turnId}-${responseIdx}-${seg.questDefinitionIdx}`} className="rounded-md border border-border/60 bg-background/80 p-3 text-xs font-mono whitespace-pre overflow-x-auto break-words">{JSON.stringify(seg.questDefinition, null, 2)}</div>
                    {savedQuestId ? (<Link id={`conv-panel-quest-link-${turnId}-${responseIdx}-${seg.questDefinitionIdx}`} href={`/games/${gameId}/quests?${new URLSearchParams({ q: savedQuestId, expandQuest: savedQuestId, }).toString()}`} className="self-start inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]" title={linkedName}>
                        <ScrollText className="h-3 w-3 shrink-0"/>
                        <span id={`conv-panel-quest-link-label-${turnId}-${responseIdx}-${seg.questDefinitionIdx}`} className="truncate">{t('llmConversation.viewQuestDefinition')}: {linkedName}</span>
                      </Link>) : (<button id={`conv-panel-save-quest-btn-${turnId}-${responseIdx}-${seg.questDefinitionIdx}`} onClick={() => onSaveQuestDefinition(seg.questDefinition, turnId, responseIdx, seg.questDefinitionIdx)} className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]">
                        <ScrollText className="h-3 w-3"/>
                        <span id={`conv-panel-save-quest-btn-label-${turnId}-${responseIdx}-${seg.questDefinitionIdx}`}>{t('llmConversation.saveAsQuestDefinition')}: {questName}</span>
                      </button>)}
                  </>);
            })()}
        </div>) : null)}
      {!isDone && (<Loader2 id={`conv-panel-ai-response-cursor-quest-${turnId}-${responseIdx}`} className="h-3 w-3 animate-spin text-muted-foreground"/>)}
    </div>);
}
