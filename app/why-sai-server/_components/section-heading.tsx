interface SectionHeadingProps {
    sectionId: string;
    eyebrow: string;
    title: string;
    description?: string;
}

export function toKebabCase(value: string) {
    return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function SectionHeading({ sectionId, title, description }: SectionHeadingProps) {
    return (<div id={`${sectionId}-heading`} className="max-w-3xl">
      <h2 id={`${sectionId}-title`} className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {description && (<p id={`${sectionId}-description`} className="mt-4 text-base text-muted-foreground md:text-lg">{description}</p>)}
    </div>);
}
