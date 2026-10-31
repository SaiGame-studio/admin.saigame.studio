"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SGemIcon } from "@/components/SGemIcon";
import { listItemDefinitions } from "@/lib/inventory-api";
import { MAIN_CURRENCY_SGEM } from "@/lib/game-public-info-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { ItemDefinition } from "@/types/inventory";

const CURRENCY_PAGE_SIZE = 100;

type Props = {
    gameId: string;
    /** MAIN_CURRENCY_SGEM (default) or a currency item definition id. */
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
};

/** The game's main currency: sGem (default) first, then the game's "currency" item definitions. */
export function GameMainCurrencyField({ gameId, value, disabled, onChange }: Props) {
    const { t } = useTranslation();
    const [currencies, setCurrencies] = useState<ItemDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        listItemDefinitions({ gameId }, { category: "currency", limit: CURRENCY_PAGE_SIZE })
            .then((page) => {
                if (active) setCurrencies(page.items ?? []);
            })
            .catch(() => {
                if (active) setCurrencies([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [gameId]);

    return (
        <div id="game-public-info-main-currency-field" className="game-public-info-main-currency-field space-y-2 rounded-md border p-3">
            <Label id="game-public-info-main-currency-label" htmlFor="game-public-info-main-currency-select">{t("gamePublicInfo.mainCurrency")}</Label>
            <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
                <SelectTrigger id="game-public-info-main-currency-select" className="game-public-info-main-currency-select">
                    <SelectValue id="game-public-info-main-currency-value"/>
                </SelectTrigger>
                <SelectContent id="game-public-info-main-currency-options">
                    <SelectItem id="game-public-info-main-currency-option-sgem" value={MAIN_CURRENCY_SGEM}>
                        <span id="game-public-info-main-currency-option-sgem-label" className="inline-flex items-center gap-1.5">
                            <SGemIcon id="game-public-info-main-currency-option-sgem-icon"/>
                            sGem
                        </span>
                    </SelectItem>
                    {currencies.map((item) => (
                        <SelectItem id={`game-public-info-main-currency-option-${item.id}`} key={item.id} value={item.id}>
                            {item.name} ({item.item_code})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p id="game-public-info-main-currency-hint" className="game-public-info-main-currency-hint text-xs text-muted-foreground">{t("gamePublicInfo.mainCurrencyHint")}</p>
        </div>
    );
}
