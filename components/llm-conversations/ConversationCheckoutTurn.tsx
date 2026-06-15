'use client';
import { Separator } from '@/components/ui/separator';
import type { ConversationCheckout } from '@/hooks/use-chat-pipeline';
interface ConversationCheckoutTurnProps {
    checkout: ConversationCheckout;
    sourceTurnId: string;
    t: (key: string) => string;
}
export function ConversationCheckoutTurn({ checkout, sourceTurnId, t }: ConversationCheckoutTurnProps) {
    return (<div id={`conv-panel-checkout-root-${sourceTurnId}`} className="flex items-center gap-3 px-3 py-2">
      <Separator id={`conv-panel-checkout-separator-${sourceTurnId}`} className="flex-1"/>
      <span id={`conv-panel-checkout-used-${sourceTurnId}`} className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {t('llmConversation.tokensUsed')}: {checkout.usedTokens.toLocaleString()}
      </span>
    </div>);
}
