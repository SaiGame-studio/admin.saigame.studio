# Frontend Rules

- Keep `.tsx` files ≤700 lines and other files ≤1000 lines; split before exceeding the limit. Keep UI, logic, hooks, API, and types in focused modules.
- Every JSX/HTML element needs a feature-scoped, kebab-case `id`; list item IDs include the record identifier.
- Refresh buttons are icon-only. Tooltips use `side="top"`.
- Links open in the current tab by default; use `target="_blank"` only when the user explicitly asks for a new tab.
- Search for an existing component or pattern before creating one.
- Use English for code, comments, identifiers, logs, and documentation. When UI text changes, update every translation file as UTF-8.
- Prefer focused changes that preserve the existing architecture. Flag rule conflicts and preserve user changes outside the requested scope.
