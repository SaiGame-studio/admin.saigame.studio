"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/lib/i18n/use-translation";

type SourceGameFiltersProps = {
    sameStudio: boolean;
    myGames: boolean;
    isPurchased: boolean;
    onSameStudioChange: (value: boolean) => void;
    onMyGamesChange: (value: boolean) => void;
    onIsPurchasedChange: (value: boolean) => void;
};

type FilterSwitchProps = {
    idPrefix: string;
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
};

function FilterSwitch({ idPrefix, label, checked, onChange }: FilterSwitchProps) {
    return (
        <div id={`${idPrefix}-field`} className="flex h-9 items-center gap-1.5">
            <Switch id={`${idPrefix}-switch`} checked={checked} onCheckedChange={onChange} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3" />
            <Label id={`${idPrefix}-label`} htmlFor={`${idPrefix}-switch`} className="cursor-pointer whitespace-nowrap text-xs text-muted-foreground">
                {label}
            </Label>
        </div>
    );
}

export function SourceGameFilters({
    sameStudio,
    myGames,
    isPurchased,
    onSameStudioChange,
    onMyGamesChange,
    onIsPurchasedChange,
}: SourceGameFiltersProps) {
    const { t } = useTranslation();

    return (
        <div id="clone-game-source-filters" className="flex flex-wrap items-center gap-1.5">
            <FilterSwitch
                idPrefix="clone-game-source-filter-same-studio"
                label={t("cloneGame.sourceGameSameStudio")}
                checked={sameStudio}
                onChange={onSameStudioChange}
            />
            <FilterSwitch
                idPrefix="clone-game-source-filter-my-games"
                label={t("cloneGame.sourceGameMyGames")}
                checked={myGames}
                onChange={onMyGamesChange}
            />
            <FilterSwitch
                idPrefix="clone-game-source-filter-purchased"
                label={t("cloneGame.sourceGamePurchased")}
                checked={isPurchased}
                onChange={onIsPurchasedChange}
            />
        </div>
    );
}
