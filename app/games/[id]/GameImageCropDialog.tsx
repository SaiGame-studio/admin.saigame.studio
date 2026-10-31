"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { Crop, Loader2, ZoomIn } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

/** Size of the cropped image that is uploaded (3:4, as Sai Play renders game cards). */
export const gameImageOutputSize = { width: 900, height: 1200 };
/** Below this source area the cropped image is upscaled and may look blurry. */
export const gameImageMinSourceSize = { width: 600, height: 800 };

// On-screen crop frame, 3:4.
const frame = { width: 270, height: 360 };
const maxZoom = 4;
const keyboardStep = 10;

type Point = { x: number; y: number };
type ImageSize = { width: number; height: number };

function clampOffset(offset: Point, image: ImageSize, scale: number): Point {
    const minX = frame.width - image.width * scale;
    const minY = frame.height - image.height * scale;
    return {
        x: Math.min(0, Math.max(minX, offset.x)),
        y: Math.min(0, Math.max(minY, offset.y)),
    };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, 0.9));
}

/** Draws the selected source area at the output size; WebP when the browser can encode it, otherwise JPEG. */
async function renderCrop(image: HTMLImageElement, source: { x: number; y: number; width: number; height: number }): Promise<File> {
    const canvas = document.createElement("canvas");
    canvas.width = gameImageOutputSize.width;
    canvas.height = gameImageOutputSize.height;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas 2D context is not available");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
    const webp = await canvasToBlob(canvas, "image/webp");
    if (webp?.type === "image/webp") {
        return new File([webp], "game-image.webp", { type: "image/webp" });
    }
    // JPEG has no transparency: paint white under the image.
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const jpeg = await canvasToBlob(canvas, "image/jpeg");
    if (!jpeg) {
        throw new Error("Could not encode the cropped image");
    }
    return new File([jpeg], "game-image.jpg", { type: "image/jpeg" });
}

/**
 * Lets the user pick the 3:4 area of a chosen image. Only the cropped result (gameImageOutputSize) is
 * passed to onConfirm; the original file is never uploaded.
 */
export function GameImageCropDialog({ file, onCancel, onConfirm }: { file: File | null; onCancel: () => void; onConfirm: (cropped: File) => void }) {
    const { t } = useTranslation();
    const imageRef = useRef<HTMLImageElement>(null);
    const dragRef = useRef<{ pointer: Point; offset: Point } | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [imageSize, setImageSize] = useState<ImageSize | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
    const [loadFailed, setLoadFailed] = useState(false);
    const [rendering, setRendering] = useState(false);

    useEffect(() => {
        setImageSize(null);
        setZoom(1);
        setLoadFailed(false);
        if (!file) {
            setSourceUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setSourceUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Scale at zoom 1 makes the image just cover the frame.
    const coverScale = imageSize ? Math.max(frame.width / imageSize.width, frame.height / imageSize.height) : 1;
    const scale = coverScale * zoom;
    const source = imageSize
        ? { x: -offset.x / scale, y: -offset.y / scale, width: frame.width / scale, height: frame.height / scale }
        : null;
    const sourceTooSmall = source !== null && (source.width < gameImageMinSourceSize.width - 0.5 || source.height < gameImageMinSourceSize.height - 0.5);

    const handleLoad = () => {
        const image = imageRef.current;
        if (!image) {
            return;
        }
        const size = { width: image.naturalWidth, height: image.naturalHeight };
        const cover = Math.max(frame.width / size.width, frame.height / size.height);
        setImageSize(size);
        setZoom(1);
        setOffset({ x: (frame.width - size.width * cover) / 2, y: (frame.height - size.height * cover) / 2 });
    };

    const changeZoom = (nextZoom: number) => {
        if (!imageSize) {
            return;
        }
        const clamped = Math.min(maxZoom, Math.max(1, nextZoom));
        const nextScale = coverScale * clamped;
        // Keep the point under the frame centre fixed while zooming.
        const centre = { x: (frame.width / 2 - offset.x) / scale, y: (frame.height / 2 - offset.y) / scale };
        setZoom(clamped);
        setOffset(clampOffset({ x: frame.width / 2 - centre.x * nextScale, y: frame.height / 2 - centre.y * nextScale }, imageSize, nextScale));
    };

    const moveBy = (dx: number, dy: number, from: Point = offset) => {
        if (imageSize) {
            setOffset(clampOffset({ x: from.x + dx, y: from.y + dy }, imageSize, scale));
        }
    };

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointer: { x: event.clientX, y: event.clientY }, offset };
    };
    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (drag) {
            moveBy(event.clientX - drag.pointer.x, event.clientY - drag.pointer.y, drag.offset);
        }
    };
    const handlePointerUp = () => {
        dragRef.current = null;
    };
    const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
        changeZoom(zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
    };
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const moves: Record<string, Point> = {
            ArrowLeft: { x: keyboardStep, y: 0 },
            ArrowRight: { x: -keyboardStep, y: 0 },
            ArrowUp: { x: 0, y: keyboardStep },
            ArrowDown: { x: 0, y: -keyboardStep },
        };
        const move = moves[event.key];
        if (move) {
            event.preventDefault();
            moveBy(move.x, move.y);
        } else if (event.key === "+" || event.key === "=") {
            changeZoom(zoom + 0.1);
        } else if (event.key === "-") {
            changeZoom(zoom - 0.1);
        }
    };

    const confirm = async () => {
        const image = imageRef.current;
        if (!image || !source) {
            return;
        }
        setRendering(true);
        try {
            onConfirm(await renderCrop(image, source));
        } catch (error) {
            console.error("Failed to crop game image:", error);
            setLoadFailed(true);
        } finally {
            setRendering(false);
        }
    };

    return (
        <Dialog open={file !== null} onOpenChange={(open) => !open && !rendering && onCancel()}>
            <DialogContent id="game-image-crop-dialog" className="game-image-crop-dialog sm:max-w-md">
                <DialogHeader id="game-image-crop-header" className="game-image-crop-header">
                    <DialogTitle id="game-image-crop-title" className="game-image-crop-title flex items-center gap-2">
                        <Crop id="game-image-crop-title-icon" className="h-4 w-4"/>
                        {t("gamePublicInfo.cropTitle")}
                    </DialogTitle>
                    <DialogDescription id="game-image-crop-description" className="game-image-crop-description">
                        {t("gamePublicInfo.cropDescription", { width: gameImageOutputSize.width, height: gameImageOutputSize.height })}
                    </DialogDescription>
                </DialogHeader>
                <div id="game-image-crop-body" className="game-image-crop-body flex flex-col items-center gap-4">
                    <div
                        id="game-image-crop-frame"
                        className="game-image-crop-frame relative cursor-grab touch-none select-none overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                        style={{ width: frame.width, height: frame.height }}
                        tabIndex={0}
                        role="application"
                        aria-label={t("gamePublicInfo.cropFrameLabel")}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onWheel={handleWheel}
                        onKeyDown={handleKeyDown}
                    >
                        {sourceUrl && (
                            // eslint-disable-next-line @next/next/no-img-element -- local object URL of the chosen file
                            <img
                                id="game-image-crop-source"
                                ref={imageRef}
                                src={sourceUrl}
                                alt=""
                                draggable={false}
                                className="game-image-crop-source pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
                                style={imageSize
                                    ? { width: imageSize.width * scale, height: imageSize.height * scale, transform: `translate(${offset.x}px, ${offset.y}px)` }
                                    : { visibility: "hidden" }}
                                onLoad={handleLoad}
                                onError={() => setLoadFailed(true)}
                            />
                        )}
                        <div id="game-image-crop-grid" aria-hidden className="game-image-crop-grid pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                            {Array.from({ length: 9 }, (_, index) => (
                                <span id={`game-image-crop-grid-cell-${index}`} key={index} className="game-image-crop-grid-cell border border-white/20"/>
                            ))}
                        </div>
                        {!imageSize && !loadFailed && (
                            <div id="game-image-crop-loading" className="game-image-crop-loading absolute inset-0 flex items-center justify-center">
                                <Loader2 id="game-image-crop-loading-icon" className="h-5 w-5 animate-spin text-muted-foreground"/>
                            </div>
                        )}
                    </div>
                    <div id="game-image-crop-zoom" className="game-image-crop-zoom flex w-full items-center gap-3">
                        <ZoomIn id="game-image-crop-zoom-icon" className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden/>
                        <Slider
                            id="game-image-crop-zoom-slider"
                            className="game-image-crop-zoom-slider"
                            aria-label={t("gamePublicInfo.cropZoom")}
                            min={1}
                            max={maxZoom}
                            step={0.01}
                            value={[zoom]}
                            onValueChange={([value]) => changeZoom(value)}
                            disabled={!imageSize || rendering}
                        />
                    </div>
                    {source && (
                        <p id="game-image-crop-selection" className={`game-image-crop-selection w-full text-xs ${sourceTooSmall ? "text-destructive" : "text-muted-foreground"}`}>
                            {t("gamePublicInfo.cropSelection", { width: Math.round(source.width), height: Math.round(source.height) })}
                            {sourceTooSmall && ` ${t("gamePublicInfo.cropTooSmall", { minWidth: gameImageMinSourceSize.width, minHeight: gameImageMinSourceSize.height })}`}
                        </p>
                    )}
                    {loadFailed && (
                        <p id="game-image-crop-error" className="game-image-crop-error w-full text-xs text-destructive">{t("gamePublicInfo.cropLoadError")}</p>
                    )}
                    <p id="game-image-crop-hint" className="game-image-crop-hint w-full text-xs text-muted-foreground">{t("gamePublicInfo.cropHint")}</p>
                </div>
                <DialogFooter id="game-image-crop-footer" className="game-image-crop-footer gap-2">
                    <Button id="game-image-crop-cancel" type="button" variant="outline" onClick={onCancel} disabled={rendering}>
                        {t("common.cancel")}
                    </Button>
                    <Button id="game-image-crop-confirm" type="button" onClick={confirm} disabled={!imageSize || loadFailed || rendering}>
                        {rendering ? <Loader2 id="game-image-crop-confirm-icon" className="mr-2 h-4 w-4 animate-spin"/> : <Crop id="game-image-crop-confirm-icon" className="mr-2 h-4 w-4"/>}
                        {t("gamePublicInfo.cropConfirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
