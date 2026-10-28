"use client";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type ZoomableImageProps = {
    /** Base id; child elements get `${id}-open`, `${id}-image`, `${id}-lightbox`, ... */
    id: string;
    src: string;
    width: number;
    height: number;
    alt: string;
    caption: string;
    zoomLabel: string;
    /** Extra classes for the figure, e.g. width/centering when the image sits on its own row. */
    className?: string;
    /** next/image sizes hint for the inline (non-zoomed) image. */
    sizes?: string;
};

/** Screenshot in a framed card with a caption; clicking it opens a near full-screen lightbox. */
export function ZoomableImage({ id, src, width, height, alt, caption, zoomLabel, className = "", sizes = "(min-width: 1024px) 50vw, 100vw" }: ZoomableImageProps) {
    return (<figure id={id} className={`${id} min-w-0 ${className}`}>
      <Dialog>
        <DialogTrigger asChild>
          <button id={`${id}-open`} type="button" className={`${id}-open group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border bg-card shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`} aria-label={zoomLabel}>
            <Image id={`${id}-image`} className={`${id}-image h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]`} src={src} width={width} height={height} alt={alt} sizes={sizes}/>
            <span id={`${id}-hint`} className={`${id}-hint absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-medium opacity-90 shadow group-hover:opacity-100`}>
              <ZoomIn className="h-3.5 w-3.5"/>
              {zoomLabel}
            </span>
          </button>
        </DialogTrigger>
        <DialogContent id={`${id}-lightbox`} className={`${id}-lightbox max-h-[95vh] w-auto max-w-[95vw] border-0 bg-transparent p-0 shadow-none sm:rounded-xl`}>
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <DialogDescription className="sr-only">{caption}</DialogDescription>
          <Image id={`${id}-lightbox-image`} className={`${id}-lightbox-image h-auto max-h-[95vh] w-auto max-w-[95vw] rounded-xl object-contain`} src={src} width={width} height={height} alt={alt} sizes="95vw"/>
        </DialogContent>
      </Dialog>
      <figcaption id={`${id}-caption`} className={`${id}-caption mt-3 text-center text-sm text-muted-foreground`}>
        {caption}
      </figcaption>
    </figure>);
}
