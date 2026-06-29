"use client";

import { ApiError } from "@/lib/api-client";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

export function formatTechnicalLabel(value?: string) {
    if (!value) {
        return "";
    }

    return value
        .split(/[_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function getCloneSessionStatusStyle(status?: string) {
    if (status === "running") {
        return {
            pill: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
            dot: "bg-sky-500",
        };
    }

    if (status === "created") {
        return {
            pill: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            dot: "bg-amber-500",
        };
    }

    if (status === "blocked" || status === "failed") {
        return {
            pill: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
            dot: "bg-red-500",
        };
    }

    if (status === "completed") {
        return {
            pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            dot: "bg-emerald-500",
        };
    }

    return {
        pill: "border-muted-foreground/20 bg-muted/60 text-muted-foreground",
        dot: "bg-muted-foreground",
    };
}

export function getCloneSessionErrorMessage(error: unknown, t: TranslationFn) {
    const rawMessage = error instanceof ApiError
        ? (error.data?.message || error.data?.error || error.message)
        : error instanceof Error
            ? error.message
            : "";

    const normalizedMessage = rawMessage.trim().toLowerCase();

    if (normalizedMessage === "insufficient balance") {
        return t("cloneGame.sourceGameCloneProgressInsufficientBalance");
    }

    return rawMessage || t("common.error");
}

export function getCloneSessionPhaseLabel(phaseKey: string | undefined, t: TranslationFn) {
    switch (phaseKey) {
        case "item_definitions":
            return t("cloneGame.sourceGameCurrentSessionItemDefinitionsTabLabel");
        case "item_container_definitions":
            return t("cloneGame.sourceGameCurrentSessionItemContainerDefinitionsTabLabel");
        case "item_tags":
        case "item_tag_definitions":
            return t("cloneGame.sourceGameCurrentSessionItemTagsTabLabel");
        case "quest_definitions":
            return t("cloneGame.sourceGameCurrentSessionQuestDefinitionsTabLabel");
        case "shop_definitions":
            return t("cloneGame.sourceGameCurrentSessionShopDefinitionsTabLabel");
        default:
            return formatTechnicalLabel(phaseKey) || t("common.unknown");
    }
}

export function getProgressValue(processed?: number, total?: number) {
    if (!total || total <= 0) {
        return 0;
    }

    return Math.min(100, Math.max(0, ((processed ?? 0) / total) * 100));
}
