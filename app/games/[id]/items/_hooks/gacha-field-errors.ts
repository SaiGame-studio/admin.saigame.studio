"use client";

import type { DropGroupFormRow, KeyReqRow, PoolRow } from "./items-page-state-types";

const ERROR_ATTR = "data-gacha-field-error";
const ERROR_CLASSES = ["border-destructive", "ring-2", "ring-destructive", "ring-offset-1"];

/** Element ids below must match the ids rendered by GachaPackSheet. */
const rowKey = (row: { item_definition_id: string }, index: number) => row.item_definition_id || String(index);

export const gachaFieldIds = {
  name: () => "gacha-name",
  codeName: () => "gacha-code-name",
  addPoolRow: () => "gacha-pack-sheet-add-pool",
  poolItem: (row: PoolRow, index: number) => `gacha-pack-sheet-pool-trigger-${rowKey(row, index)}`,
  keyReqItem: (row: KeyReqRow, index: number) => `gacha-pack-sheet-keyreq-trigger-${rowKey(row, index)}`,
  dropGroupItem: (groupIndex: number, rowIndex: number) => `gacha-pack-sheet-secondary-item-${groupIndex}-${rowIndex}`,
  addDropGroupRow: (groupIndex: number) => `gacha-pack-sheet-secondary-row-add-${groupIndex}`,
};

export function clearGachaFieldErrors() {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLElement>(`[${ERROR_ATTR}]`).forEach(unmark);
}

function unmark(el: HTMLElement) {
  el.removeAttribute(ERROR_ATTR);
  el.removeAttribute("aria-invalid");
  el.classList.remove(...ERROR_CLASSES);
}

/** Highlights the given fields, scrolls the first one into view and focuses it. */
export function showGachaFieldErrors(elementIds: string[]) {
  if (typeof document === "undefined") return;
  clearGachaFieldErrors();
  const elements = elementIds
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => !!el);
  if (elements.length === 0) return;

  for (const el of elements) {
    el.setAttribute(ERROR_ATTR, "true");
    el.setAttribute("aria-invalid", "true");
    el.classList.add(...ERROR_CLASSES);
    // Clear the highlight as soon as the user starts fixing this field.
    const clear = () => {
      unmark(el);
      el.removeEventListener("input", clear);
      el.removeEventListener("click", clear);
    };
    el.addEventListener("input", clear);
    el.addEventListener("click", clear);
  }

  const first = elements[0];
  first.scrollIntoView({ behavior: "smooth", block: "center" });
  first.focus({ preventScroll: true });
}

/** Fields to highlight when Drop 1 has no reward item selected. */
export function emptyPoolFieldIds(pool: PoolRow[]) {
  if (pool.length === 0) return [gachaFieldIds.addPoolRow()];
  return pool.map((row, index) => (row.item_definition_id.trim() ? null : gachaFieldIds.poolItem(row, index))).filter((id): id is string => !!id);
}

/** Fields to highlight for additional Drops that have no reward item selected. */
export function invalidDropGroupFieldIds(dropGroups: DropGroupFormRow[]) {
  return dropGroups.flatMap((group, groupIndex) => {
    if (group.pool.some((row) => row.item_definition_id.trim())) return [];
    if (group.pool.length === 0) return [gachaFieldIds.addDropGroupRow(groupIndex)];
    return group.pool.map((_, rowIndex) => gachaFieldIds.dropGroupItem(groupIndex, rowIndex));
  });
}
