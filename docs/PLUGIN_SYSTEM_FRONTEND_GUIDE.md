# Game Plugin System — Frontend Integration Guide

**Ticket:** P1-T14  
**Module:** Game Plugin System  
**Base URL:** `{{api_url}}` (usually `http://localhost:8081`)

---

## Table of Contents

1. [Overview & Concepts](#1-overview--concepts)
2. [Standard Plugin Catalog](#2-standard-plugin-catalog)
3. [Studio Activation](#3-studio-activation)
4. [Game Plugin Subscriptions](#4-game-plugin-subscriptions)
5. [Admin — Custom Plugins](#5-admin--custom-plugins)
6. [Admin — Grant Management](#6-admin--grant-management)
7. [Data Types Reference](#7-data-types-reference)
8. [Error Reference](#8-error-reference)
9. [Environment Variables (Postman)](#9-environment-variables-postman)
10. [Recommended UI Flows](#10-recommended-ui-flows)

---

## 1. Overview & Concepts

### Plugin Types

| Type | Description | Who Creates | Cost |
|------|-------------|-------------|------|
| `standard` | Pre-seeded catalog plugins (common → legendary) | System | Coins/month per stack |
| `custom` | Admin-defined bundles granted to specific games | Super Admin | Free (admin action) |

### Standard Plugin Catalog (Seeded)

| Plugin ID | Display Name | CCU | Profiles | Items | Shops | Cost/Stack | Max Stacks |
|-----------|-------------|-----|----------|-------|-------|------------|------------|
| `common` | Common | 10 | 1,000 | 100 | 1 | 0 coins | auto-granted |
| `uncommon` | Uncommon | 50 | 5,000 | 500 | 5 | 50 coins | 3 |
| `rare` | Rare | 200 | 20,000 | 2,000 | 10 | 150 coins | 3 |
| `epic` | Epic | 1,000 | 100,000 | 10,000 | 25 | 400 coins | 2 |
| `legendary` | Legendary | 5,000 | 500,000 | 50,000 | 50 | 1,000 coins | 1 |

> `common` is **automatically granted** on game creation and cannot be subscribed manually.
> Use `GET /api/v1/plugins` to fetch the live catalog (costs/caps may be updated by admins).

### Effective Limits

Effective limits = **sum of (plugin.grant × stack_count)** across all active subscriptions.

Example: `rare` × 2 stacks + `epic` × 1 stack = 200×2 + 1000×1 = **1400 concurrent users**.

### Studio Activation

Before a studio can subscribe to plugins, it must be **activated** (one-time).  
Cost: **1 coin** from the studio owner's wallet.  
After activation, `studio.activated_at` is set to a timestamp.

---

## 2. Standard Plugin Catalog

### `GET /api/v1/plugins`

**Public — no auth required.**

Returns all active subscribable standard plugins.

```http
GET /api/v1/plugins
```

**Response `200 OK`:**

```json
{
  "plugins": [
    {
      "id": "uncommon",
      "plugin_type": "standard",
      "display_name": "Uncommon",
      "description": "...",
      "is_active": true,
      "ccu_grant": 50,
      "profiles_grant": 5000,
      "items_grant": 500,
      "shops_grant": 5,
      "cost_coins": 50,
      "max_stacks": 3,
      "sort_order": 2,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Notes for UI:**
- Filter out `max_stacks == 0` (that's `common` — not purchasable in the catalog UI)
- Display `cost_coins` as a monthly price
- `max_stacks` is the hard cap — show remaining stacks available for a game
- Sort by `sort_order` ascending

---

## 3. Studio Activation

### `POST /api/v1/studios/{studioId}/activate`

**Auth required** — JWT Bearer. Caller must be studio owner.

No request body. Charges **1 coin** from the owner's wallet.

```http
POST /api/v1/studios/{studioId}/activate
Authorization: Bearer <token>
```

**Response `200 OK`:**

```json
{
  "id": "uuid",
  "name": "My Studio",
  "owner_id": "uuid",
  "is_active": true,
  "activated_at": "2026-02-22T10:00:00Z",
  "limits": { "max_concurrent_users": 0, ... },
  "usage": { ... },
  "created_at": 1740218400,
  "updated_at": 1740218400
}
```

**UI Notes:**
- Show activation status: check `studio.activated_at != null`
- Show activation button only when `!studio.activated_at`
- Display current coin balance before showing activation CTA
- After success, update `studio.activated_at` in local state

**Error Mapping:**

| HTTP Status | Condition | UI Message |
|-------------|-----------|------------|
| 402 | Insufficient coins | "You need at least 1 coin to activate your studio. Top up your balance first." |
| 403 | Not the studio owner | "Only the studio owner can activate this studio." |
| 404 | Studio not found | "Studio not found." |
| 409 | Already activated | "This studio is already activated." |

---

## 4. Game Plugin Subscriptions

### `GET /api/v1/games/{gameId}/plugins`

**Auth required** — JWT Bearer.

Returns active subscriptions and computed effective resource limits for the game.

```http
GET /api/v1/games/{gameId}/plugins
Authorization: Bearer <token>
```

**Response `200 OK`:**

```json
{
  "subscriptions": [
    {
      "subscription": {
        "id": "uuid",
        "game_id": "uuid",
        "plugin_id": "common",
        "activated_by": "uuid",
        "stack_count": 1,
        "coins_per_month": 0,
        "activated_at": "2026-01-15T08:00:00Z",
        "expires_at": null,
        "renewed_at": "2026-01-15T08:00:00Z",
        "is_revoked": false,
        "note": ""
      },
      "plugin": {
        "id": "common",
        "plugin_type": "standard",
        "display_name": "Common",
        "ccu_grant": 10,
        ...
      }
    }
  ],
  "effective_limits": {
    "max_concurrent_users": 10,
    "max_profiles": 1000,
    "max_items": 100,
    "max_shops": 1
  }
}
```

**UI Notes:**
- `effective_limits` is the authoritative combined capacity — display this as the game's current limits
- Show `expires_at` if non-null (renewable subscriptions)
- `is_revoked: true` items should NOT appear (server already filters these out in active view)
- For admin view, use `GET /api/v1/admin/games/{gameId}/plugins` (includes revoked)

---

### `POST /api/v1/games/{gameId}/plugins`

**Auth required** — JWT Bearer. Caller must be the game's studio owner.

Subscribes the game to a standard plugin. Deducts `plugin.cost_coins × stacks` from owner wallet.

```http
POST /api/v1/games/{gameId}/plugins
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "plugin_id": "uncommon",
  "stacks": 1
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `plugin_id` | string | ✅ | Plugin ID (e.g. `"uncommon"`, `"rare"`) |
| `stacks` | int | ❌ | Number of stacks (default: 1, min: 1) |

**Response `201 Created`:**

```json
{
  "id": "uuid",
  "game_id": "uuid",
  "plugin_id": "uncommon",
  "activated_by": "uuid",
  "stack_count": 1,
  "coins_per_month": 50,
  "activated_at": "2026-02-22T10:00:00Z",
  "expires_at": "2026-03-22T10:00:00Z",
  "renewed_at": "2026-02-22T10:00:00Z",
  "is_revoked": false,
  "note": ""
}
```

**Error Mapping:**

| HTTP Status | Condition | UI Message |
|-------------|-----------|------------|
| 400 | `plugin_id` missing | "Plugin selection is required." |
| 400 | max stacks reached for this plugin | "You've reached the maximum stack count for this plugin." |
| 400 | `common` plugin (not subscribable) | "This plugin is auto-granted and cannot be subscribed manually." |
| 402 | Insufficient coins | "Insufficient coin balance. Cost: {X} coins." |
| 403 | Not game owner | "Only the studio owner can subscribe to plugins." |
| 404 | Game not found | "Game not found." |
| 404 | Plugin not found | "Plugin not found." |

---

## 5. Admin — Custom Plugins

> All `/api/v1/admin/plugins/**` endpoints require **Super Admin** role.

### `POST /api/v1/admin/plugins`

Creates a custom plugin definition.

```http
POST /api/v1/admin/plugins
Authorization: Bearer <superadmin_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "display_name": "Enterprise CCU Boost",
  "description": "Grants extra 500 concurrent users.",
  "ccu_grant": 500,
  "profiles_grant": 0,
  "items_grant": 0,
  "shops_grant": 0,
  "duration_days": 30,
  "is_template": true
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `display_name` | string | ❌ | Human-readable name |
| `description` | string | ❌ | Description |
| `ccu_grant` | int | * | Concurrent user slots granted |
| `profiles_grant` | int | * | Profile slots granted |
| `items_grant` | int | * | Item slots granted |
| `shops_grant` | int | * | Shop slots granted |
| `duration_days` | int \| null | ❌ | Expiry in days; `null` = permanent |
| `is_template` | bool | ❌ | `true` = reusable; `false` = one-off |

> *At least one grant field must be > 0 (otherwise returns 400)

**Response `201 Created`:** — returns the full `Plugin` object (see [Data Types](#7-data-types-reference))

---

### `GET /api/v1/admin/plugins`

Lists all custom plugins.

**Response `200 OK`:**
```json
{ "plugins": [ /* Plugin[] */ ] }
```

---

### `GET /api/v1/admin/plugins/{pluginId}`

Gets a specific custom plugin by UUID.

**Response `200 OK`:** — Plugin object  
**Response `404`:** plugin not found

---

### `PUT /api/v1/admin/plugins/{pluginId}`

Partial update (PATCH semantics). Only send fields to change.

```json
{
  "display_name": "Enterprise CCU Boost v2",
  "ccu_grant": 750
}
```

| Field | Type | Notes |
|-------|------|-------|
| `display_name` | *string | omit to keep current |
| `description` | *string | omit to keep current |
| `ccu_grant` | *int | omit to keep current |
| `profiles_grant` | *int | omit to keep current |
| `items_grant` | *int | omit to keep current |
| `shops_grant` | *int | omit to keep current |
| `duration_days` | *int | omit to keep current |

**Response `200 OK`:** — updated Plugin object

---

### `DELETE /api/v1/admin/plugins/{pluginId}`

Deletes a custom plugin definition.

> ⚠️ **Warning:** Revoke all active grants before deleting, or active subscriptions may be cascade-deleted.

**Response `200 OK`:** `{ "status": "deleted" }`

---

## 6. Admin — Grant Management

> All `/api/v1/admin/games/{gameId}/plugins/**` require **Super Admin** role.

### `POST /api/v1/admin/games/{gameId}/plugins`

Grants a custom plugin to a game (no coin charge).

```http
POST /api/v1/admin/games/{gameId}/plugins
Authorization: Bearer <superadmin_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "plugin_id": "uuid-of-custom-plugin",
  "note": "Granted as part of enterprise deal #2024-ENT-042"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `plugin_id` | string (UUID) | ✅ | Must be a `custom` type plugin UUID |
| `note` | string | ❌ | Audit trail note |

**Response `201 Created`:** — `GamePluginSubscription` object (see [Data Types](#7-data-types-reference))

**Error Mapping:**

| HTTP Status | Condition |
|-------------|-----------|
| 400 | `plugin_id` missing or empty |
| 400 | Plugin is not a custom plugin (don't use this for standard plugins) |
| 404 | Plugin UUID not found |

---

### `GET /api/v1/admin/games/{gameId}/plugins`

Lists ALL grants for a game, including revoked ones.

**Response `200 OK`:**
```json
{ "grants": [ /* GamePluginSubscription[] */ ] }
```

> Note: The non-admin `GET /api/v1/games/{gameId}/plugins` returns active-only and includes the plugin definition and effective limits. Use that for the player/studio-facing UI.

---

### `DELETE /api/v1/admin/games/{gameId}/plugins/{grantId}`

Soft-revokes a custom plugin grant.

> `grantId` is the `id` field from the `GamePluginSubscription` row returned when granting.

**Response `200 OK`:** `{ "status": "revoked" }`

**Error Mapping:**

| HTTP Status | Condition |
|-------------|-----------|
| 404 | Grant ID not found |
| 409 | Grant already revoked |

---

## 7. Data Types Reference

### `Plugin`

```typescript
interface Plugin {
  id: string;                  // "common" | "uncommon" | ... | UUID (custom)
  plugin_type: "standard" | "custom";
  display_name: string;
  description: string;
  is_active: boolean;
  ccu_grant: number;           // concurrent users per stack
  profiles_grant: number;
  items_grant: number;
  shops_grant: number;
  cost_coins: number;          // monthly cost per stack (0 for custom)
  max_stacks: number;          // max purchasable stacks (0 = auto-granted/not subscribable)
  sort_order: number;
  duration_days?: number;      // custom only; null = permanent
  is_template?: boolean;       // custom only
  created_by?: string;         // custom only — admin UUID
  created_at: string;          // ISO 8601
  updated_at: string;
}
```

### `GamePluginSubscription`

```typescript
interface GamePluginSubscription {
  id: string;                  // UUID — use as grant_id for revoke
  game_id: string;             // UUID
  plugin_id: string;           // "uncommon" | UUID
  activated_by: string;        // UUID of who activated
  stack_count: number;         // always 1 for custom grants
  coins_per_month: number;     // 0 for custom grants
  activated_at: string;        // ISO 8601
  expires_at?: string;         // null for permanent
  renewed_at: string;          // ISO 8601
  is_revoked: boolean;
  revoked_at?: string;         // null if not revoked
  revoked_by?: string;         // null if not revoked
  note: string;                // admin note (custom grants only)
}
```

### `GamePluginsResult` (from `GET /api/v1/games/{gameId}/plugins`)

```typescript
interface GamePluginsResult {
  subscriptions: Array<{
    subscription: GamePluginSubscription;
    plugin: Plugin;
  }>;
  effective_limits: {
    max_concurrent_users: number;
    max_profiles: number;
    max_items: number;
    max_shops: number;
  };
}
```

### `Studio` (includes `activated_at` from T14)

```typescript
interface Studio {
  id: string;
  name: string;
  owner_id: string;
  description?: string;
  is_active: boolean;
  activated_at?: string;       // null = not activated; non-null = activated
  limits: Record<string, number>;
  usage: Record<string, number>;
  created_at: number;          // Unix timestamp
  updated_at: number;
}
```

---

## 8. Error Reference

All errors follow the standard error envelope:

```json
{
  "error": "human readable message",
  "detail": "technical detail (may be empty)"
}
```

| HTTP | `error` string | When |
|------|----------------|------|
| 400 | `"plugin_id is required"` | Subscribe/Grant with missing plugin_id |
| 400 | `"max stacks reached"` | Subscribing beyond a plugin's max_stacks |
| 400 | `"plugin cannot be subscribed to"` | Trying to subscribe to `common` or a custom plugin |
| 400 | `"plugin is not a custom plugin"` | Trying to grant a standard plugin via admin grant endpoint |
| 400 | `"plugin must grant at least one resource"` | Creating custom plugin with all grants = 0 |
| 400 | `"invalid game_id"` | Malformed UUID in path |
| 401 | `"unauthorized"` | Missing or invalid JWT |
| 402 | `"insufficient coin balance"` | Subscribe/Activate with not enough coins |
| 403 | `"not the game owner"` | Subscribe called by non-owner |
| 403 | `"not the studio owner"` | Activate called by non-owner |
| 404 | `"plugin not found"` | Plugin ID doesn't exist |
| 404 | `"game not found"` | Game UUID doesn't exist |
| 404 | `"studio not found"` | Studio UUID doesn't exist |
| 404 | `"grant not found"` | Grant UUID doesn't exist |
| 409 | `"studio already activated"` | Activating an already-activated studio |
| 409 | `"grant already revoked"` | Revoking a grant that's already revoked |
| 500 | `"..."` | Unexpected server error |

---

## 9. Environment Variables (Postman)

Add these to your Postman environment in addition to the existing ones:

| Variable | Set By | Used In |
|----------|--------|---------|
| `plugin_id` | Auto-saved by "List All Standard Plugins" | Subscribe to Plugin body |
| `custom_plugin_id` | Auto-saved by "Create Custom Plugin" | Get/Update/Delete Plugin, Grant to Game |
| `grant_id` | Auto-saved by "Grant Plugin to Game" | Revoke Grant path |
| `subscription_id` | Auto-saved by "Subscribe to Plugin" | Reference only |

Existing variables reused:
- `access_token` — all authenticated endpoints
- `studio_id` — Activate Studio
- `game_id` — all game plugin endpoints

---

## 10. Recommended UI Flows

### Flow 1: New Studio Setup

```
1. User registers + logs in
2. User creates studio → studio.activated_at = null
3. UI shows "Activate Studio" CTA with coin cost (1 coin)
4. User tops up coins if needed (Coin System module)
5. User clicks Activate → POST /api/v1/studios/{studioId}/activate
6. On success: studio.activated_at is now set → show "Active" badge
```

### Flow 2: Plugin Subscription (Studio Dashboard)

```
1. Fetch plugin catalog → GET /api/v1/plugins
   - Display as pricing table (sort by sort_order)
   - Show cost_coins/month and resource grants per stack
   - Hide "common" (max_stacks=0)

2. Fetch current game plugins → GET /api/v1/games/{gameId}/plugins
   - Display effective_limits as current game capacity
   - Show existing subscriptions with stack counts and expiry

3. User selects plugin + stacks → POST /api/v1/games/{gameId}/plugins
   - Pre-validate: check user has enough coins
   - On 201: refresh game plugins to update effective_limits
   - On 402: prompt to top up coins
   - On 400 (max stacks): disable the add button when at cap
```

### Flow 3: Admin Grant Management

```
1. Admin creates custom plugin → POST /api/v1/admin/plugins
   - Set grants, optional duration_days and note
   
2. Admin views game → GET /api/v1/admin/games/{gameId}/plugins
   - Shows all grants (active + revoked)
   - Active: is_revoked=false
   - Revoked: is_revoked=true (greyed out in UI)

3. Admin grants plugin to game → POST /api/v1/admin/games/{gameId}/plugins
   - Requires custom_plugin_id (UUID) and optional note
   - Game's effective_limits update immediately

4. Admin revokes grant → DELETE /api/v1/admin/games/{gameId}/plugins/{grantId}
   - Show confirmation modal (this removes capacity immediately)
```

### Checking if a Studio is Activated (Frontend Logic)

```typescript
function isStudioActivated(studio: Studio): boolean {
  return studio.activated_at != null && studio.activated_at !== '';
}

// In component:
const canSubscribeToPlugins = isStudioActivated(studio);
// Show "Activate Studio" button if !canSubscribeToPlugins
```

### Computing Plugin Stack Price

```typescript
function getSubscriptionCost(plugin: Plugin, stacks: number): number {
  return plugin.cost_coins * stacks;
}

// Check if user can afford
function canAfford(userBalance: number, plugin: Plugin, stacks: number): boolean {
  return userBalance >= getSubscriptionCost(plugin, stacks);
}
```

### Remaining Stacks for a Game

```typescript
function getRemainingStacks(
  plugin: Plugin,
  subscriptions: GamePluginsResult['subscriptions']
): number {
  const existing = subscriptions.find(s => s.plugin.id === plugin.id);
  const currentStacks = existing?.subscription.stack_count ?? 0;
  return plugin.max_stacks - currentStacks;
}
```
