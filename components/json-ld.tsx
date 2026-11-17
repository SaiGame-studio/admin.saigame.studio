/** Renders schema.org structured data (lib/structured-data.ts); "<" is escaped so the data cannot close the script tag. */
export function JsonLd({ id, data }: { id: string; data: object }) {
    return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}/>;
}
