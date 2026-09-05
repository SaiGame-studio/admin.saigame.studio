"use client";

import { useEffect, useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { getGamePublicInfo, upsertGamePublicInfo, type GameReleaseStatus } from "@/lib/game-public-info-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const maxContentBytes = 1_000_000;

type FormState = {
    gameName: string;
    releaseStatus: GameReleaseStatus;
    releaseAt: string;
    releaseDateText: string;
    content: string;
};

function toDateTimeLocal(value?: string): string {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function GamePublicInfoCard({ gameId, defaultGameName }: { gameId: string; defaultGameName: string }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [form, setForm] = useState<FormState>({
        gameName: defaultGameName,
        releaseStatus: "coming_soon",
        releaseAt: "",
        releaseDateText: "",
        content: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        async function loadPublicInfo() {
            try {
                const info = await getGamePublicInfo(gameId);
                if (active) {
                    setForm({
                        gameName: info.game_name,
                        releaseStatus: info.release_status ?? "coming_soon",
                        releaseAt: toDateTimeLocal(info.release_at),
                        releaseDateText: info.release_date_text ?? "",
                        content: info.content ?? "",
                    });
                }
            } catch (error) {
                console.error("Failed to load game public info:", error);
                toast({ title: t("common.error"), description: t("gamePublicInfo.loadError"), variant: "destructive" });
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }
        loadPublicInfo();
        return () => {
            active = false;
        };
    }, [gameId, t, toast]);

    const contentBytes = new TextEncoder().encode(form.content).length;
    const requiresReleaseAt = form.releaseStatus === "released";
    const allowsReleaseDateText = form.releaseStatus === "coming_soon";
    const canSave = form.gameName.trim().length > 0 && (!requiresReleaseAt || form.releaseAt.length > 0) && contentBytes <= maxContentBytes;

    const save = async () => {
        if (!canSave) {
            return;
        }
        setSaving(true);
        try {
            const releaseAt = requiresReleaseAt ? new Date(form.releaseAt).toISOString() : undefined;
            await upsertGamePublicInfo(gameId, {
                game_name: form.gameName.trim(),
                release_status: form.releaseStatus,
                release_at: releaseAt,
                release_date_text: allowsReleaseDateText ? form.releaseDateText.trim() || undefined : undefined,
                content: form.content,
            });
            toast({ title: t("common.saved"), description: t("gamePublicInfo.saveSuccess") });
        } catch (error) {
            console.error("Failed to save game public info:", error);
            toast({ title: t("common.error"), description: t("gamePublicInfo.saveError"), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card id="game-public-info-card" className="game-public-info-card lg:col-span-3">
            <CardHeader id="game-public-info-header" className="game-public-info-header">
                <CardTitle id="game-public-info-title" className="game-public-info-title flex items-center gap-2 text-base">
                    <Megaphone id="game-public-info-title-icon" className="h-4 w-4"/>
                    {t("gamePublicInfo.title")}
                </CardTitle>
                <CardDescription id="game-public-info-description" className="game-public-info-description">
                    {t("gamePublicInfo.description")}
                </CardDescription>
            </CardHeader>
            <CardContent id="game-public-info-content" className="game-public-info-content space-y-4">
                {loading ? (
                    <div id="game-public-info-loading" className="game-public-info-loading flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 id="game-public-info-loading-icon" className="h-4 w-4 animate-spin"/>
                        {t("common.loading")}
                    </div>
                ) : (
                    <>
                        <div id="game-public-info-fields" className="game-public-info-fields grid gap-4 md:grid-cols-10">
                            <div id="game-public-info-name-field" className="game-public-info-field space-y-2 md:col-span-4">
                                <Label id="game-public-info-name-label" htmlFor="game-public-info-name-input">{t("gamePublicInfo.gameName")}</Label>
                                <Input id="game-public-info-name-input" value={form.gameName} maxLength={255} onChange={(event) => setForm((current) => ({ ...current, gameName: event.target.value }))} disabled={saving}/>
                            </div>
                            <div id="game-public-info-release-status-field" className="game-public-info-field space-y-2 md:col-span-3">
                                <Label id="game-public-info-release-status-label" htmlFor="game-public-info-release-status">{t("gamePublicInfo.releaseStatus")}</Label>
                                <Select value={form.releaseStatus} onValueChange={(value: GameReleaseStatus) => setForm((current) => ({
                                    ...current,
                                    releaseStatus: value,
                                    releaseAt: value === "released" ? current.releaseAt : "",
                                    releaseDateText: value === "coming_soon" ? current.releaseDateText : "",
                                }))} disabled={saving}>
                                    <SelectTrigger id="game-public-info-release-status">
                                        <SelectValue id="game-public-info-release-status-value"/>
                                    </SelectTrigger>
                                    <SelectContent id="game-public-info-release-status-options">
                                        <SelectItem id="game-public-info-release-status-released" value="released">{t("gamePublicInfo.released")}</SelectItem>
                                        <SelectItem id="game-public-info-release-status-coming-soon" value="coming_soon">{t("gamePublicInfo.comingSoon")}</SelectItem>
                                        <SelectItem id="game-public-info-release-status-to-be-announced" value="to_be_announced">{t("gamePublicInfo.toBeAnnounced")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {requiresReleaseAt && (
                                <div id="game-public-info-release-at-field" className="game-public-info-field space-y-2 md:col-span-3">
                                    <Label id="game-public-info-release-at-label" htmlFor="game-public-info-release-at-input">{t("gamePublicInfo.releaseAt")}</Label>
                                    <Input id="game-public-info-release-at-input" type="datetime-local" value={form.releaseAt} onChange={(event) => setForm((current) => ({ ...current, releaseAt: event.target.value }))} disabled={saving}/>
                                </div>
                            )}
                            {allowsReleaseDateText && (
                                <div id="game-public-info-release-date-text-field" className="game-public-info-field space-y-2 md:col-span-3">
                                    <Label id="game-public-info-release-date-text-label" htmlFor="game-public-info-release-date-text-input">{t("gamePublicInfo.releaseWindow")}</Label>
                                    <Input id="game-public-info-release-date-text-input" value={form.releaseDateText} maxLength={100} placeholder={t("gamePublicInfo.releaseWindowPlaceholder")} onChange={(event) => setForm((current) => ({ ...current, releaseDateText: event.target.value }))} disabled={saving}/>
                                </div>
                            )}
                        </div>
                        <div id="game-public-info-content-field" className="game-public-info-field space-y-2">
                            <Label id="game-public-info-content-label" htmlFor="game-public-info-content-input">{t("gamePublicInfo.content")}</Label>
                            <Textarea id="game-public-info-content-input" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} rows={12} disabled={saving} className="min-h-64 resize-y"/>
                            <p id="game-public-info-content-counter" className={`game-public-info-content-counter text-xs ${contentBytes > maxContentBytes ? "text-destructive" : "text-muted-foreground"}`}>
                                {t("gamePublicInfo.contentLimit", { current: contentBytes.toLocaleString(), max: maxContentBytes.toLocaleString() })}
                            </p>
                        </div>
                        <div id="game-public-info-actions" className="game-public-info-actions flex justify-end">
                            <Button id="game-public-info-save-button" type="button" onClick={save} disabled={saving || !canSave}>
                                {saving && <Loader2 id="game-public-info-save-icon" className="mr-2 h-4 w-4 animate-spin"/>}
                                {t("common.save")}
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
