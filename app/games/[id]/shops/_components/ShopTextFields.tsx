"use client";

import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { ShopTranslations } from "@/lib/shop-admin-api";
import { ShopItemTranslationsEditor } from "../[shopId]/_components/ShopItemTranslationsEditor";

export interface ShopTextValue {
    name: string;
    description: string;
    translations: ShopTranslations;
}

export function ShopTextFields({ value, onChange, nameAction }: { value: ShopTextValue; onChange: (value: ShopTextValue) => void; nameAction?: ReactNode }) {
    const { t } = useTranslation();
    const translations = Object.fromEntries(Object.entries(value.translations).map(([code, text]) => [code, { display_name: text.name, description: text.description }]));

    return (
        <ShopItemTranslationsEditor
            nameAction={nameAction}
            nameLabel={t("shop.name")}
            english={{ display_name: value.name, description: value.description }}
            translations={translations}
            onChange={(next) => onChange({ ...value, translations: Object.fromEntries(Object.entries(next).map(([code, text]) => [code, { name: text.display_name, description: text.description }])) })}
        >
            {(languagePicker) => <>
                <div id="shop-text-name-field" className="space-y-1.5">
                    <Label id="shop-text-name-label" htmlFor="shop-text-name">{t("shop.name")} (English)</Label>
                    <div id="shop-text-name-row" className="flex items-center gap-2">
                        <Input id="shop-text-name" className="min-w-0 flex-1" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
                        {languagePicker}
                    </div>
                </div>
                <div id="shop-text-description-field" className="space-y-1.5">
                    <div id="shop-text-description-header" className="flex items-center justify-between gap-2">
                        <Label id="shop-text-description-label" htmlFor="shop-text-description">{t("shopItemTranslations.description")} (English)</Label>
                        <span id="shop-text-description-count" className="shrink-0 text-xs text-muted-foreground">{value.description.length}/700</span>
                    </div>
                    <Textarea id="shop-text-description" rows={7} maxLength={700} value={value.description} onChange={(event) => onChange({ ...value, description: event.target.value })} />
                    <p id="shop-text-english-help" className="text-xs leading-snug text-muted-foreground">{t("shopItemTranslations.englishHelp")}</p>
                </div>
            </>}
        </ShopItemTranslationsEditor>
    );
}
