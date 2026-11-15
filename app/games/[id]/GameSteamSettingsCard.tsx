"use client";

import { useEffect, useState } from "react";
import { getGameSteamSettings, type GameSteamSettings, type SteamRewardItem, type UpdateGameSteamSettings } from "@/lib/game-steam-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SteamRewardItemsEditor } from "./SteamRewardItemsEditor";
import { SteamSettingsConfirmDialog } from "./SteamSettingsConfirmDialog";

export function GameSteamSettingsCard({ gameId }: { gameId: string }) {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<GameSteamSettings | null>(null);
    const [enabled, setEnabled] = useState(false);
    const [appId, setAppId] = useState("");
    const [publisherKey, setPublisherKey] = useState("");
    const [removeKey, setRemoveKey] = useState(false);
    const [items, setItems] = useState<SteamRewardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, setPending] = useState<UpdateGameSteamSettings | null>(null);
    const apply = (value: GameSteamSettings) => {
        setSettings(value); setEnabled(value.enabled); setAppId(value.app_id ? String(value.app_id) : "");
        setItems(value.items ?? []); setPublisherKey(""); setRemoveKey(false);
    };
    useEffect(() => {
        let active = true;
        setLoading(true); setError(null); setPublisherKey(""); setPending(null); setSaved(false); setSettings(null);
        getGameSteamSettings(gameId).then(value => { if (active) apply(value); })
            .catch(() => { if (active) setError("steam.loadFailed"); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [gameId]);
    const prepareSave = () => {
        setSaved(false);
        const id = appId === "" ? 0 : Number(appId);
        if (!Number.isInteger(id) || id < 0 || id > 4294967295 || (enabled && (id === 0 || (removeKey || (!publisherKey.trim() && !settings?.has_publisher_key)))) ||
            items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000)) {
            setError("steam.invalid"); return;
        }
        setError(null);
        setPending({ enabled, app_id: id, items,
            ...(removeKey ? { publisher_key: "" } : publisherKey.trim() ? { publisher_key: publisherKey.trim() } : {}) });
    };
    const disabled = loading || !settings || pending !== null;
    const [enabledDescriptionBeforeLink, enabledDescriptionAfterLink] = t("steam.enabledDescription").split("{saiPlay}");
    const [twoFactorDescriptionBeforeWarning, twoFactorDescriptionAfterWarning] = t("steam.linkTwoFactorRequiredDescription").split("{cannotDisable}");
    return <section id="game-steam-settings" className="space-y-6">
        <header id="game-steam-header" className="space-y-1">
            <h2 id="game-steam-title" className="text-lg font-semibold">{t("steam.title")}</h2>
            <p id="game-steam-description" className="text-sm text-muted-foreground">{t("steam.description")}</p>
        </header>
        <div id="game-steam-content">
            {loading && <p id="game-steam-loading">{t("common.loading")}</p>}
            {error && <p id="game-steam-error" role="alert" className="text-sm text-destructive">{t(error)}</p>}
            {saved && <p id="game-steam-saved" role="status" className="text-sm text-green-600">{t("steam.saved")}</p>}
            <div id="game-steam-enabled-row" className="flex items-center justify-between gap-4 border-y border-border/50 py-5">
                <div id="game-steam-enabled-text" className="max-w-2xl space-y-1">
                    <Label id="game-steam-enabled-label" htmlFor="game-steam-enabled">{t("steam.enabled")}</Label>
                    <p id="game-steam-enabled-description" className="text-sm text-muted-foreground">
                        {enabledDescriptionBeforeLink}<a id="game-steam-sai-play-account-link" href="https://play.saigame.studio/account/steam" className="font-medium text-blue-500 hover:underline">Sai Play</a>{enabledDescriptionAfterLink}
                    </p>
                </div>
                <Switch id="game-steam-enabled" className="shrink-0" checked={enabled} disabled={disabled} onCheckedChange={setEnabled} aria-describedby="game-steam-enabled-description"/>
            </div>
            <div id="game-steam-link-two-factor-row" className="flex items-center justify-between gap-4 border-b border-border/50 py-5">
                <div id="game-steam-link-two-factor-text" className="max-w-2xl space-y-1">
                    <Label id="game-steam-link-two-factor-label" htmlFor="game-steam-link-two-factor">{t("steam.linkTwoFactorRequired")}</Label>
                    <p id="game-steam-link-two-factor-description" className="text-sm text-muted-foreground">
                        {twoFactorDescriptionBeforeWarning}<span id="game-steam-link-two-factor-warning" className="font-medium text-amber-600 dark:text-amber-400">{t("steam.linkTwoFactorCannotDisable")}</span>{twoFactorDescriptionAfterWarning}
                    </p>
                </div>
                <Switch id="game-steam-link-two-factor" className="shrink-0" checked disabled aria-describedby="game-steam-link-two-factor-description"/>
            </div>
            <div id="game-steam-app-id-field" className="flex flex-col gap-3 border-b border-border/50 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <Label id="game-steam-app-id-label" htmlFor="game-steam-app-id">{t("steam.appId")}</Label>
                <Input id="game-steam-app-id" className="w-full sm:w-80" type="number" min={1} max={4294967295} step={1} value={appId} onChange={event => setAppId(event.target.value)} disabled={disabled}/>
            </div>
            <div id="game-steam-key-field" className="flex flex-col gap-3 border-b border-border/50 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                <div id="game-steam-key-description" className="min-w-0 max-w-2xl space-y-2">
                    <Label id="game-steam-key-label" htmlFor="game-steam-key">{t("steam.publisherKey")}</Label>
                    <a id="game-steam-key-help-link" href="https://partner.steamgames.com/doc/webapi_overview/auth" className="block text-xs text-blue-500 hover:underline">{t("steam.getPublisherKey")}</a>
                    {settings?.has_publisher_key && <p id="game-steam-key-status" className="text-xs text-muted-foreground">{t("steam.keySaved")}</p>}
                </div>
                <Input id="game-steam-key" className="w-full shrink-0 sm:w-80" type="password" autoComplete="new-password" maxLength={1024} value={publisherKey} onChange={event => setPublisherKey(event.target.value)} disabled={disabled || removeKey}/>
            </div>
            {settings?.has_publisher_key && <div id="game-steam-remove-key-row" className="flex items-center justify-between gap-4 border-b border-border/50 py-5">
                <Label id="game-steam-remove-key-label" htmlFor="game-steam-remove-key">{t("steam.removeKey")}</Label>
                <Switch id="game-steam-remove-key" checked={removeKey} onCheckedChange={setRemoveKey} disabled={disabled || enabled}/>
            </div>}
            <div id="game-steam-rewards-row" className="border-b border-border/50 py-5">
                <SteamRewardItemsEditor gameId={gameId} items={items} onChange={setItems} disabled={disabled}/>
            </div>
            <div id="game-steam-actions" className="pt-5">
                <Button id="game-steam-save" disabled={disabled} onClick={prepareSave}>{t("common.save")}</Button>
            </div>
            {pending && <SteamSettingsConfirmDialog gameId={gameId} input={pending} onClose={() => setPending(null)} onSaved={value => { apply(value); setPending(null); setSaved(true); }}/>}
        </div>
    </section>;
}
