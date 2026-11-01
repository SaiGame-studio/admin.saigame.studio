"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { acceptedGameImageTypes, createGameImageUpload, deleteGamePublicInfoImage, getGamePublicInfo, mainCurrencyPayload, mainCurrencyValue, MAIN_CURRENCY_SGEM, maxGameImageBytes, upsertGamePublicInfo, uploadToPresignedUrl, type GamePublicInfo, type GameReleaseStatus, type UpsertGamePublicInfoInput } from "@/lib/game-public-info-api";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GameBannerField } from "./GameBannerField";
import { GameImageCropDialog } from "./GameImageCropDialog";
import { GameMainCurrencyField } from "./GameMainCurrencyField";
import { InlineEditField } from "./InlineEditField";
import { saiPlayGameUrl } from "@/lib/sai-play";

const maxContentBytes = 1_000_000;

const RELEASE_STATUSES: GameReleaseStatus[] = ["released", "coming_soon", "to_be_announced"];
const RELEASE_STATUS_LABEL_KEYS: Record<GameReleaseStatus, string> = {
    released: "gamePublicInfo.released",
    coming_soon: "gamePublicInfo.comingSoon",
    to_be_announced: "gamePublicInfo.toBeAnnounced",
};

type FormState = {
    gameName: string;
    releaseStatus: GameReleaseStatus;
    releaseAt: string;
    releaseDateText: string;
    content: string;
    imageUrl: string;
    /** Uploaded media asset not saved yet; cleared after a save or when the image is deleted. */
    imageAssetId: string | null;
    isPublic: boolean;
    /** MAIN_CURRENCY_SGEM (default) or a currency item definition id. */
    mainCurrency: string;
};

function formToInput(form: FormState): UpsertGamePublicInfoInput {
    const imageUrl = form.imageUrl.trim();
    return {
        game_name: form.gameName.trim(),
        release_status: form.releaseStatus,
        release_at: form.releaseStatus === "released" ? new Date(form.releaseAt).toISOString() : undefined,
        release_date_text: form.releaseStatus === "coming_soon" ? form.releaseDateText.trim() || undefined : undefined,
        content: form.content,
        image_url: imageUrl || undefined,
        image_asset_id: form.imageAssetId ?? undefined,
        is_public: form.isPublic,
        ...mainCurrencyPayload(form.mainCurrency),
    };
}

/** The saved record with only its image replaced, so an image upload saves without committing other unsaved edits. */
function savedInfoWithImage(saved: GamePublicInfo, imageAssetId: string): UpsertGamePublicInfoInput | null {
    if (!saved.id || !saved.release_status) {
        return null;
    }
    return {
        game_name: saved.game_name,
        release_status: saved.release_status,
        release_at: saved.release_at ?? undefined,
        release_date_text: saved.release_date_text ?? undefined,
        content: saved.content ?? "",
        image_asset_id: imageAssetId,
    };
}

/** The saved record with only `patch` changed, so a setting saves right away without other unsaved edits. */
function savedInfoWith(saved: GamePublicInfo, patch: Partial<UpsertGamePublicInfoInput>): UpsertGamePublicInfoInput | null {
    if (!saved.id || !saved.release_status) {
        return null;
    }
    return {
        game_name: saved.game_name,
        release_status: saved.release_status,
        release_at: saved.release_at ?? undefined,
        release_date_text: saved.release_date_text ?? undefined,
        content: saved.content ?? "",
        image_url: saved.image_url ?? undefined,
        ...patch,
    };
}

function toDateTimeLocal(value?: string | null): string {
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
        imageAssetId: null,
        isPublic: false,
        mainCurrency: MAIN_CURRENCY_SGEM,
    });
    const [saved, setSaved] = useState<GamePublicInfo | null>(null);
    const [uploading, setUploading] = useState(false);
    // The chosen file waiting in the crop dialog; only the cropped result is uploaded.
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingVisibility, setSavingVisibility] = useState(false);
    // When (client clock) the saved banner may be deleted; from the server's remaining seconds, so clock skew does not matter.
    const [imageUnlockAt, setImageUnlockAt] = useState(0);
    useEffect(() => {
        const lockedSeconds = saved?.image_locked_seconds ?? 0;
        setImageUnlockAt(lockedSeconds > 0 ? Date.now() + lockedSeconds * 1000 : 0);
    }, [saved]);

    useEffect(() => {
        let active = true;
        async function loadPublicInfo() {
            try {
                const info = await getGamePublicInfo(gameId);
                if (active) {
                    setSaved(info);
                    setForm({
                        gameName: info.game_name,
                        releaseStatus: info.release_status ?? "coming_soon",
                        releaseAt: toDateTimeLocal(info.release_at),
                        releaseDateText: info.release_date_text ?? "",
                        content: info.content ?? "",
                        imageUrl: info.image_url ?? "",
                        imageAssetId: null,
                        isPublic: info.is_public ?? false,
                        mainCurrency: mainCurrencyValue(info.main_currency),
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

    // Saves the uploaded image right away: onto the saved record when there is one, otherwise with the
    // form when it is complete. Returns false when it must wait for a manual Save.
    const saveUploadedImage = async (imageAssetId: string): Promise<boolean> => {
        const input = (saved && savedInfoWithImage(saved, imageAssetId)) ?? (canSave ? formToInput({ ...form, imageAssetId }) : null);
        if (!input) {
            return false;
        }
        const info = await upsertGamePublicInfo(gameId, input, { suppressToast: true });
        setSaved(info);
        setForm((current) => ({ ...current, imageUrl: info.image_url ?? current.imageUrl, imageAssetId: null }));
        return true;
    };

    const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }
        if (!(acceptedGameImageTypes as readonly string[]).includes(file.type)) {
            toast({ title: t("common.error"), description: t("gamePublicInfo.uploadUnsupported"), variant: "destructive" });
            return;
        }
        setCropFile(file);
    };

    const uploadCroppedImage = async (file: File) => {
        setCropFile(null);
        if (file.size > maxGameImageBytes) {
            toast({ title: t("common.error"), description: t("gamePublicInfo.uploadTooLarge", { max: Math.floor(maxGameImageBytes / (1024 * 1024)) }), variant: "destructive" });
            return;
        }
        setUploading(true);
        let uploaded = false;
        try {
            const upload = await createGameImageUpload(gameId, file);
            await uploadToPresignedUrl(upload, file);
            uploaded = true;
            setForm((current) => ({ ...current, imageUrl: upload.public_url, imageAssetId: upload.asset_id }));
            const savedNow = await saveUploadedImage(upload.asset_id);
            toast({ title: t("common.success"), description: t(savedNow ? "gamePublicInfo.uploadSaved" : "gamePublicInfo.uploadSuccess") });
        } catch (error) {
            if (uploaded) {
                console.error("Failed to save uploaded game image:", error);
                toast({ title: t("common.error"), description: t("gamePublicInfo.uploadSaveFailed"), variant: "destructive" });
                return;
            }
            console.error("Failed to upload game image:", error);
            const code = error instanceof ApiError ? error.data?.message_code : undefined;
            const description = code === "MEDIA_STORAGE_NOT_CONFIGURED"
                ? t("gamePublicInfo.uploadNotConfigured")
                : code === "GAME_IMAGE_SIZE_INVALID"
                    ? t("gamePublicInfo.uploadTooLarge", { max: Math.floor(maxGameImageBytes / (1024 * 1024)) })
                    : code === "GAME_IMAGE_LOCKED"
                        ? t("gamePublicInfo.imageLocked")
                        : t("gamePublicInfo.uploadFailed");
            toast({ title: t("common.error"), description, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    // Saves the visibility right away: onto the saved record when there is one, otherwise with the
    // form when it is complete; else it waits for a manual Save.
    const changeVisibility = async (isPublic: boolean) => {
        const previous = form.isPublic;
        setForm((current) => ({ ...current, isPublic }));
        const input = (saved && savedInfoWith(saved, { is_public: isPublic })) ?? (canSave ? formToInput({ ...form, isPublic }) : null);
        if (!input) {
            toast({ title: t("gamePublicInfo.isPublic"), description: t("gamePublicInfo.isPublicSaveFirst") });
            return;
        }
        setSavingVisibility(true);
        try {
            const info = await upsertGamePublicInfo(gameId, input, { suppressToast: true });
            setSaved(info);
            setForm((current) => ({ ...current, isPublic: info.is_public }));
            toast({ title: t("common.saved"), description: t(info.is_public ? "gamePublicInfo.isPublicOnSaved" : "gamePublicInfo.isPublicOffSaved") });
        } catch (error) {
            console.error("Failed to save game visibility:", error);
            setForm((current) => ({ ...current, isPublic: previous }));
            toast({ title: t("common.error"), description: t("gamePublicInfo.saveError"), variant: "destructive" });
        } finally {
            setSavingVisibility(false);
        }
    };

    // Deletes the banner on the server (CDN first, then the database); the upload button shows again
    // only once the server confirms. A banner not saved yet is just removed from the form.
    const deleteImage = async () => {
        if (!saved?.id || !saved.image_url) {
            setForm((current) => ({ ...current, imageUrl: "", imageAssetId: null }));
            return;
        }
        try {
            const info = await deleteGamePublicInfoImage(gameId);
            setSaved(info);
            setForm((current) => ({ ...current, imageUrl: "", imageAssetId: null }));
            toast({ title: t("common.success"), description: t("gamePublicInfo.imageDeleted") });
        } catch (error) {
            console.error("Failed to delete game image:", error);
            const locked = error instanceof ApiError && error.data?.message_code === "GAME_IMAGE_LOCKED";
            toast({ title: t("common.error"), description: t(locked ? "gamePublicInfo.imageLocked" : "gamePublicInfo.imageDeleteFailed"), variant: "destructive" });
        }
    };

    // Saves the main currency right away, the same way as the visibility toggle.
    const changeMainCurrency = async (mainCurrency: string) => {
        const previous = form.mainCurrency;
        setForm((current) => ({ ...current, mainCurrency }));
        const payload = mainCurrencyPayload(mainCurrency);
        const input = (saved && savedInfoWith(saved, payload)) ?? (canSave ? formToInput({ ...form, mainCurrency }) : null);
        if (!input) {
            toast({ title: t("gamePublicInfo.mainCurrency"), description: t("gamePublicInfo.isPublicSaveFirst") });
            return;
        }
        setSavingVisibility(true);
        try {
            const info = await upsertGamePublicInfo(gameId, input, { suppressToast: true });
            setSaved(info);
            toast({ title: t("common.saved"), description: t("gamePublicInfo.mainCurrencySaved") });
        } catch (error) {
            console.error("Failed to save the main currency:", error);
            setForm((current) => ({ ...current, mainCurrency: previous }));
            toast({ title: t("common.error"), description: t("gamePublicInfo.saveError"), variant: "destructive" });
        } finally {
            setSavingVisibility(false);
        }
    };

    // Inline edits (name, release status, release date / window): saved right away onto the saved
    // record; before the first Save they only update the form.
    const [draft, setDraft] = useState<Pick<FormState, "gameName" | "releaseStatus" | "releaseAt" | "releaseDateText">>(form);
    const startEdit = () => setDraft({ gameName: form.gameName, releaseStatus: form.releaseStatus, releaseAt: form.releaseAt, releaseDateText: form.releaseDateText });
    const releaseStatusLabel = (status: GameReleaseStatus) => t(RELEASE_STATUS_LABEL_KEYS[status]);

    const saveFields = async (patch: Partial<FormState>): Promise<boolean> => {
        const next = { ...form, ...patch };
        if (!next.gameName.trim()) {
            toast({ title: t("common.error"), description: t("gamePublicInfo.gameNameRequired"), variant: "destructive" });
            return false;
        }
        if (next.releaseStatus === "released" && !next.releaseAt) {
            toast({ title: t("common.error"), description: t("gamePublicInfo.releaseAtRequired"), variant: "destructive" });
            return false;
        }
        const { game_name, release_status, release_at, release_date_text } = formToInput(next);
        const input = saved && savedInfoWith(saved, { game_name, release_status, release_at, release_date_text });
        if (!input) {
            setForm(next);
            return true;
        }
        try {
            const info = await upsertGamePublicInfo(gameId, input, { suppressToast: true });
            setSaved(info);
            setForm(next);
            toast({ title: t("common.saved"), description: t("gamePublicInfo.saveSuccess") });
            return true;
        } catch (error) {
            console.error("Failed to save game public info:", error);
            toast({ title: t("common.error"), description: t("gamePublicInfo.saveError"), variant: "destructive" });
            return false;
        }
    };

    const save = async () => {
        if (!canSave) {
            return;
        }
        setSaving(true);
        try {
            const info = await upsertGamePublicInfo(gameId, formToInput(form));
            setSaved(info);
            setForm((current) => ({ ...current, imageAssetId: null }));
            toast({ title: t("common.saved"), description: t("gamePublicInfo.saveSuccess") });
        } catch (error) {
            console.error("Failed to save game public info:", error);
            toast({ title: t("common.error"), description: t("gamePublicInfo.saveError"), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card id="game-public-info-card" className="game-public-info-card border-0 bg-transparent shadow-none">
            <CardHeader id="game-public-info-header" className="game-public-info-header px-0 pt-0">
                <CardDescription id="game-public-info-description" className="game-public-info-description">
                    {t("gamePublicInfo.description")}{" "}
                    <a id="game-public-info-sai-play-link" href={saiPlayGameUrl(gameId)} className="game-public-info-sai-play-link font-medium text-blue-400 hover:underline">Sai Play</a>
                    {t("gamePublicInfo.descriptionPost")}
                </CardDescription>
            </CardHeader>
            <CardContent id="game-public-info-content" className="game-public-info-content space-y-4 px-0 pb-0">
                {loading ? (
                    <div id="game-public-info-loading" className="game-public-info-loading flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 id="game-public-info-loading-icon" className="h-4 w-4 animate-spin"/>
                        {t("common.loading")}
                    </div>
                ) : (
                    <>
                        <div id="game-public-info-top" className="game-public-info-top grid gap-4 lg:grid-cols-4">
                            <div id="game-public-info-top-fields" className="game-public-info-top-fields space-y-4 lg:col-span-3">
                                <div id="game-public-info-sai-play-settings" className="game-public-info-sai-play-settings grid gap-4 sm:grid-cols-3 sm:items-stretch">
                                    <div id="game-public-info-visibility" className="game-public-info-visibility flex items-start justify-between gap-4 rounded-md border p-3 sm:col-span-2">
                                        <div id="game-public-info-visibility-text" className="game-public-info-visibility-text space-y-1">
                                            <Label id="game-public-info-visibility-label" htmlFor="game-public-info-visibility-switch">{t("gamePublicInfo.isPublic")}</Label>
                                            <p id="game-public-info-visibility-hint" className="game-public-info-visibility-hint text-xs text-muted-foreground">
                                                {t(form.isPublic ? "gamePublicInfo.isPublicOnHint" : "gamePublicInfo.isPublicOffHint")}
                                            </p>
                                            <p id="game-public-info-visibility-member-note" className="game-public-info-visibility-member-note text-xs text-muted-foreground">
                                                {t("gamePublicInfo.isPublicMemberNote")}
                                            </p>
                                        </div>
                                        <Switch id="game-public-info-visibility-switch" checked={form.isPublic} onCheckedChange={(checked) => void changeVisibility(checked)} disabled={saving || savingVisibility || uploading}/>
                                    </div>
                                    <GameMainCurrencyField gameId={gameId} value={form.mainCurrency} disabled={saving || savingVisibility || uploading} onChange={(value) => void changeMainCurrency(value)}/>
                                </div>
                                <div id="game-public-info-fields" className="game-public-info-fields grid gap-4 sm:grid-cols-3">
                                    <InlineEditField
                                        id="game-public-info-name"
                                        label={t("gamePublicInfo.gameName")}
                                        display={form.gameName}
                                        disabled={saving}
                                        onEdit={startEdit}
                                        editor={<Input id="game-public-info-name-input" value={draft.gameName} maxLength={255} autoFocus onChange={(event) => setDraft((current) => ({ ...current, gameName: event.target.value }))}/>}
                                        onSave={() => saveFields({ gameName: draft.gameName })}
                                    />
                                    <InlineEditField
                                        id="game-public-info-release-status"
                                        label={t("gamePublicInfo.releaseStatus")}
                                        display={releaseStatusLabel(form.releaseStatus)}
                                        disabled={saving}
                                        onEdit={startEdit}
                                        editor={(
                                            <>
                                                <Select value={draft.releaseStatus} onValueChange={(value: GameReleaseStatus) => setDraft((current) => ({ ...current, releaseStatus: value }))}>
                                                    <SelectTrigger id="game-public-info-release-status">
                                                        <SelectValue id="game-public-info-release-status-value"/>
                                                    </SelectTrigger>
                                                    <SelectContent id="game-public-info-release-status-options">
                                                        {RELEASE_STATUSES.map((status) => (
                                                            <SelectItem id={`game-public-info-release-status-${status}`} key={status} value={status}>{releaseStatusLabel(status)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {draft.releaseStatus === "released" && (
                                                    <Input id="game-public-info-release-status-release-at-input" type="datetime-local" value={draft.releaseAt} onChange={(event) => setDraft((current) => ({ ...current, releaseAt: event.target.value }))}/>
                                                )}
                                            </>
                                        )}
                                        onSave={() => saveFields({
                                            releaseStatus: draft.releaseStatus,
                                            releaseAt: draft.releaseStatus === "released" ? draft.releaseAt : "",
                                            releaseDateText: draft.releaseStatus === "coming_soon" ? form.releaseDateText : "",
                                        })}
                                    />
                                    {requiresReleaseAt && (
                                        <InlineEditField
                                            id="game-public-info-release-at"
                                            label={t("gamePublicInfo.releaseAt")}
                                            display={form.releaseAt ? new Date(form.releaseAt).toLocaleString() : "—"}
                                            disabled={saving}
                                            onEdit={startEdit}
                                            editor={<Input id="game-public-info-release-at-input" type="datetime-local" value={draft.releaseAt} autoFocus onChange={(event) => setDraft((current) => ({ ...current, releaseAt: event.target.value }))}/>}
                                            onSave={() => saveFields({ releaseAt: draft.releaseAt })}
                                        />
                                    )}
                                    {allowsReleaseDateText && (
                                        <InlineEditField
                                            id="game-public-info-release-date-text"
                                            label={t("gamePublicInfo.releaseWindow")}
                                            display={form.releaseDateText || <span id="game-public-info-release-date-text-empty" className="text-muted-foreground">—</span>}
                                            disabled={saving}
                                            onEdit={startEdit}
                                            editor={<Input id="game-public-info-release-date-text-input" value={draft.releaseDateText} maxLength={100} autoFocus placeholder={t("gamePublicInfo.releaseWindowPlaceholder")} onChange={(event) => setDraft((current) => ({ ...current, releaseDateText: event.target.value }))}/>}
                                            onSave={() => saveFields({ releaseDateText: draft.releaseDateText })}
                                        />
                                    )}
                                </div>
                            </div>
                            <GameBannerField imageUrl={form.imageUrl} unlockAt={imageUnlockAt} busy={uploading} disabled={saving || savingVisibility} onFileChosen={chooseImage} onDelete={deleteImage}/>
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
            <GameImageCropDialog file={cropFile} onCancel={() => setCropFile(null)} onConfirm={uploadCroppedImage}/>
        </Card>
    );
}
