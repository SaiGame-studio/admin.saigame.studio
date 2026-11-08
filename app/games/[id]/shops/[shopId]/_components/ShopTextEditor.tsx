"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { updateShop, type ShopDefinition } from "@/lib/shop-admin-api";
import { ShopTextFields, type ShopTextValue } from "../../_components/ShopTextFields";

export function ShopTextEditor({ shop, onSaved }: { shop: ShopDefinition; onSaved: (shop: ShopDefinition) => void }) {
    const { t } = useTranslation();
    const [value, setValue] = useState<ShopTextValue>(() => ({
        name: shop.translations?.en?.name?.trim() ? shop.translations.en.name : shop.name,
        description: shop.translations?.en?.description?.trim() ? shop.translations.en.description : shop.description ?? "",
        translations: shop.translations ?? {},
    }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const savingRef = useRef(false);

    async function save() {
        if (savingRef.current) return;
        if (!value.name.trim()) { setError(t("shopText.nameRequired")); return; }
        savingRef.current = true;
        setSaving(true);
        setError(null);
        try {
            const english = { name: value.name.trim(), description: value.description.trim() };
            const updated = await updateShop(shop.game_id, shop.id, { ...english, translations: { ...value.translations, en: english } });
            onSaved(updated);
        } catch (error) {
            setError(error instanceof Error ? error.message : t("shopText.saveFailed"));
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    return (
        <div id="shop-text-editor" className="space-y-3">
            <fieldset id="shop-text-editor-fields" className="min-w-0 space-y-3" disabled={saving}>
                <ShopTextFields value={value} onChange={setValue} nameAction={
                    <Button id="shop-text-editor-save" type="button" size="sm" className="h-9 shrink-0 px-2 text-xs" disabled={saving} onClick={() => save()}>{t("common.save")}</Button>
                } />
            </fieldset>
            {error && <p id="shop-text-editor-error" role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
