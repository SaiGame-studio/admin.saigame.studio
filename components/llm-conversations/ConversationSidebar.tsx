'use client';
import { Archive, ArchiveRestore, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/types/llm-conversation';
import { useState, useEffect, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import type { GameLLMTokenBalance } from '@/lib/llm-conversation-api';
import { LLMTokenPurchaseDialog } from '@/components/LLMTokenPurchaseDialog';
function formatTokenCount(n: number): string {
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(0)}k`;
    return String(n);
}
interface TokenFloatItem {
    id: number;
    delta: number;
    type: 'free' | 'premium';
}
let tokenFloatIdCounter = 0;
interface ConversationSidebarProps {
    sidebarWidth: number;
    sidebarBodyRef: React.RefObject<HTMLDivElement | null>;
    handleSidebarResizeMouseDown: (e: React.MouseEvent) => void;
    activeSectionHeight: number;
    handleSplitResizeMouseDown: (e: React.MouseEvent) => void;
    isArchivedCollapsed: boolean;
    setIsArchivedCollapsed: (updater: ((prev: boolean) => boolean)) => void;
    activeConvs: Conversation[];
    archivedConvs: Conversation[];
    activeConvId: string | null;
    isLoadingActive: boolean;
    isLoadingArchived: boolean;
    onSelectConv: (convId: string) => void;
    onArchive: (conv: Conversation) => void;
    onUnarchive: (conv: Conversation) => void;
    onDelete: (conv: Conversation) => void;
    tokenBalance: GameLLMTokenBalance | null;
    gameId: string | null;
    t: (key: string) => string;
}
export function ConversationSidebar({ sidebarWidth, sidebarBodyRef, handleSidebarResizeMouseDown, activeSectionHeight, handleSplitResizeMouseDown, isArchivedCollapsed, setIsArchivedCollapsed, activeConvs, archivedConvs, activeConvId, isLoadingActive, isLoadingArchived, onSelectConv, onArchive, onUnarchive, onDelete, tokenBalance, gameId, t, }: ConversationSidebarProps) {
    const [isShiftHeld, setIsShiftHeld] = useState(false);
    const [buyTokensOpen, setBuyTokensOpen] = useState(false);
    const [tokenFloats, setTokenFloats] = useState<TokenFloatItem[]>([]);
    const prevTokenBalanceRef = useRef<GameLLMTokenBalance | null>(null);
    const isFirstTokenLoad = useRef(true);
    // Detect token balance changes and spawn float animations
    useEffect(() => {
        if (!tokenBalance)
            return;
        const prev = prevTokenBalanceRef.current;
        if (!isFirstTokenLoad.current && prev !== null) {
            const freeDelta = tokenBalance.free_tokens_remaining - prev.free_tokens_remaining;
            const premiumDelta = tokenBalance.premium_tokens_remaining - prev.premium_tokens_remaining;
            const newFloats: TokenFloatItem[] = [];
            if (freeDelta !== 0)
                newFloats.push({ id: ++tokenFloatIdCounter, delta: freeDelta, type: 'free' });
            if (premiumDelta !== 0)
                newFloats.push({ id: ++tokenFloatIdCounter, delta: premiumDelta, type: 'premium' });
            if (newFloats.length > 0) {
                setTokenFloats(f => [...f, ...newFloats]);
                newFloats.forEach(({ id }) => setTimeout(() => setTokenFloats(f => f.filter(x => x.id !== id)), 8000));
            }
        }
        isFirstTokenLoad.current = false;
        prevTokenBalanceRef.current = tokenBalance;
    }, [tokenBalance]);
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift')
                setIsShiftHeld(true);
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift')
                setIsShiftHeld(false);
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);
    useEffect(() => {
        const handleOpenBuyTokens = () => setBuyTokensOpen(true);
        window.addEventListener('ss:open-buy-tokens', handleOpenBuyTokens);
        return () => window.removeEventListener('ss:open-buy-tokens', handleOpenBuyTokens);
    }, []);
    return (<div id="conv-panel-sidebar" className="relative flex shrink-0 flex-col border-r" style={{ width: sidebarWidth }}>
      <style>{`
        @keyframes token-float-down {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          15%  { opacity: 1; transform: translateY(8px) scale(1.15); }
          80%  { opacity: 0.8; transform: translateY(28px) scale(1.05); }
          100% { opacity: 0; transform: translateY(40px) scale(0.9); }
        }
        .token-float { animation: token-float-down 8s ease-out forwards; pointer-events: none; }
      `}</style>
      <div ref={sidebarBodyRef} id="conv-panel-sidebar-body" className="flex flex-1 flex-col min-h-0 overflow-hidden">

        {/* Active section */}
        <div id="conv-panel-active-section" className={`flex flex-col overflow-hidden ${isArchivedCollapsed ? 'flex-1' : ''}`} style={isArchivedCollapsed ? undefined : { height: activeSectionHeight }}>
          <div id="conv-panel-active-header" className="flex h-7 shrink-0 items-center border-b bg-muted/40 px-2 ml-1">
            <span id="conv-panel-active-label" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('llmConversation.tabActive')}
            </span>
            <div id="conv-panel-active-header-right" className="ml-auto flex items-center gap-1">
              {tokenBalance && (<TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span id="conv-panel-active-token-badge" className="relative flex items-center gap-1.5 cursor-default">
                        {/* Float animations */}
                        {tokenFloats.map(({ id, delta, type }) => (<span key={id} id={`conv-panel-token-float-${id}`} className="token-float absolute top-full mt-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold tabular-nums whitespace-nowrap select-none z-50" style={{
                    color: delta > 0 ? '#22c55e' : '#ef4444',
                    textShadow: '0 0 2px #000, 0 0 2px #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                }}>
                            {type === 'free' ? '🎈' : '⚡'}{delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
                          </span>))}
                        <span id="conv-panel-active-token-free" className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium leading-none bg-muted text-muted-foreground">
                          🎈 {formatTokenCount(tokenBalance.free_tokens_remaining)}
                        </span>
                        <span id="conv-panel-active-token-premium" className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium leading-none bg-muted text-muted-foreground">
                          ⚡ {formatTokenCount(tokenBalance.premium_tokens_remaining)}
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" id="conv-panel-active-token-tooltip">
                      <p id="conv-panel-active-token-tooltip-free">🎈 Free: {tokenBalance.free_tokens_remaining.toLocaleString()}</p>
                      <p id="conv-panel-active-token-tooltip-premium">⚡ Premium: {tokenBalance.premium_tokens_remaining.toLocaleString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>)}
              {gameId && (<>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button id="conv-panel-buy-tokens-btn" variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground" onClick={() => setBuyTokensOpen(true)} aria-label={t('llmConversation.buyTokens')}>
                           <Plus className="h-3 w-3"/>
                         </Button>
                      </TooltipTrigger>
                        <TooltipContent side="bottom" id="conv-panel-buy-tokens-tooltip" className="z-[1000]">
                          <p>{t('llmConversation.buyTokens')}</p>
                        </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <LLMTokenPurchaseDialog gameId={gameId} open={buyTokensOpen} onOpenChange={setBuyTokensOpen}/>
                </>)}
              {isLoadingActive && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground"/>}
            </div>
          </div>
          <ScrollArea className="flex-1">
            {!isLoadingActive && activeConvs.length === 0 ? (<p id="conv-panel-active-empty" className="p-2.5 text-xs text-muted-foreground">{t('llmConversation.noConversations')}</p>) : (<ul id="conv-panel-active-list" className="py-0.5 w-full">
                {activeConvs.map((conv) => (<li id={`conv-panel-active-item-${conv.ID}`} key={conv.ID} className={['group grid grid-cols-[1fr_auto] w-full', conv.ID === activeConvId ? 'bg-accent' : ''].join(' ')}>
                    <button id={`conv-panel-active-btn-${conv.ID}`} onClick={() => onSelectConv(conv.ID)} className={[
                    'min-w-0 overflow-hidden text-left pl-2.5 py-1.5 text-xs leading-tight hover:bg-accent transition-colors',
                    conv.ID === activeConvId ? 'font-medium' : '',
                ].join(' ')}>
                      <div id={`conv-panel-active-title-${conv.ID}`} className="truncate">{conv.Title}</div>
                    </button>
                    <button id={`conv-panel-active-archive-btn-${conv.ID}`} onClick={(e) => { e.stopPropagation(); onArchive(conv); }} className={[
                    'mr-1 flex items-center px-1.5 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100',
                    conv.ID === activeConvId ? 'opacity-100' : '',
                ].join(' ')} title={t('llmConversation.archive')}>
                      <Archive className="h-3 w-3"/>
                    </button>
                  </li>))}
              </ul>)}
          </ScrollArea>
        </div>

        {/* Vertical drag divider */}
        {!isArchivedCollapsed && (<div id="conv-panel-resize-vertical" onMouseDown={handleSplitResizeMouseDown} className="flex h-1.5 shrink-0 cursor-ns-resize items-center justify-center gap-1 border-y bg-muted hover:bg-primary/30 transition-colors group">
            <span id="conv-panel-resize-vertical-dot-1" className="h-0.5 w-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
            <span id="conv-panel-resize-vertical-dot-2" className="h-0.5 w-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
            <span id="conv-panel-resize-vertical-dot-3" className="h-0.5 w-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
          </div>)}

        {/* Archived section */}
        <div id="conv-panel-archived-section" className={`flex flex-col overflow-hidden ${isArchivedCollapsed ? 'shrink-0' : 'flex-1 min-h-0'}`}>
          <div id="conv-panel-archived-header" className="flex h-7 shrink-0 items-center border-b bg-muted/40 px-2">
            <span id="conv-panel-archived-label" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ml-1">
              {t('llmConversation.tabArchived')}
            </span>
            {isLoadingArchived && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1"/>}
            <button id="conv-panel-archived-toggle-btn" onClick={() => setIsArchivedCollapsed((prev) => !prev)} className="ml-auto flex items-center text-muted-foreground hover:text-foreground transition-colors" title={isArchivedCollapsed ? t('common.expand') : t('common.collapse')}>
              {isArchivedCollapsed ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
            </button>
          </div>
          {!isArchivedCollapsed && (<ScrollArea className="flex-1">
              {!isLoadingArchived && archivedConvs.length === 0 ? (<p id="conv-panel-archived-empty" className="p-2.5 text-xs text-muted-foreground">{t('llmConversation.noConversations')}</p>) : (<ul id="conv-panel-archived-list" className="py-0.5 w-full">
                  {archivedConvs.map((conv) => (<li id={`conv-panel-archived-item-${conv.ID}`} key={conv.ID} className={['group grid grid-cols-[1fr_auto] w-full', conv.ID === activeConvId ? 'bg-accent' : ''].join(' ')}>
                      <button id={`conv-panel-archived-btn-${conv.ID}`} onClick={() => onSelectConv(conv.ID)} className={[
                        'min-w-0 overflow-hidden text-left pl-2.5 py-1.5 text-xs leading-tight hover:bg-accent transition-colors opacity-70',
                        conv.ID === activeConvId ? 'font-medium opacity-100' : '',
                    ].join(' ')}>
                        <div id={`conv-panel-archived-title-${conv.ID}`} className="truncate">{conv.Title}</div>
                      </button>
                      <button id={`conv-panel-archived-unarchive-btn-${conv.ID}`} onClick={(e) => { e.stopPropagation(); isShiftHeld ? onDelete(conv) : onUnarchive(conv); }} className={[
                        'mr-0.5 flex items-center px-1.5 transition-colors',
                        isShiftHeld
                            ? 'opacity-100 text-destructive hover:text-destructive'
                            : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100',
                        conv.ID === activeConvId ? 'opacity-100' : '',
                    ].join(' ')} title={isShiftHeld ? t('common.delete') : t('llmConversation.unarchive')}>
                        {isShiftHeld
                        ? <Trash2 className="h-3 w-3"/>
                        : <ArchiveRestore className="h-3 w-3"/>}
                      </button>
                    </li>))}
                </ul>)}
            </ScrollArea>)}
        </div>
      </div>

      {/* Horizontal resize handle (right edge) */}
      <div id="conv-panel-resize-right" onMouseDown={handleSidebarResizeMouseDown} className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-muted border-l border-r hover:bg-primary/40 transition-colors z-10 flex flex-col items-center justify-center gap-1 group">
        <span id="conv-panel-resize-right-dot-1" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
        <span id="conv-panel-resize-right-dot-2" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
        <span id="conv-panel-resize-right-dot-3" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
      </div>
    </div>);
}
