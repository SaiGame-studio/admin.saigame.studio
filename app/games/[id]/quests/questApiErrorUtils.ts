import { ApiError } from "@/lib/api-client";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

export function getQuestApiErrorMessage(error: unknown, t: TranslationFn, fallbackKey: string): string {
    if (error instanceof ApiError) {
        const messageCode = typeof error.data?.message_code === "string" ? error.data.message_code.trim() : "";
        if (messageCode) {
            const translationKey = `quest.errors.${messageCode}`;
            const translatedMessage = t(translationKey, error.data?.message_params);
            if (translatedMessage !== translationKey) {
                return translatedMessage;
            }
        }

        const rawMessage = typeof error.data?.message === "string"
            ? error.data.message
            : typeof error.data?.error === "string"
                ? error.data.error
                : error.message;
        if (rawMessage) {
            return rawMessage;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }
    return t(fallbackKey);
}
