## File Size Rules

### 0. Maximum 1000 Lines Per File
No source code file (TypeScript, TSX, JavaScript, JSX, HTML, CSS, etc.) may exceed **1000 lines**.

**Requirements:**
- If a file grows beyond 1000 lines, it **must** be split into smaller, logically cohesive modules before the change is considered complete.
- Split along natural boundaries: separate sub-components into their own files, extract hooks into `hooks/`, extract API calls into `lib/` or `api/` files, extract types into `types/` files, etc.
- The root file should remain the thin orchestrator; heavy logic and UI sections belong in dedicated files.
- When asked to add code to a file that is already close to or over the limit, always refactor first.
- This rule applies to all new and modified files — do not leave a file over 1000 lines after a change.

---

## Element ID Rules

### 0. Mandatory `id` on Every Element
Every HTML/JSX element that is rendered to the DOM **must have a unique `id` attribute**.

**Requirements:**
- Every `<div>`, `<button>`, `<input>`, `<form>`, `<section>`, `<ul>`, `<li>`, `<span>`, `<p>`, `<a>`, and all other rendered elements must include an `id` prop.
- IDs must be descriptive, kebab-case, and scoped to their feature (e.g., `game-list-filter-input`, `conv-panel-send-button`).
- Dynamically rendered list items must include the record identifier in the id (e.g., `conv-item-{conv.ID}`).
- Component wrapper divs must have an id even if they have no other props (e.g., `id="profile-page-root"`).
- Never leave an element without an `id` — this is required for automation testing and accessibility tooling.

---

## Language Rules

### 0. English-Only Code & Comments
All code, comments, variable names, function names, commit messages, and documentation **must be written in English only**.

**Requirements:**
- Never write comments, inline notes, or log messages in Vietnamese or any language other than English.
- Never use non-English characters in identifiers, string literals (except translation files), or file names.
- The **only** exception is translation/i18n resource files (e.g., `locales/vi/*.json`, `messages/vi.json`), where non-English content is expected and required.
- If asked a question in Vietnamese, respond but always produce code and comments in English.

---

## Automation Test Rules

### 1. Compliance Reporting & Verification
- Include a **Compliance Check** footer in every response.
- Explicitly state the Ticket ID source. If not found, ask the user immediately.
- Start or end every response with a brief "✅ Compliance" note or "⚠️ Warning" if rules cannot be met.

---

## UI/Component Pattern Rules

### 3. Mandatory I18n For New UI Text
Whenever adding or changing any UI-facing text (labels, buttons, placeholders, tooltips, headings, empty states, toasts, badges), **always add multi-language translations in the same change**.

**Requirements:**
- Never ship hardcoded UI text in a single language.
- Add translation keys for all supported locales immediately (currently: `en`, `vi`, `ja`).
- Replace raw strings in components/pages with translation lookups.
- Keep wording consistent across locales for the same feature.
- If a translation is temporarily unavailable, use a clearly named translation key and add placeholder values for all locales in the same PR.

### 4. Tooltip Position Must Be Top
All tooltips **must** be positioned above the trigger element to avoid being obscured by the mouse cursor.

**Requirements:**
- Always set `side="top"` on every `<TooltipContent>` component.
- Never use the default (which may render below or to the side).
- Apply to all new and modified tooltips without exception.

---

### 2. Reuse Existing Patterns Before Building New Ones
Before implementing any new UI element or component, **always search the codebase for an existing similar element** and follow its established pattern exactly. Do not invent a new approach if one already exists.

Examples of patterns to look up and reuse:
- **UUID → Definition links**: Find how other pages link from a UUID field to its definition page (e.g., how Quest, Game, Team IDs are rendered as clickable links).
- **Page headers**: Find how other pages organize their header section (title, subtitle, action buttons) and replicate the same structure and component hierarchy.
- **Filters / search bars**: Find how other list pages build their filter UI (which components, hooks, state shape, URL query params) and follow that convention.
- **Collapsible table rows**: Find how other tables implement expandable/collapsible row details and use the same pattern.
- **Dialogs**: Find an existing dialog (create/edit/delete) and mirror its structure, form layout, and submit flow.
- **Status badges**: Find how existing status values are displayed (colors, labels) and extend that component instead of creating a new one.

**Workflow requirement:**
1. Before writing any new component or UI block, run a semantic or grep search for a similar existing element.
2. Read and understand the existing implementation.
3. Implement the new element following the same conventions (component names, prop shapes, layout structure, styling approach).
4. Only deviate if there is a clear, documented reason why the existing pattern is insufficient.
