'use client';
import { Archive, ChevronLeft, Info, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import type { Conversation } from '@/types/llm-conversation';
import type { ChatTurn } from '@/hooks/use-chat-pipeline';
interface ConversationHeaderProps {
    activeConv: Conversation;
    activeConvId: string | null;
    chatHistory: ChatTurn[];
    conversationTokenUsage: number | null;
    editingTitle: boolean;
    setEditingTitle: (v: boolean) => void;
    editTitleValue: string;
    setEditTitleValue: (v: string) => void;
    onSaveTitle: () => void;
    onBack: () => void;
    onClose: () => void;
    onArchive: (conv: Conversation) => void;
    onDelete: (conv: Conversation) => void;
    onOpenDetail: () => void;
    t: (key: string) => string;
}
export function ConversationHeader({ activeConv, activeConvId, chatHistory, conversationTokenUsage, editingTitle, setEditingTitle, editTitleValue, setEditTitleValue, onSaveTitle, onBack, onClose, onArchive, onDelete, onOpenDetail, t, }: ConversationHeaderProps) {
    return (<>
      <div id="conv-panel-conv-header" className="shrink-0 border-b px-3 py-2 space-y-1">
        <div id="conv-panel-title-row" className="flex items-start justify-between gap-1">
          <Button id="conv-panel-btn-back" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onBack} title={t('llmConversation.backToList')}>
            <ChevronLeft className="h-3.5 w-3.5"/>
          </Button>

          {editingTitle ? (<Input id="conv-panel-title-input" value={editTitleValue} onChange={(e) => setEditTitleValue(e.target.value)} onBlur={onSaveTitle} onKeyDown={(e) => {
                if (e.key === 'Enter')
                    onSaveTitle();
            }} autoFocus className="text-sm h-7 font-semibold"/>) : (<button id="conv-panel-title-btn" className="flex-1 text-left text-sm font-semibold hover:underline line-clamp-1" onClick={() => { setEditTitleValue(activeConv.Title); setEditingTitle(true); }} title={t('llmConversation.editTitle')}>
              {activeConv.Title}
            </button>)}

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
              <DropdownMenuSeparator />
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
          <p id="conv-panel-conv-id" className="text-[10px] text-muted-foreground/50 font-mono truncate">
            {activeConvId}
          </p>
          <div id="conv-panel-meta-right" className="flex items-center gap-2 shrink-0">
            {(() => {
                const lang = [...chatHistory].reverse().find((turn) => turn.detectedLanguage)?.detectedLanguage ?? 'en';
                return (<span id="conv-panel-detected-lang" className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                  {lang}
                </span>);
            })()}
            <span id="conv-panel-token-used" className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
              {t('llmConversation.tokensUsed')}: {conversationTokenUsage != null ? conversationTokenUsage.toLocaleString() : '0'}
            </span>
          </div>
        </div>)}
    </>);
}
