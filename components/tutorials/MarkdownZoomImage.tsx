"use client";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type MarkdownZoomImageProps = {
    src: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
};

/** Stable, kebab-case id from the image path, so each article image gets its own element ids. */
function imageId(src: string): string {
    const name = src.split("?")[0].split("/").slice(-2).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `tutorial-image-${name || "image"}`;
}

/** A tutorial article image; clicking it opens the image in a near full-screen lightbox. */
export function MarkdownZoomImage({ src, alt = "", width, height }: MarkdownZoomImageProps) {
    const id = imageId(src);
    return (<Dialog>
      <DialogTrigger asChild>
        <button id={`${id}-open`} type="button" className="inline-block max-w-full cursor-zoom-in rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={alt || "Zoom image"}>
          {/* eslint-disable-next-line @next/next/no-img-element -- markdown images have unknown sizes and may be remote */}
          <img id={`${id}-image`} src={src} alt={alt} width={width} height={height} loading="lazy" className="max-w-full h-auto"/>
        </button>
      </DialogTrigger>
      <DialogContent id={`${id}-lightbox`} className="h-[90vh] w-[95vw] max-w-[95vw] border-0 bg-transparent p-0 shadow-none sm:rounded-xl">
        <DialogTitle className="sr-only">{alt || "Image"}</DialogTitle>
        <DialogDescription className="sr-only">{alt}</DialogDescription>
        {/* Fills the lightbox while keeping the aspect ratio, so small screenshots are enlarged too. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
        <img id={`${id}-lightbox-image`} src={src} alt={alt} className="h-full w-full object-contain"/>
      </DialogContent>
    </Dialog>);
}
