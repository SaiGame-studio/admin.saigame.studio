# Resource Limits — Frontend Integration Guide

**Module:** Resource Limits & Quota Display  
**Related tickets:** P1-T13, P1-T14, P2-T15, P2-T22, P2-T43  
**Base URL:** `{{api_url}}`

---

## Table of Contents

1. [Overview & Core Concepts](#1-overview--core-concepts)
2. [Dashboard Limit Widgets](#2-dashboard-limit-widgets)
3. [API Data Sources](#3-api-data-sources)
4. [Limit Keys Reference](#4-limit-keys-reference)
5. [Plugin Tier Grant Tables](#5-plugin-tier-grant-tables)
6. [Subscription Lifecycle & "After Expiry"](#6-subscription-lifecycle--after-expiry)
7. [Error Handling](#7-error-handling)
8. [UI Patterns & Recommendations](#8-ui-patterns--recommendations)

---

## 1. Overview & Core Concepts

### How Limits Work

Each **Game** has a `limits` JSONB object that stores the resolved maximum for every resource key. The system applies a two-layer resolution:

```
games.limits[key]   →  if set (Super Admin override or plugin-computed)
    ↓ else
SystemGameLimits[key]  →  hard-coded Go default
```

Limits are **recomputed automatically** every time a studio subscribes to or unsubscribes from a plugin. Super Admins can also set manual overrides.

### Three Limit Scopes

| Scope | Entity | Keys |
|-------|--------|------|
| **User** | `users` | `max_studios` |
| **Studio** | `studios` | `max_games`, `max_total_members`, `max_teams` |
| **Game** | `games` | `max_concurrent_users`, `max_player_profiles`, `max_items`, `max_shops`, `max_quests`, `max_node_definitions`, `max_event_types` |

### Effective vs Pending Limits

The `GET /api/v1/games/{gameId}/plugins` response includes **two limit maps**:

| Field | Meaning |
|-------|---------|
| `effective_limits` | **Current** capacity — sum of all active subscriptions (including those in cancellation grace period) |
| `pending_limits` | **Future** capacity — what the limits will be after all pending cancellations fully expire |

> If no subscriptions are in grace period, `effective_limits == pending_limits`.

This is the source for the "**X → Y after expiry**" display pattern in the dashboard.

---

## 2. Dashboard Limit Widgets

The dashboard shows usage widgets for every metered game resource. Each widget displays:

```
[Icon]  RESOURCE NAME
current / effective_limit   effective_limit → pending_limit after expiry
[progress bar]
```

### Widget Mapping

| Widget Label | Backend Key | Source |
|---|---|---|
| **CONCURRENT USERS (CCU)** | `max_concurrent_users` | Redis counter (live) |
| **PLAYER PROFILES** | `max_player_profiles` | `games.usage["player_profiles"]` |
| **ITEMS** | `max_items` | `games.usage["items"]` |
| **SHOPS** | `max_shops` | `games.usage["shops"]` |
| **QUESTS** | `max_quests` | `games.usage["quests"]` |
| **JOURNEY NODE** | `max_node_definitions` | `games.usage["node_definitions"]` |

### "After Expiry" Display Logic

```
current_limit  = effective_limits["max_*"]
pending_limit  = pending_limits["max_*"]

if pending_limit < current_limit:
    show: "{current_limit} → {pending_limit} after expiry"
else:
    show: "{current_limit}"  // no downgrade pending
```

**Examples from the screenshot:**

| Widget | Current | After Expiry | Interpretation |
|--------|---------|-------------|----------------|
| CCU | 4,000 | 4,000 | No pending cancellation — stable |
| SHOPS | 104 | 102 | Cancelled subscription worth 2 shop slots will expire soon |
| PLAYER PROFILES | 21,000 | 20,000 | Cancelled plugin worth 1,000 profiles will expire |
| QUESTS | 360 | 330 | Cancelled subscription worth 30 quest slots will expire |
| ITEMS | 4,000 | 4,000 | Stable |
| JOURNEY NODE | 200 | 200 | Stable |

---

## 3. API Data Sources

### 3.1 Game Limits + Usage

```http
GET /api/v1/studios/{studioId}/games/{gameId}/limits
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{
  "game_id": "uuid",
  "studio_id": "uuid",
  "limits": {
    "max_concurrent_users": 4000,
    "max_player_profiles": 21000,
    "max_items": 4000,
    "max_shops": 104,
    "max_quests": 360,
    "max_node_definitions": 200,
    "max_event_types": 500
  },
  "current_usage": {
    "player_profiles": 4,
    "concurrent_users": 2,
    "items": 25,
    "shops": 2,
    "node_definitions": 0,
    "event_types": 0
  }
}
```

> `concurrent_users` in `current_usage` comes from a **live Redis counter** — it may differ slightly from the number shown in the CCU middleware (use this as the display value).

---

### 3.2 Plugin Subscriptions + Pending Limits

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
        "plugin_id": "rare",
        "stack_count": 1,
        "coins_per_month": 7000,
        "activated_at": "2026-02-01T00:00:00Z",
        "expires_at": "2026-03-01T00:00:00Z",
        "renewed_at": "2026-02-01T00:00:00Z",
        "is_revoked": false,
        "cancelled_at": "2026-02-15T00:00:00Z"
      },
      "plugin": {
        "id": "rare",
        "display_name": "Rare",
        "ccu_grant": 4000,
        "profiles_grant": 20000,
        "items_grant": 4000,
        "shops_grant": 50,
        "quests_grant": 300,
        "node_defs_grant": 50,
        "cost_coins": 7000,
        "max_stacks": 3
      },
      "is_cancelled": true,
      "status": "cancelled"
    }
  ],
  "effective_limits": {
    "max_concurrent_users": 4010,
    "max_player_profiles": 21050,
    "max_items": 4100,
    "max_shops": 104,
    "max_quests": 360,
    "max_node_definitions": 200
  },
  "pending_limits": {
    "max_concurrent_users": 4010,
    "max_player_profiles": 21050,
    "max_items": 4100,
    "max_shops": 102,
    "max_quests": 330,
    "max_node_definitions": 200
  }
}
```

**Key fields for the dashboard:**

| Field | Usage |
|-------|-------|
| `effective_limits` | Display as the **current max** for each resource |
| `pending_limits` | Display as "after expiry" if lower than `effective_limits` |
| `subscription.is_cancelled` | Show "cancelling on {expires_at}" badge on that subscription row |
| `subscription.status` | `"active"` / `"cancelled"` / `"expired"` / `"revoked"` |
| `subscription.expires_at` | Show renewal date or countdown timer |

---

### 3.3 Studio Limits

```http
GET /api/v1/studios/{studioId}/limits
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{
  "studio_id": "uuid",
  "limits": {
    "max_games": 10,
    "max_total_members": 50,
    "max_teams": 5
  },
  "overrides": {
    "max_games": 10
  },
  "current_usage": {
    "games": 3,
    "total_members": 12
  }
}
```

> `overrides` contains only the keys explicitly set by a **Super Admin**. If a key is absent from `overrides`, the value in `limits` is the system default.

---

## 4. Limit Keys Reference

### Game Limits

| Key | Display Name | Type | Default | Enforcement |
|-----|-------------|------|---------|-------------|
| `max_concurrent_users` | Concurrent Users (CCU) | Plugin-driven | 20 | HTTP 503 at middleware when full |
| `max_player_profiles` | Player Profiles | Plugin-driven | 100 | HTTP 429 before profile creation |
| `max_items` | Items | Plugin-driven | 100 | HTTP 429 before item creation |
| `max_shops` | Shops | Plugin-driven | 2 | HTTP 429 before shop creation |
| `max_quests` | Quest Definitions | Plugin-driven | 30 | HTTP 429 before quest creation |
| `max_node_definitions` | Journey Node Definitions | Plugin-driven | 100 | HTTP 429 before node def creation |
| `max_event_types` | Event Types | System cap (flat) | 500 | HTTP 429 |

> `max_event_types` is a flat system-wide cap, **not** affected by plugin subscriptions.

---

### Studio Limits

| Key | Display Name | Default | Enforcement |
|-----|-------------|---------|-------------|
| `max_games` | Games per Studio | 2 | HTTP 403 before game creation |
| `max_total_members` | Studio Members | 5 | HTTP 403 before member invitation |
| `max_teams` | Teams | 1 | HTTP 403 before team creation |

---

### User Limits

| Key | Display Name | Default | Enforcement |
|-----|-------------|---------|-------------|
| `max_studios` | Studios per User | ∞ (no default cap) | HTTP 403 when Super Admin sets a cap |

---

## 5. Plugin Tier Grant Tables

Limits are computed as: `SUM(plugin.grant × stack_count)` across all active subscriptions.

### Core Resources (CCU, Profiles, Items, Shops)

| Plugin | CCU / stack | Profiles / stack | Items / stack | Shops / stack | Cost / stack / month |
|--------|:-----------:|:----------------:|:-------------:|:-------------:|:--------------------:|
| `common` | 10 | 50 | 50 | 1 | 0 coins (auto) |
| `uncommon` | 60 | 300 | 100 | 2 | 100 coins |
| `rare` | 4,000 | 20,000 | 4,000 | 50 | 7,000 coins |
| `epic` | 10,000 | 200,000 | 10,000 | 1,000 | 15,000 coins |
| `legendary` | 100,000 | 5,000,000 | 100,000 | 70,000 | 150,000 coins |

**Max stacks per plugin:**

| Plugin | Max stacks | Max CCU (all stacks) |
|--------|:----------:|:--------------------:|
| `common` | auto (1) | 10 |
| `uncommon` | ×7 | 430 |
| `rare` | ×3 | 12,010 |
| `epic` | ×3 | 30,010 |
| `legendary` | ×3 | 300,010 |

---

### Quest / Daily Quest / Battle Pass

| Plugin | Quests / stack | Daily Quest Sets / stack | Battle Pass Sets / stack |
|--------|:--------------:|:------------------------:|:------------------------:|
| `common` | 30 | 1 | 0 *(n/a)* |
| `uncommon` | 30 | 2 | 0 *(n/a)* |
| `rare` | 300 | 20 | 30 |
| `epic` | 3,000 | 200 | 300 |
| `legendary` | 30,000 | 2,000 | 3,000 |

> Battle Pass requires **rare** tier or above.

---

### Journey Nodes

| Plugin | Journeys / stack | Node Defs / stack | Max nodes / journey\* |
|--------|:----------------:|:-----------------:|:---------------------:|
| `common` | 1 | 10 | 7 |
| `uncommon` | 3 | 15 | 15 |
| `rare` | 10 | 50 | 30 |
| `epic` | 50 | 200 | 100 |
| `legendary` | 200 | 1,000 | 500 |

> \* `max_nodes_per_journey` uses **MAX** resolution (not SUM) — highest active tier wins.

---

## 6. Subscription Lifecycle & "After Expiry"

### Subscription States

| Status | `cancelled_at` | `expires_at` | `is_revoked` | Providing capacity? |
|--------|:--------------:|:------------:|:------------:|:-------------------:|
| `active` | null | future date | false | ✅ Yes — will auto-renew |
| `cancelled` | set | future date | false | ✅ Yes — grace period until `expires_at` |
| `expired` | null or set | past date | false | ❌ No — pending cleanup |
| `revoked` | any | any | true | ❌ No — permanently removed |

### Auto-Renewal Flow

```
expires_at approaches
    ↓
Plugin Expiry Job (runs every hour)
    ↓
subscription.cancelled_at == null?
    ├─ YES → auto-renew: deduct coins → extend expires_at +30 days
    └─ NO  → cancelled: revoke → limit recomputed (drops)
```

### "After Expiry" Widget Display

Use `pending_limits` from `GET /api/v1/games/{gameId}/plugins`:

```typescript
function renderLimitWidget(resource: string) {
  const current   = effectiveLimits[resource];
  const pending   = pendingLimits[resource];
  const usage     = currentUsage[resource];

  const afterExpiry = pending < current
    ? `${fmt(current)} → ${fmt(pending)} after expiry`
    : `${fmt(current)}`;

  return {
    usage:       fmt(usage),
    limit:       fmt(current),
    afterExpiry,
    pct:         Math.floor((usage / current) * 100),
    warning:     pct >= 80,
    critical:    usage >= current,
  };
}
```

---

## 7. Error Handling

When a limit is reached, the API returns an error with structured details:

```json
{
  "error": {
    "code": "GAME_PROFILE_LIMIT_REACHED",
    "message": "Game has reached the maximum number of player profiles (100/100)",
    "details": {
      "current": 100,
      "max": 100,
      "resource": "player_profiles",
      "entity_type": "game",
      "entity_id": "game-uuid"
    }
  }
}
```

### Error Code → HTTP Status → User Message Mapping

| Error Code | HTTP Status | Suggested UI Message |
|------------|-------------|----------------------|
| `STUDIO_GAME_LIMIT_REACHED` | 403 | "You've reached the maximum number of games for this studio. Upgrade your plan to add more." |
| `STUDIO_MEMBER_LIMIT_REACHED` | 403 | "Studio member limit reached ({current}/{max}). Upgrade to invite more members." |
| `GAME_PROFILE_LIMIT_REACHED` | 403 | "This game has reached its player profile limit ({current}/{max}). Upgrade your plugin tier." |
| `GAME_CONCURRENT_USER_LIMIT_REACHED` | 503 | "Server is full. Please try again shortly." |
| `GAME_ITEM_LIMIT_REACHED` | 403 | "Item limit reached ({current}/{max}). Subscribe to a higher plugin tier." |
| `GAME_SHOP_LIMIT_REACHED` | 403 | "Shop limit reached ({current}/{max})." |
| `quest_limit_exceeded` | 429 | "Quest limit reached ({current}/{max}). Upgrade to rare tier or above." |

> The `details.current` and `details.max` fields are always present — use them to build the display message rather than hardcoding numbers.

---

## 8. UI Patterns & Recommendations

### Recommended Data Fetch Strategy

For the **limits dashboard page**, fetch both endpoints in parallel:

```
parallel:
  GET /api/v1/studios/{studioId}/games/{gameId}/limits   → usage + current limits
  GET /api/v1/games/{gameId}/plugins                     → effective_limits + pending_limits
```

Use `effective_limits` from the plugins endpoint as the authoritative max (it includes all active subscriptions). Use `current_usage` from the limits endpoint for the usage counter.

### Progress Bar Color Thresholds

| Usage % | Color | Meaning |
|---------|-------|---------|
| 0–79% | Green | Healthy |
| 80–99% | Orange / Yellow | Warning — approaching limit |
| 100% | Red | At limit — new resources blocked |

### CCU Widget Special Behavior

CCU is enforced in **real time** via the HTTP middleware (not just at creation time). Display it differently:

- Show as **"live"** — refresh every 30–60 seconds
- When `usage == limit`: show a "Server full" badge
- CCU sessions expire automatically after **30 minutes** of inactivity (configurable via `CCU_SESSION_TTL_MINUTES`)
- Opening multiple browser tabs as the same user counts as **one CCU slot** (session key is per `userID:gameID`)

### "After Expiry" Warning Banner

When `pending_limits[key] < effective_limits[key]`, show an inline warning on the relevant widget:

```
⚠️  {N} shop slots will be removed on {expires_at}  [Renew now]
```

Check `subscriptions` array for entries where `status == "cancelled"` to find the exact `expires_at` date to display.

### Super Admin Override Indicator

When a limit value comes from an admin override (key is present in `overrides` from the studio/game limits endpoint), show a badge:

```
max_games: 50  [admin override]
```

This helps studio owners understand which limits are negotiated vs plan-based.
