## Automation Test Rules

### 1. Compliance Reporting & Verification
- Include a **Compliance Check** footer in every response.
- Explicitly state the Ticket ID source. If not found, ask the user immediately.
- Start or end every response with a brief "✅ Compliance" note or "⚠️ Warning" if rules cannot be met.

---

## UI/Component Pattern Rules

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
