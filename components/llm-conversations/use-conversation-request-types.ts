import { useEffect, useState } from 'react';
import { listRequestTypes } from '@/lib/llm-conversation-api';
import type { RequestType } from '@/types/llm-conversation';

interface UseConversationRequestTypesParams {
    t: (key: string) => string;
    onError: (message: string) => void;
}

export function useConversationRequestTypes({ t, onError }: UseConversationRequestTypesParams) {
    const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
    const [selectedRequestType, setSelectedRequestType] = useState<string>('auto');
    const [autoDetectedType, setAutoDetectedType] = useState<string | null>(null);

    useEffect(() => {
        listRequestTypes()
            .then((keys) => {
            const auto: RequestType = { key: 'auto', label: t('llmConversation.requestTypes.auto') };
            const mapped: RequestType[] = keys.map((k) => ({
                key: k,
                label: t(`llmConversation.requestTypes.${k}`) || k,
            }));
            setRequestTypes([auto, ...mapped]);
        })
            .catch(() => {
            onError(t('llmConversation.errorLoadRequestTypes'));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        requestTypes,
        selectedRequestType,
        setSelectedRequestType,
        autoDetectedType,
        setAutoDetectedType,
    };
}
