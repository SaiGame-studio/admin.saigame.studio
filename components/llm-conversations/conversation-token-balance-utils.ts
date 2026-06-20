import type { GameLLMTokenBalance } from '@/lib/llm-conversation-api';
import type { ChatTurn } from '@/hooks/use-chat-pipeline';

export interface ConversationCheckoutSummary {
    usedTokens: number;
    freeTokensUsed?: number;
    premiumTokensUsed?: number;
    freeTokensRemaining?: number;
    premiumTokensRemaining?: number;
}

export function buildCheckoutSummary(before: GameLLMTokenBalance | null, after: GameLLMTokenBalance): ConversationCheckoutSummary | null {
    if (!before) {
        return null;
    }
    const freeTokensUsed = Math.max(0, before.free_tokens_remaining - after.free_tokens_remaining);
    const premiumTokensUsed = Math.max(0, before.premium_tokens_remaining - after.premium_tokens_remaining);
    return {
        usedTokens: freeTokensUsed + premiumTokensUsed,
        freeTokensUsed: freeTokensUsed > 0 ? freeTokensUsed : undefined,
        premiumTokensUsed: premiumTokensUsed > 0 ? premiumTokensUsed : undefined,
        freeTokensRemaining: after.free_tokens_remaining,
        premiumTokensRemaining: after.premium_tokens_remaining,
    };
}

export function findLatestCheckoutSourceTurnId(chatHistory: ChatTurn[]): string | null {
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        const turn = chatHistory[i];
        if (turn.done && !turn.error && (turn.responses?.length ?? 0) > 0) {
            return turn.id;
        }
    }
    return null;
}
