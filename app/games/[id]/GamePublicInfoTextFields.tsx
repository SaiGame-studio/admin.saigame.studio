"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { GamePublicInfoTranslations } from "@/lib/game-public-info-api";
import { ShopItemTranslationsEditor } from "./shops/[shopId]/_components/ShopItemTranslationsEditor";
import { ShopDescriptionEditor } from "./shops/_components/ShopDescriptionEditor";

interface TextValue {
    gameName: string;
    content: string;
    translations: GamePublicInfoTranslations;
}

interface Props extends TextValue {
    disabled: boolean;
    onChange: (value: TextValue) => void;
}

const maxContentBytes = 1_000_000;

export function GamePublicInfoTextFields({ gameName, content, translations, disabled, onChange }: Props) {
    const { t } = useTranslation();
    const value = { gameName, content, translations };
    const editorTranslations = Object.fromEntries(Object.entries(translations).map(([code, text]) => [code, { display_name: text.game_name, description: text.content }]));
    function counter(text: string) {
        const bytes = new TextEncoder().encode(text).length;
        return <span id="game-public-info-text-byte-count" className={bytes > maxContentBytes ? "text-destructive" : "text-muted-foreground"}>
            {t("gamePublicInfo.contentLimit", { current: bytes.toLocaleString(), max: maxContentBytes.toLocaleString() })}
        </span>;
    }

    return <fieldset id="game-public-info-text-fields" className="min-w-0 space-y-3" disabled={disabled}>
        <ShopItemTranslationsEditor
            nameLabel={t("gamePublicInfo.gameName")}
            nameMaxLength={255}
            contentLabel={t("gamePublicInfo.content")}
            contentCounter={counter}
            maxLength={maxContentBytes}
            disabled={disabled}
            translations={editorTranslations}
            english={{ display_name: gameName, description: content }}
            onChange={(next) => onChange({ ...value, translations: Object.fromEntries(Object.entries(next).map(([code, text]) => [code, { game_name: text.display_name, content: text.description }])) })}
        >
            {(languagePicker) => <>
                <div id="game-public-info-text-name-field" className="space-y-1.5">
                    <Label id="game-public-info-text-name-label" htmlFor="game-public-info-text-name">{t("gamePublicInfo.gameName")} (English)</Label>
                    <div id="game-public-info-text-name-row" className="flex items-center gap-2">
                        <Input id="game-public-info-text-name" className="min-w-0 flex-1" maxLength={255} value={gameName} onChange={(event) => onChange({ ...value, gameName: event.target.value })} />
                        {languagePicker}
                    </div>
                </div>
                <div id="game-public-info-text-content-field" className="space-y-1.5">
                    <div id="game-public-info-text-content-header" className="flex flex-wrap items-center justify-between gap-2">
                        <Label id="game-public-info-text-content-label">{t("gamePublicInfo.content")} (English)</Label>
                        <span id="game-public-info-text-content-counter" className="text-xs">{counter(content)}</span>
                    </div>
                    <ShopDescriptionEditor id="game-public-info-text-content" labelId="game-public-info-text-content-label" maxLength={maxContentBytes} value={content} disabled={disabled} onChange={(next) => onChange({ ...value, content: next })} />
                </div>
            </>}
        </ShopItemTranslationsEditor>
    </fieldset>;
}
