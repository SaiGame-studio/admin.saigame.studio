'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LLMConversationPanel } from './ConversationPanel';

export function LLMConversationPanelGate() {
    const pathname = usePathname();
    const { isAuthenticated, isLoading } = useAuth();

    if (!pathname.startsWith('/games') || isLoading || !isAuthenticated) {
        return null;
    }

    return <LLMConversationPanel />;
}
