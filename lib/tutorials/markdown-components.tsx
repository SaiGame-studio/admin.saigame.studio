/** ReactMarkdown element overrides shared by the server and client tutorial renderers. */
import type { Components } from "react-markdown";
import { MarkdownZoomImage } from "@/components/tutorials/MarkdownZoomImage";

export const tutorialMarkdownComponents: Components = {
    // Drop the non-serializable `node` prop before handing the image to the client lightbox.
    img: ({ src, alt, width, height }) => (typeof src === "string" && src ? <MarkdownZoomImage src={src} alt={alt} width={width} height={height}/> : null),
};
