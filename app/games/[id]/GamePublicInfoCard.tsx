"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Megaphone, Upload } from "lucide-react";
import { acceptedGameImageTypes, createGameImageUpload, getGamePublicInfo, upsertGamePublicInfo, uploadToPresignedPost, type GameReleaseStatus } from "@/lib/game-public-info-api";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const maxContentBytes = 1_000_000;
const maxImageUrlLength = 2048;
// Sai Play renders game images on 3:4 portrait cards.
const recommendedImageSize = { width: 900, height: 1200 };
const minImageSize = { width: 600, height: 800 };
const imageRatioTolerance = 0.02;

function isValidImageUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return (url.protocol === "http:" || url.protocol === "https:") && url.host.length > 0;
    } catch {
        return false;
    }
}

type FormState = {
    gameName: string;
    releaseStatus: GameReleaseStatus;
    releaseAt: string;
    releaseDateText: string;
    content: string;
    imageUrl: string;
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
        imageUrl: "",
    });
    const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
                        imageUrl: info.image_url ?? "",
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
    const imageUrl = form.imageUrl.trim();
    const imageUrlValid = imageUrl.length === 0 || isValidImageUrl(imageUrl);
    const imageTooSmall = imageSize !== null && (imageSize.width < minImageSize.width || imageSize.height < minImageSize.height);
    const imageWrongRatio = imageSize !== null && Math.abs(imageSize.width / imageSize.height - 3 / 4) > imageRatioTolerance;
    const canSave = form.gameName.trim().length > 0 && (!requiresReleaseAt || form.releaseAt.length > 0) && contentBytes <= maxContentBytes && imageUrlValid;

    const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }
        if (!(acceptedGameImageTypes as readonly string[]).includes(file.type)) {
            toast({ title: t("common.error"), description: t("gamePublicInfo.uploadUnsupported"), variant: "destructive" });
            return;
        }
        setUploading(true);
        try {
            const upload = await createGameImageUpload(gameId, file.type);
            if (file.size > upload.max_bytes) {
                toast({ title: t("common.error"), description: t("gamePublicInfo.uploadTooLarge", { max: Math.floor(upload.max_bytes / (1024 * 1024)) }), variant: "destructive" });
                return;
            }
            await uploadToPresignedPost(upload, file);
            setImagePreviewFailed(false);
            setImageSize(null);
            setForm((current) => ({ ...current, imageUrl: upload.public_url }));
            toast({ title: t("common.success"), description: t("gamePublicInfo.uploadSuccess") });
        } catch (error) {
            console.error("Failed to upload game image:", error);
            const notConfigured = error instanceof ApiError && error.data?.message_code === "MEDIA_STORAGE_NOT_CONFIGURED";
            toast({ title: t("common.error"), description: t(notConfigured ? "gamePublicInfo.uploadNotConfigured" : "gamePublicInfo.uploadFailed"), variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

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
                image_url: imageUrl || undefined,
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
                        <div id="game-public-info-image-field" className="game-public-info-field grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                            <div id="game-public-info-image-url-field" className="game-public-info-image-url-field space-y-2">
                                <Label id="game-public-info-image-url-label" htmlFor="game-public-info-image-url-input">{t("gamePublicInfo.imageUrl")}</Label>
                                <div id="game-public-info-image-url-row" className="game-public-info-image-url-row flex gap-2">
                                    <Input
                                        id="game-public-info-image-url-input"
                                        type="url"
                                        inputMode="url"
                                        value={form.imageUrl}
                                        maxLength={maxImageUrlLength}
                                        placeholder={t("gamePublicInfo.imageUrlPlaceholder")}
                                        aria-invalid={!imageUrlValid}
                                        onChange={(event) => {
                                            setImagePreviewFailed(false);
                                            setImageSize(null);
                                            setForm((current) => ({ ...current, imageUrl: event.target.value }));
                                        }}
                                        disabled={saving || uploading}
                                    />
                                    <input
                                        id="game-public-info-image-file-input"
                                        ref={fileInputRef}
                                        type="file"
                                        accept={acceptedGameImageTypes.join(",")}
                                        className="hidden"
                                        onChange={uploadImage}
                                    />
                                    <Button id="game-public-info-image-upload-button" type="button" variant="outline" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={saving || uploading}>
                                        {uploading ? <Loader2 id="game-public-info-image-upload-icon" className="mr-2 h-4 w-4 animate-spin"/> : <Upload id="game-public-info-image-upload-icon" className="mr-2 h-4 w-4"/>}
                                        {uploading ? t("gamePublicInfo.uploading") : t("gamePublicInfo.uploadImage")}
                                    </Button>
                                </div>
                                <p id="game-public-info-image-url-hint" className={`game-public-info-image-url-hint text-xs ${imageUrlValid ? "text-muted-foreground" : "text-destructive"}`}>
                                    {imageUrlValid ? t("gamePublicInfo.imageUrlHint") : t("gamePublicInfo.imageUrlInvalid")}
                                </p>
                                <p id="game-public-info-image-spec" className="game-public-info-image-spec text-xs text-muted-foreground">
                                    {t("gamePublicInfo.imageSpec", { width: recommendedImageSize.width, height: recommendedImageSize.height, minWidth: minImageSize.width, minHeight: minImageSize.height })}
                                </p>
                                {imageUrl && imageUrlValid && imageSize && !imagePreviewFailed && (
                                    <p id="game-public-info-image-actual-size" className={`game-public-info-image-actual-size text-xs ${imageTooSmall || imageWrongRatio ? "text-destructive" : "text-muted-foreground"}`}>
                                        {t("gamePublicInfo.imageActualSize", { width: imageSize.width, height: imageSize.height })}
                                        {imageTooSmall && ` ${t("gamePublicInfo.imageTooSmall", { minWidth: minImageSize.width, minHeight: minImageSize.height })}`}
                                        {imageWrongRatio && ` ${t("gamePublicInfo.imageWrongRatio")}`}
                                    </p>
                                )}
                            </div>
                            {imageUrl && imageUrlValid && !imagePreviewFailed && (
                                <div id="game-public-info-image-preview" className="game-public-info-image-preview aspect-[3/4] w-28 overflow-hidden rounded-md border bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- external URL entered by the studio */}
                                    <img
                                        id="game-public-info-image-preview-img"
                                        src={imageUrl}
                                        alt={t("gamePublicInfo.imagePreviewAlt")}
                                        className="h-full w-full object-cover"
                                        onError={() => setImagePreviewFailed(true)}
                                        onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                                    />
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
                            <Button id="game-public-info-save-button" type="button" onClick={save} disabled={saving || uploading || !canSave}>
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
