# Frontend Rules

- Never infer or introduce new product concepts, requirements, terminology, data models, or behavior. Do not describe an unverified concept as if it already exists; state what is verified and ask the user when a decision is required.

- Keep `.tsx` files ≤700 lines and other files ≤1000 lines; split before exceeding the limit. Keep UI, logic, hooks, API, and types in focused modules.
- Every JSX/HTML element needs a feature-scoped, kebab-case `id`; list item IDs include the record identifier.
- Refresh buttons are icon-only. Tooltips use `side="top"`.
- Links open in the current tab by default. Do not add `target="_blank"` or programmatically force a new tab; users may use Ctrl/Cmd-click or their browser context menu when they want a new tab.
- Search for an existing component or pattern before creating one.
- Use English for code, comments, identifiers, logs, and documentation. When UI text changes, update every translation file as UTF-8.
- Prefer focused changes that preserve the existing architecture. Flag rule conflicts and preserve user changes outside the requested scope.
- When building internal links, include only the query parameters required for the destination flow; do not preserve the full current query string unless explicitly requested.
