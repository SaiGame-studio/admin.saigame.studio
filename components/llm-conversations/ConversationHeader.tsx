'use client';
import { Archive, ChevronLeft, Info, MoreVertical, Minus, Pencil, Plus, Trash2, X, Pin, MoveDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import type { Conversation } from '@/types/llm-conversation';
import type { ChatTurn } from '@/hooks/use-chat-pipeline';
interface ConversationHeaderProps {
    activeConv: Conversation;
    activeConvId: string | null;
    chatHistory: ChatTurn[];
    editingTitle: boolean;
    setEditingTitle: (v: boolean) => void;
    editTitleValue: string;
    setEditTitleValue: (v: string) => void;
    onSaveTitle: () => void;
    titleFontSize: number;
    onIncreaseTitleFontSize: () => void;
    onDecreaseTitleFontSize: () => void;
    onNewConversation: () => void;
    onBack: () => void;
    onClose: () => void;
    onArchive: (conv: Conversation) => void;
    onDelete: (conv: Conversation) => void;
    onOpenDetail: () => void;
    scrollMode: 'stick' | 'follow';
    onScrollModeChange: (mode: 'stick' | 'follow') => void;
    t: (key: string) => string;
}
export function ConversationHeader({ activeConv, activeConvId, chatHistory, editingTitle, setEditingTitle, editTitleValue, setEditTitleValue, onSaveTitle, titleFontSize, onIncreaseTitleFontSize, onDecreaseTitleFontSize, onNewConversation, onBack, onClose, onArchive, onDelete, onOpenDetail, scrollMode, onScrollModeChange, t, }: ConversationHeaderProps) {
    return (<>
      <div id="conv-panel-conv-header" className="shrink-0 border-b px-3 py-2 space-y-1">
        <div id="conv-panel-title-row" className="flex items-start justify-between gap-1">
          <Button id="conv-panel-btn-back" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onBack} title={t('llmConversation.backToList')}>
            <ChevronLeft className="h-3.5 w-3.5"/>
          </Button>

          <div id="conv-panel-title-slot" className="flex min-w-0 flex-1 items-center gap-1">
            {editingTitle ? (<Input id="conv-panel-title-input" value={editTitleValue} onChange={(e) => setEditTitleValue(e.target.value)} onBlur={onSaveTitle} onKeyDown={(e) => {
                    if (e.key === 'Enter')
                        onSaveTitle();
                }} autoFocus className="h-7 min-w-0 flex-1 font-semibold" style={{ fontSize: `${titleFontSize}px` }}/>) : (<button id="conv-panel-title-btn" className="min-w-0 flex-1 truncate text-left font-semibold hover:underline" onClick={() => { setEditTitleValue(activeConv.Title); setEditingTitle(true); }} title={t('llmConversation.editTitle')} style={{ fontSize: `${titleFontSize}px` }}>
                {activeConv.Title}
              </button>)}

            <div id="conv-panel-title-font-controls" className="flex items-center gap-0.5 shrink-0">
              <Button id="conv-panel-title-font-decrease" variant="ghost" size="icon" className="h-6 w-6" onClick={onDecreaseTitleFontSize} title={t('llmConversation.decreaseTitleFont')} disabled={titleFontSize <= 12}>
                <Minus className="h-3.5 w-3.5"/>
              </Button>
              <span id="conv-panel-title-font-value" className="min-w-8 text-center font-mono text-muted-foreground" style={{ fontSize: `${Math.max(10, Math.round(titleFontSize * 0.7))}px` }}>
                {titleFontSize}
              </span>
              <Button id="conv-panel-title-font-increase" variant="ghost" size="icon" className="h-6 w-6" onClick={onIncreaseTitleFontSize} title={t('llmConversation.increaseTitleFont')} disabled={titleFontSize >= 25}>
                <Plus className="h-3.5 w-3.5"/>
              </Button>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button id="conv-panel-menu-trigger" variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreVertical className="h-3.5 w-3.5"/>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent id="conv-panel-menu-content" align="end">
              <DropdownMenuItem id="conv-panel-menu-edit-title" onClick={() => { setEditTitleValue(activeConv.Title); setEditingTitle(true); }}>
                <Pencil className="mr-2 h-3.5 w-3.5"/>
                {t('llmConversation.editTitle')}
              </DropdownMenuItem>
              <DropdownMenuItem id="conv-panel-menu-detail" onClick={onOpenDetail}>
                <Info className="mr-2 h-3.5 w-3.5"/>
                {t('llmConversation.fullDetail')}
              </DropdownMenuItem>
              <DropdownMenuSeparator id="conv-panel-menu-separator" />
              <DropdownMenuItem id="conv-panel-menu-new-conversation" onClick={onNewConversation}>
                <Plus className="mr-2 h-3.5 w-3.5"/>
                {t('llmConversation.newConversation')}
              </DropdownMenuItem>
              {!activeConv.ArchivedAt && (<DropdownMenuItem id="conv-panel-menu-archive" onClick={() => onArchive(activeConv)}>
                  <Archive className="mr-2 h-3.5 w-3.5"/>
                  {t('llmConversation.archive')}
                </DropdownMenuItem>)}
              <DropdownMenuItem id="conv-panel-menu-delete" onClick={() => onDelete(activeConv)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5"/>
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button id="conv-panel-btn-close" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose} title={t('common.close')}>
            <X className="h-3.5 w-3.5"/>
          </Button>
        </div>
      </div>

      {/* Sticky meta bar — conversation ID + detected language */}
      {activeConvId && (<div id="conv-panel-meta-row" className="shrink-0 flex items-center justify-between gap-2 border-b bg-background px-3 py-1">
          <div id="conv-panel-meta-left" className="flex min-w-0 items-center gap-2">
            <p id="conv-panel-conv-id" className="max-w-[160px] truncate text-[10px] text-muted-foreground/50 font-mono">
              {activeConvId}
            </p>
            <div id="conv-panel-scroll-mode-switch-wrap" className="flex items-center gap-1">
              <div id="conv-panel-scroll-mode-switch-holder" className="relative flex items-center">
                <Switch id="conv-panel-scroll-mode-switch" checked={scrollMode === 'follow'} onCheckedChange={(checked) => onScrollModeChange(checked ? 'follow' : 'stick')} aria-label={scrollMode === 'follow' ? t('llmConversation.scrollModeFollow') : t('llmConversation.scrollModeStick')} title={scrollMode === 'follow' ? t('llmConversation.scrollModeFollow') : t('llmConversation.scrollModeStick')} className="h-3 w-6 shrink-0 scale-75 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted/70 [&>span]:h-2.5 [&>span]:w-2.5 [&>span]:data-[state=checked]:translate-x-3 [&>span]:data-[state=unchecked]:translate-x-0">
                  <span id="conv-panel-scroll-mode-switch-icon" className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] text-muted-foreground/90">
                    {scrollMode === 'follow' ? <MoveDown className="h-2 w-2" /> : <Pin className="h-2 w-2" />}
                  </span>
                </Switch>
              </div>
              <span id="conv-panel-scroll-mode-label" className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">
                {scrollMode === 'follow' ? t('llmConversation.scrollModeFollow') : t('llmConversation.scrollModeStick')}
              </span>
            </div>
          </div>
          <div id="conv-panel-meta-right" className="flex items-center gap-2 shrink-0">
            {(() => {
                const lang = [...chatHistory].reverse().find((turn) => turn.detectedLanguage)?.detectedLanguage ?? 'en';
                return (<span id="conv-panel-detected-lang" className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                  {lang}
                </span>);
            })()}
          </div>
        </div>)}
    </>);
}
