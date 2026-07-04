# Agent Rules

## Files
- `.tsx` ≤ 700 lines; others ≤ 1000 lines. Refactor/split before finishing if near limit.
- Keep root files thin; move UI, logic, hooks, API, types into focused modules.

## UI/DOM
- Every HTML/JSX element needs a unique, kebab-case `id` scoped to the feature.
- List items: include record identifier in `id` (e.g. `user-row-{id}`).
- Refresh buttons: icon-only, no "Refresh" text label.
- Search codebase for existing component/pattern before creating new ones.

## Localization
- Code, comments, identifiers, docs: **English only**.
- UI text changes → update all translation files in the same change. No single-language text.
- Translation files (`vi.json`, `ja.json`, etc.): always read/write as **UTF-8**.
- Tooltips: `side="top"`.

## Behavior
- Prefer small, focused changes fitting the existing architecture.
- Call out rule/constraint conflicts before proceeding.
- Preserve user changes outside the task scope.
