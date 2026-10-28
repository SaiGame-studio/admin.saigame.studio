/**
 * sGem currency icon (public/icons/sgem.svg).
 * Sized with Tailwind classes; defaults to the surrounding text height.
 */
export const SGEM_ICON_SRC = "/icons/sgem.svg";

interface SGemIconProps {
    id?: string;
    className?: string;
}

export function SGemIcon({ id, className = "h-[1em] w-[1em]" }: SGemIconProps) {
    // eslint-disable-next-line @next/next/no-img-element -- static SVG icon; next/image adds no value here
    return (<img id={id} src={SGEM_ICON_SRC} alt="" aria-hidden="true" draggable={false} className={`inline-block shrink-0 align-[-0.125em] ${className}`}/>);
}
