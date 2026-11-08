"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import ReactCountryFlag from "react-country-flag";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { defaultLocale, locales, type ValidLocale } from "@/lib/i18n/config";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { ShopItemTranslation, ShopItemTranslations } from "@/lib/shop-admin-api";

interface ShopItemTranslationsEditorProps {
    translations: ShopItemTranslations;
    english: ShopItemTranslation;
    onChange: (translations: ShopItemTranslations) => void;
    children: (languagePicker: ReactNode) => ReactNode;
}

export function ShopItemTranslationsEditor({ translations, english, onChange, children }: ShopItemTranslationsEditorProps) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<ValidLocale>(defaultLocale);
    const [open, setOpen] = useState(false);
    const languageNames = {
        of: (code: string) => new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code,
    };
    const text = translations[selected];
    const nameId = `shop-item-translation-${selected}-name`;
    const descriptionId = `shop-item-translation-${selected}-description`;

    function update(field: keyof ShopItemTranslation, value: string) {
        const current = translations[selected] ?? { display_name: "", description: "" };
        onChange({ ...translations, [selected]: { ...current, [field]: value } });
    }

    function selectLanguage(code: ValidLocale) {
        if (code !== defaultLocale) {
            const current = translations[code];
            const displayName = current?.display_name?.trim() ? current.display_name : english.display_name;
            const description = current?.description?.trim() ? current.description : english.description;
            if (displayName !== current?.display_name || description !== current?.description) {
                onChange({ ...translations, [code]: { display_name: displayName, description } });
            }
        }
        setSelected(code);
        setOpen(false);
    }

    const languagePicker = (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button id="shop-item-translations-language" type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={`${t("shopItemTranslations.language")}: ${languageNames.of(selected)}`} className="w-20 shrink-0 justify-between px-3">
                        <ReactCountryFlag id="shop-item-translations-language-flag" countryCode={new Intl.Locale(selected).maximize().region ?? "US"} svg title={languageNames.of(selected)} style={{ width: "1.5em", height: "1.5em" }} />
                        <ChevronsUpDown id="shop-item-translations-language-icon" className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent id="shop-item-translations-language-popover" className="w-64 p-0" align="end">
                    <Command id="shop-item-translations-language-command">
                        <CommandInput id="shop-item-translations-language-search" placeholder={t("shopItemTranslations.searchLanguage")} />
                        <CommandList id="shop-item-translations-language-list" className="max-h-48 overflow-y-auto">
                            <CommandEmpty id="shop-item-translations-language-empty">{t("shopItemTranslations.noLanguage")}</CommandEmpty>
                            <CommandGroup id="shop-item-translations-language-options">
                                {locales.map((code) => (
                                    <CommandItem id={`shop-item-translations-language-${code}`} key={code} value={`${languageNames.of(code)} ${code}`} onSelect={() => selectLanguage(code)}>
                                        <Check id={`shop-item-translations-language-${code}-check`} className={`mr-2 size-4 ${selected === code ? "opacity-100" : "opacity-0"}`} />
                                        <ReactCountryFlag id={`shop-item-translations-language-${code}-flag`} countryCode={new Intl.Locale(code).maximize().region ?? "US"} svg title={languageNames.of(code)} className="mr-2" style={{ width: "1.5em", height: "1.5em" }} />
                                        {languageNames.of(code)} ({code})
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
    );

    return (
        <section id="shop-item-translations" className="space-y-3">

            {selected === defaultLocale ? children(languagePicker) : (
                <div id={`shop-item-translation-${selected}`} className="space-y-3">
                    <p id="shop-item-translations-help" className="text-xs text-muted-foreground">{t("shopItemTranslations.fallbackHelp")}</p>
                    <div id={`${nameId}-field`} className="space-y-1.5">
                        <Label id={`${nameId}-label`} htmlFor={nameId}>{t("shopItemTranslations.displayName")} ({languageNames.of(selected)})</Label>
                        <div id={`${nameId}-row`} className="flex items-center gap-2">
                            <Input id={nameId} className="min-w-0 flex-1" value={text?.display_name ?? ""} onChange={(event) => update("display_name", event.target.value)} />
                            {languagePicker}
                        </div>
                    </div>
                    <div id={`${descriptionId}-field`} className="space-y-1.5">
                        <div id={`${descriptionId}-header`} className="flex items-center justify-between gap-2">
                            <Label id={`${descriptionId}-label`} htmlFor={descriptionId}>{t("shopItemTranslations.description")} ({languageNames.of(selected)})</Label>
                            <span id={`${descriptionId}-count`} className="shrink-0 text-xs text-muted-foreground">{text?.description.length ?? 0}/700</span>
                        </div>
                        <Textarea id={descriptionId} rows={7} value={text?.description ?? ""} maxLength={700} onChange={(event) => update("description", event.target.value)} />
                    </div>
                </div>
            )}
        </section>
    );
}
