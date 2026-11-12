"use client";

import { useEffect, useState } from "react";
import { getGameSteamSettings, type GameSteamSettings, type SteamRewardItem, type UpdateGameSteamSettings } from "@/lib/game-steam-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SteamRewardItemsEditor } from "./SteamRewardItemsEditor";
import { SteamSettingsConfirmDialog } from "./SteamSettingsConfirmDialog";

export function GameSteamSettingsCard({ gameId }: { gameId: string }) {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<GameSteamSettings | null>(null);
    const [enabled, setEnabled] = useState(false);
    const [appId, setAppId] = useState("");
    const [publisherKey, setPublisherKey] = useState("");
    const [removeKey, setRemoveKey] = useState(false);
    const [rewardCode, setRewardCode] = useState("");
    const [items, setItems] = useState<SteamRewardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, setPending] = useState<UpdateGameSteamSettings | null>(null);
    const apply = (value: GameSteamSettings) => {
        setSettings(value); setEnabled(value.enabled); setAppId(value.app_id ? String(value.app_id) : "");
        setRewardCode(value.reward_code); setItems(value.items ?? []); setPublisherKey(""); setRemoveKey(false);
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
            (items.length > 0 && !/^[a-zA-Z0-9_-]{1,100}$/.test(rewardCode.trim())) ||
            (items.length === 0 && rewardCode.trim() !== "") ||
            items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000)) {
            setError("steam.invalid"); return;
        }
        setError(null);
        setPending({ enabled, app_id: id, reward_code: rewardCode.trim(), items,
            ...(removeKey ? { publisher_key: "" } : publisherKey.trim() ? { publisher_key: publisherKey.trim() } : {}) });
    };
    const disabled = loading || !settings || pending !== null;
    return <Card id="game-steam-settings">
        <CardHeader id="game-steam-header">
            <CardTitle id="game-steam-title">{t("steam.title")}</CardTitle>
            <CardDescription id="game-steam-description">{t("steam.description")}</CardDescription>
        </CardHeader>
        <CardContent id="game-steam-content" className="space-y-5">
            {loading && <p id="game-steam-loading">{t("common.loading")}</p>}
            {error && <p id="game-steam-error" role="alert" className="text-sm text-destructive">{t(error)}</p>}
            {saved && <p id="game-steam-saved" role="status" className="text-sm text-green-600">{t("steam.saved")}</p>}
            <div id="game-steam-enabled-row" className="flex items-center justify-between gap-4">
                <Label id="game-steam-enabled-label" htmlFor="game-steam-enabled">{t("steam.enabled")}</Label>
                <Switch id="game-steam-enabled" checked={enabled} disabled={disabled} onCheckedChange={setEnabled}/>
            </div>
            <div id="game-steam-credentials-row" className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
                <div id="game-steam-app-id-field" className="min-w-0 space-y-2">
                    <Label id="game-steam-app-id-label" htmlFor="game-steam-app-id">{t("steam.appId")}</Label>
                    <Input id="game-steam-app-id" type="number" min={1} max={4294967295} step={1} value={appId} onChange={event => setAppId(event.target.value)} disabled={disabled}/>
                </div>
                <div id="game-steam-key-field" className="min-w-0 space-y-2">
                    <Label id="game-steam-key-label" htmlFor="game-steam-key">{t("steam.publisherKey")}</Label>
                    <Input id="game-steam-key" type="password" autoComplete="new-password" maxLength={1024} value={publisherKey} onChange={event => setPublisherKey(event.target.value)} disabled={disabled || removeKey}/>
                    <p id="game-steam-key-status" className="text-xs text-muted-foreground">{t(settings?.has_publisher_key ? "steam.keySaved" : "steam.keyMissing")}</p>
                    {settings?.has_publisher_key && <div id="game-steam-remove-key-row" className="flex items-center gap-3">
                        <Switch id="game-steam-remove-key" checked={removeKey} onCheckedChange={setRemoveKey} disabled={disabled || enabled}/>
                        <Label id="game-steam-remove-key-label" htmlFor="game-steam-remove-key">{t("steam.removeKey")}</Label>
                    </div>}
                </div>
            </div>
            <div id="game-steam-reward-code-field" className="space-y-2">
                <Label id="game-steam-reward-code-label" htmlFor="game-steam-reward-code">{t("steam.rewardCode")}</Label>
                <Input id="game-steam-reward-code" value={rewardCode} onChange={event => setRewardCode(event.target.value)} maxLength={100} disabled={disabled}/>
                <p id="game-steam-reward-code-hint" className="text-xs text-muted-foreground">{t("steam.rewardCodeHint")}</p>
            </div>
            <SteamRewardItemsEditor gameId={gameId} items={items} onChange={setItems} disabled={disabled}/>
            <Button id="game-steam-save" disabled={disabled} onClick={prepareSave}>{t("common.save")}</Button>
            {pending && <SteamSettingsConfirmDialog gameId={gameId} input={pending} onClose={() => setPending(null)} onSaved={value => { apply(value); setPending(null); setSaved(true); }}/>}
        </CardContent>
    </Card>;
}
