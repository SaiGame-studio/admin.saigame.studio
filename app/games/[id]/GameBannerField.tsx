"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CircleHelp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { acceptedGameImageTypes } from "@/lib/game-public-info-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { gameImageMinSourceSize, gameImageOutputSize } from "./GameImageCropDialog";

// Sai Play renders game images on 3:4 portrait cards; uploads are cropped to this size.
const imageRatioTolerance = 0.02;
// Mirrors the server lock (domain.GameImageLockDuration): a saved banner can be deleted this long after upload.
const bannerLockSeconds = 60;

type Props = {
    /** Current banner URL; empty when the game has no banner. */
    imageUrl: string;
    /** Client time (ms) from which the saved banner may be deleted; Delete stays disabled until then. */
    unlockAt: number;
    busy: boolean;
    disabled: boolean;
    /** A file was chosen; the card opens the crop dialog and uploads the cropped image. */
    onFileChosen: (event: ChangeEvent<HTMLInputElement>) => void;
    /** Deletes the banner on the server; the confirmation stays open until it settles. */
    onDelete: () => Promise<void>;
};

/** Game banner: an "Upload Game Banner" button when there is none, otherwise the image and Delete. */
export function GameBannerField({ imageUrl, unlockAt, busy, disabled, onFileChosen, onDelete }: Props) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [size, setSize] = useState<{ url: string; width: number; height: number } | null>(null);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    // Ticks once a second until the banner unlocks.
    useEffect(() => {
        // Refresh now even when already unlocked: a stale mount-time now would leave unlockAt - now at a few ms,
        // which rounds up to a permanent "1s" countdown.
        const start = Date.now();
        setNow(start);
        if (unlockAt <= start) {
            return;
        }
        const timer = window.setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (current >= unlockAt) {
                window.clearInterval(timer);
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [unlockAt]);
    const lockedSeconds = imageUrl ? Math.min(bannerLockSeconds, Math.max(0, Math.ceil((unlockAt - now) / 1000))) : 0;
    const locked = lockedSeconds > 0;

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await onDelete();
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
        }
    };
    const imageSize = size?.url === imageUrl ? size : null;
    const tooSmall = imageSize !== null && (imageSize.width < gameImageMinSourceSize.width || imageSize.height < gameImageMinSourceSize.height);
    const wrongRatio = imageSize !== null && Math.abs(imageSize.width / imageSize.height - 3 / 4) > imageRatioTolerance;

    return (
        <div id="game-public-info-banner" className="game-public-info-banner flex flex-col gap-2 rounded-md border p-3">
            <Label id="game-public-info-banner-label">{t("gamePublicInfo.gameBanner")}</Label>
            {/* Same frame and footer with or without an image, so the card height never changes. */}
            <div id="game-public-info-banner-frame" className="game-public-info-banner-frame relative mx-auto aspect-[3/4] w-full max-w-[12rem] overflow-hidden rounded-md border bg-muted">
                {imageUrl ? (
                    failedUrl === imageUrl ? (
                        <p id="game-public-info-banner-preview-failed" className="game-public-info-banner-preview-failed flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                            {t("gamePublicInfo.imagePreviewFailed")}
                        </p>
                    ) : (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded image in media storage */}
                            <img
                                id="game-public-info-banner-preview-img"
                                src={imageUrl}
                                alt={t("gamePublicInfo.imagePreviewAlt")}
                                className="h-full w-full object-cover"
                                onError={() => setFailedUrl(imageUrl)}
                                onLoad={(event) => setSize({ url: imageUrl, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                            />
                            {imageSize && (
                                <p id="game-public-info-banner-size" className={`game-public-info-banner-size absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-center text-[11px] leading-tight ${tooSmall || wrongRatio ? "text-red-300" : "text-white"}`}>
                                    {t("gamePublicInfo.imageActualSize", { width: imageSize.width, height: imageSize.height })}
                                    {tooSmall && ` ${t("gamePublicInfo.imageTooSmall", { minWidth: gameImageMinSourceSize.width, minHeight: gameImageMinSourceSize.height })}`}
                                    {wrongRatio && ` ${t("gamePublicInfo.imageWrongRatio")}`}
                                </p>
                            )}
                        </>
                    )
                ) : (
                    <>
                        <input
                            id="game-public-info-banner-file-input"
                            ref={fileInputRef}
                            type="file"
                            accept={acceptedGameImageTypes.join(",")}
                            className="hidden"
                            onChange={onFileChosen}
                        />
                        <button
                            id="game-public-info-banner-upload"
                            type="button"
                            className="game-public-info-banner-upload flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-transparent p-3 text-center text-sm font-medium hover:border-primary/50 hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || busy}
                        >
                            {busy ? <Loader2 id="game-public-info-banner-upload-icon" className="h-6 w-6 animate-spin"/> : <ImagePlus id="game-public-info-banner-upload-icon" className="h-6 w-6"/>}
                            {busy ? t("gamePublicInfo.uploading") : t("gamePublicInfo.uploadGameBanner")}
                            <span id="game-public-info-banner-spec" className="game-public-info-banner-spec text-[11px] font-normal leading-tight text-muted-foreground">
                                {t("gamePublicInfo.imageSpec", { width: gameImageOutputSize.width, height: gameImageOutputSize.height, minWidth: gameImageMinSourceSize.width, minHeight: gameImageMinSourceSize.height })}
                            </span>
                        </button>
                    </>
                )}
            </div>
            <div id="game-public-info-banner-footer" className="game-public-info-banner-footer flex h-9 items-center justify-center">
                {imageUrl && (
                    <div id="game-public-info-banner-delete-row" className="game-public-info-banner-delete-row flex items-center gap-1">
                        <Button id="game-public-info-banner-delete" type="button" variant="outline" size="sm" className="game-public-info-banner-delete text-destructive" onClick={() => setConfirmOpen(true)} disabled={disabled || busy || locked}>
                            {busy ? <Loader2 id="game-public-info-banner-delete-icon" className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 id="game-public-info-banner-delete-icon" className="mr-2 h-4 w-4"/>}
                            {locked ? t("gamePublicInfo.deleteBannerCountdown", { seconds: lockedSeconds }) : t("common.delete")}
                        </Button>
                        {locked && (
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button id="game-public-info-banner-delete-help" type="button" aria-label={t("gamePublicInfo.deleteBannerLockedHint", { seconds: bannerLockSeconds })} className="game-public-info-banner-delete-help inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground">
                                            <CircleHelp id="game-public-info-banner-delete-help-icon" className="h-3.5 w-3.5"/>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent id="game-public-info-banner-delete-hint" side="top" className="game-public-info-banner-delete-hint max-w-xs text-xs">
                                        {t("gamePublicInfo.deleteBannerLockedHint", { seconds: bannerLockSeconds })}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )}
            </div>
            <AlertDialog open={confirmOpen} onOpenChange={(open) => !deleting && setConfirmOpen(open)}>
                <AlertDialogContent id="game-public-info-banner-delete-confirm">
                    <AlertDialogHeader id="game-public-info-banner-delete-confirm-header">
                        <AlertDialogTitle id="game-public-info-banner-delete-confirm-title">{t("gamePublicInfo.deleteBannerTitle")}</AlertDialogTitle>
                        <AlertDialogDescription id="game-public-info-banner-delete-confirm-description">{t("gamePublicInfo.deleteBannerDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter id="game-public-info-banner-delete-confirm-footer">
                        <AlertDialogCancel id="game-public-info-banner-delete-confirm-cancel" disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            id="game-public-info-banner-delete-confirm-action"
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleting}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmDelete();
                            }}
                        >
                            {deleting && <Loader2 id="game-public-info-banner-delete-confirm-icon" className="mr-2 h-4 w-4 animate-spin"/>}
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
