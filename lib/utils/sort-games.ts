import type { Game } from "@/types/game";

/** Returns a new array of games sorted alphabetically by name (case-insensitive, numeric-aware). */
export function sortGamesByName<T extends Pick<Game, "name">>(games: T[]): T[] {
    return [...games].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base", numeric: true }));
}
