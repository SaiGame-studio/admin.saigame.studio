export type DiffLineKind = "same" | "added" | "removed";

export interface DiffLine {
    kind: DiffLineKind;
    text: string;
}

/** Upper bound on oldLines × newLines to keep the LCS table small. */
const MAX_DIFF_CELLS = 4_000_000;

/**
 * Computes a line-based diff from `oldText` to `newText` using an LCS table.
 * Returns null when the inputs are too large to compare line by line.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] | null {
    const a = oldText.replace(/\r\n/g, "\n").split("\n");
    const b = newText.replace(/\r\n/g, "\n").split("\n");
    const n = a.length;
    const m = b.length;
    if (n * m > MAX_DIFF_CELLS)
        return null;
    const width = m + 1;
    const lcs = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            lcs[i * width + j] = a[i] === b[j]
                ? lcs[(i + 1) * width + j + 1] + 1
                : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
        }
    }
    const result: DiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            result.push({ kind: "same", text: a[i] });
            i++;
            j++;
        }
        else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
            result.push({ kind: "removed", text: a[i++] });
        }
        else {
            result.push({ kind: "added", text: b[j++] });
        }
    }
    while (i < n)
        result.push({ kind: "removed", text: a[i++] });
    while (j < m)
        result.push({ kind: "added", text: b[j++] });
    return result;
}
