/**
 * sCoin currency icon (public/icons/scoin.svg).
 * Sized with Tailwind classes; defaults to the surrounding text height.
 */
export const SCOIN_ICON_SRC = "/icons/scoin.svg";

interface SCoinIconProps {
    id?: string;
    className?: string;
}

export function SCoinIcon({ id, className = "h-[1em] w-[1em]" }: SCoinIconProps) {
    // eslint-disable-next-line @next/next/no-img-element -- static SVG icon; next/image adds no value here
    return (<img id={id} src={SCOIN_ICON_SRC} alt="" aria-hidden="true" draggable={false} className={`inline-block shrink-0 align-[-0.125em] ${className}`}/>);
}
