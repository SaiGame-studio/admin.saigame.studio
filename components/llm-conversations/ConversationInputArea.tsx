'use client';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import type { RequestType } from '@/types/llm-conversation';
interface ConversationInputAreaProps {
    message: string;
    setMessage: (v: string) => void;
    isStreaming: boolean;
    requestTypes: RequestType[];
    selectedRequestType: string;
    setSelectedRequestType: (v: string) => void;
    autoDetectedType: string | null;
    setAutoDetectedType: (v: string | null) => void;
    onSend: () => void;
    t: (key: string) => string;
}
export function ConversationInputArea({ message, setMessage, isStreaming, requestTypes, selectedRequestType, setSelectedRequestType, autoDetectedType, setAutoDetectedType, onSend, t, }: ConversationInputAreaProps) {
    return (<div id="conv-panel-input-area" className="shrink-0 border-t p-2">
      <div id="conv-panel-input-box" className="flex flex-col rounded-xl border bg-background">
        <Textarea id="conv-panel-message-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('llmConversation.messagePlaceholder')} className="min-h-[60px] resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-xs px-3 py-2" onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
            }
        }}/>
      </div>

      {/* Bottom toolbar: request type + send */}
      <div id="conv-panel-input-toolbar" className="flex items-center gap-1.5 pt-1.5">
        <Select value={selectedRequestType} onValueChange={(v) => {
            setSelectedRequestType(v);
            setAutoDetectedType(null);
        }} disabled={isStreaming || requestTypes.length === 0}>
          <SelectTrigger id="conv-panel-request-type-trigger" className="h-7 text-xs flex-1">
            <span id="conv-panel-request-type-value" className="flex-1 text-left truncate">
              {(() => {
            if (autoDetectedType && selectedRequestType === 'auto') {
                const detectedLabel = t(`llmConversation.requestTypes.${autoDetectedType}`) || (requestTypes.find((rt) => rt.key === autoDetectedType)?.label ?? autoDetectedType);
                return `${t('llmConversation.requestTypes.auto')} - ${detectedLabel}`;
            }
            return t(`llmConversation.requestTypes.${selectedRequestType}`) || (requestTypes.find((rt) => rt.key === selectedRequestType)?.label ?? selectedRequestType);
        })()}
            </span>
          </SelectTrigger>
          <SelectContent id="conv-panel-request-type-content">
            {requestTypes.map((rt) => (<SelectItem id={`conv-panel-request-type-option-${rt.key}`} key={rt.key} value={rt.key} className="text-xs">
                {t(`llmConversation.requestTypes.${rt.key}`) || rt.label}
              </SelectItem>))}
          </SelectContent>
        </Select>

        <Button id="conv-panel-send-btn" size="sm" className="h-7 px-3 rounded-lg shrink-0 gap-1.5" disabled={isStreaming || !message.trim()} onClick={onSend}>
          {isStreaming ? (<Loader2 className="h-3.5 w-3.5 animate-spin"/>) : (<Send className="h-3.5 w-3.5"/>)}
          {t('llmConversation.send')}
        </Button>
      </div>
    </div>);
}
