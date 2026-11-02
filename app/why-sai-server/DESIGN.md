# Why Sai Server

Scope: `/why-sai-server` only. Existing shared navigation and theme provider remain the source of application state.

## Direction contract

THESIS: A development manual makes connected backend services legible, with an Inspector-led cobalt opening and open feature rows.

OWN-WORLD: Cobalt fields, inherited light/dark reading surfaces, Be Vietnam Pro headings, 12–16px corners on the hero and purposeful content regions; no repeated feature cards or eyebrow labels.

STORY: Understand the prefab integration, inspect available services, evaluate sponsorship, explore Sai Play, then contact the team.

FIRST VIEWPORT: Large localized heading and actions in the cobalt hero, with the SaiServer Inspector and all existing services including 2FA. Product screenshots remain real repository assets. The existing application sidebar stays untouched.

FORM: Game development foldout manual, candidate 5, seed:edccf3eb0fcd90f6. The user delegated implementation after viewing the three direction mockups and required dark/light synchronization with the main application. The cobalt option was selected for implementation; screenshots are visual references, not factual copy authority.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Theme and layout tokens

Route styles are contained in `why-sai-server.css` and scoped to `#why-sai-server-page`. Light cobalt is HSL 224 78% 38%; dark cobalt is 224 58% 21%. Theme classes `dark`, `dark-blue`, `dark-purple`, `dark-green`, and `midnight` set dark variants. All reading surfaces, text, muted text, borders and secondary controls inherit application CSS tokens. No independent theme state or storage is introduced.

Section spacing: 48–80px. Hero padding: 24–56px. Main width: 1320px on large screens. At narrow widths actions stack, Inspector fields wrap, and services use one column. Sai Play has no card border.
