# Repository Instructions for Coding Agents

These rules apply to any coding agent working in this repository.

## File Size Limits
- Keep every `.tsx` file at or below 700 lines.
- Keep every other source file at or below 1000 lines.
- If a file is close to or over the limit, refactor and split it before finishing the change.
- Keep root files thin and move heavy UI, logic, hooks, API calls, and types into focused modules.

## UI and DOM Rules
- Every rendered HTML/JSX element must have a unique `id` attribute.
- Use descriptive, kebab-case IDs scoped to the feature.
- Include the record identifier in IDs for repeated list items.
- Render refresh buttons as icon-only controls; do not show visible `Refresh` text in the button label.
- Reuse existing UI patterns before inventing a new one.
- Search the codebase first for a similar component, page section, dialog, table pattern, or badge style.
- Follow the existing convention unless there is a clear reason not to.

## Text and Localization
- Write code, comments, identifiers, and documentation in English only.
- When adding or changing UI text, update translations in the same change.
- Do not ship new single-language UI text.
- Always read and write multilingual text files as UTF-8, and preserve UTF-8 encoding when editing translations to avoid mojibake or corrupted characters.
- For translation files such as `vi.json`, `ja.json`, and other localized resources, always open, edit, and save them explicitly as UTF-8.
- Keep tooltip content positioned above the trigger.
- Use `side="top"` for tooltip content.

## Agent Behavior
- Prefer small, focused changes that fit the existing architecture.
- If a rule conflicts with framework constraints or an existing implementation detail, call it out before proceeding.
- Preserve user changes outside the scope of the task.
