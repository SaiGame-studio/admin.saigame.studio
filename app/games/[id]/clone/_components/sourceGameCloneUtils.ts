import { ApiError } from "@/lib/api-client";
import type { Game } from "@/types/game";

export type TranslationFn = (key: string) => string;

export type StartConfirmBillingDetails = {
    items: Array<{
        id: string;
        text: string;
        containsGemUnit?: boolean;
    }>;
};

export const GEM_UNIT_TOKEN = "__SGEM_UNIT__";

export function getVisibilityLabel(game: Game, t: TranslationFn) {
    const shareLevel = game.share_level ?? "private";

    if (shareLevel === "public") {
        return t("cloneGame.public");
    }

    if (shareLevel === "protected") {
        return t("cloneGame.protected");
    }

    return t("cloneGame.private");
}

export function getVisibilityStatusStyle(shareLevel?: Game["share_level"]) {
    if (shareLevel === "public") {
        return {
            pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
            dot: "bg-emerald-500",
        };
    }

    if (shareLevel === "protected") {
        return {
            pill: "border-amber-500/30 bg-amber-500/10 text-amber-700",
            dot: "bg-amber-500",
        };
    }

    return {
        pill: "border-slate-500/30 bg-slate-500/10 text-slate-700",
        dot: "bg-slate-500",
    };
}

export function getVisibilityPriceLabel(game: Game, t: TranslationFn) {
    const shareLevel = game.share_level ?? "private";

    if (shareLevel !== "public") {
        return null;
    }

    return `${game.clone_cost ?? 7} ${t("cloneGame.clonePriceUnit")}`;
}

export function getRequiredCloneCost(game: Game | null) {
    if (!game) {
        return 0;
    }

    if (game.is_purchased) {
        return 0;
    }

    return game.share_level === "public" ? game.clone_cost ?? 7 : 0;
}

export function getStartConfirmBillingDetails(game: Game, t: TranslationFn): StartConfirmBillingDetails {
    const requiredCloneCost = getRequiredCloneCost(game);

    if (!game.is_my_game && !game.same_studio && requiredCloneCost > 0) {
        return {
            items: [
                {
                    id: "charged-amount",
                    text: t("cloneGame.sourceGameStartConfirmChargedAmount")
                        .replace("{amount}", `${requiredCloneCost} ${t("cloneGame.clonePriceUnit")}`),
                },
                {
                    id: "charged-not-my-game",
                    text: t("cloneGame.sourceGameStartConfirmChargedNotMyGame"),
                },
                {
                    id: "charged-not-same-studio",
                    text: t("cloneGame.sourceGameStartConfirmChargedNotSameStudio"),
                },
            ],
        };
    }

    if (game.is_my_game) {
        return {
            items: [
                {
                    id: "free-no-deduction",
                    text: t("cloneGame.sourceGameStartConfirmFreeNoDeduction").replace("{unit}", GEM_UNIT_TOKEN),
                    containsGemUnit: true,
                },
                {
                    id: "free-reason-my-game",
                    text: t("cloneGame.sourceGameStartConfirmFreeReasonMyGame"),
                },
            ],
        };
    }

    if (game.is_purchased) {
        return {
            items: [
                {
                    id: "free-no-deduction",
                    text: t("cloneGame.sourceGameStartConfirmFreeNoDeduction").replace("{unit}", GEM_UNIT_TOKEN),
                    containsGemUnit: true,
                },
                {
                    id: "free-reason-purchased",
                    text: t("cloneGame.sourceGameStartConfirmFreeReasonPurchased"),
                },
            ],
        };
    }

    if (game.same_studio) {
        return {
            items: [
                {
                    id: "free-no-deduction",
                    text: t("cloneGame.sourceGameStartConfirmFreeNoDeduction").replace("{unit}", GEM_UNIT_TOKEN),
                    containsGemUnit: true,
                },
                {
                    id: "free-reason-same-studio",
                    text: t("cloneGame.sourceGameStartConfirmFreeReasonSameStudio"),
                },
            ],
        };
    }

    return {
        items: [
            {
                id: "free-no-deduction",
                text: t("cloneGame.sourceGameStartConfirmFreeNoDeduction").replace("{unit}", GEM_UNIT_TOKEN),
                containsGemUnit: true,
            },
            {
                id: "free-reason-no-fee",
                text: t("cloneGame.sourceGameStartConfirmFreeReasonNoFee"),
            },
        ],
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
