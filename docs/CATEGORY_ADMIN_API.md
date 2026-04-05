# Category Management - Super Admin API

**Version**: 1.0  
**Base URL**: `https://api.saigame.studio/api/v1/admin`  
**Authentication**: JWT + `super_admin` role required  
**Content-Type**: `application/json`

---

## Overview

Super Admin API for managing hierarchical content categories. Only authenticated super admin users can access these endpoints.

**Key Features**:
- Create root and child categories
- Update category properties
- Delete categories (children-only check enforced)
- Automatic path generation/updates
- Depth validation (max 4 levels)

---

## Authentication

All endpoints require:

```
Header: Authorization: Bearer <jwt_token>
```

**Error Response if Not Authenticated**:
```json
{
  "error": "unauthorized",
  "message": "Missing or invalid JWT token"
}
```

**Error Response if Not Super Admin**:
```json
{
  "error": "forbidden",
  "message": "Super admin privilege required"
}
```

---

## Data Model - Request/Response

### Category Object

**Request Structure** (for Create/Update):
```typescript
{
  parent_id?: UUID,          // Optional: Parent category ID (null = root)
  name: string,              // Required: Display name (max 100 chars)
  slug: string,              // Required: URL slug (^[a-z0-9]+(-[a-z0-9]+)*$)
  description?: string,      // Optional: Description (max 500 chars)
  sort_order?: integer,      // Optional: Sort order (default 0)
  is_active?: boolean        // Optional: Enable/disable (default true)
}
```

**Response Structure**:
```typescript
{
  id: UUID,                  // Unique identifier
  parent_id: UUID | null,   // Parent category (null for root)
  name: string,              // Display name
  slug: string,              // URL slug
  description: string,       // Description text
  path: string,              // Full hierarchical path (e.g., "tutorial/game-setup")
  depth: integer,            // 0 (root) to 3 (max)
  sort_order: integer,       // Ordering
  is_active: boolean,        // Active/inactive flag
  created_at: timestamp,     // ISO 8601
  updated_at: timestamp,     // ISO 8601
  children: Category[]       // Child categories (only in nested responses)
}
```

---

## API Endpoints

### 1. Create Category

#### `POST /categories`

**Purpose**: Create a new root or child category.

**Request Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|-----------|
| `parent_id` | UUID | No | Must exist if provided; null = root |
| `name` | string | Yes | Max 100 chars, not empty |
| `slug` | string | Yes | ^[a-z0-9]+(-[a-z0-9]+)*$, unique per parent |
| `description` | string | No | Max 500 chars |
| `sort_order` | integer | No | Default 0 |

**Example Request**
```http
POST /api/v1/admin/categories
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Game Setup Guide",
  "slug": "game-setup-guide",
  "description": "Step-by-step guide for setting up your game",
  "sort_order": 1
}
```

**Example Response - 201 Created**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440099",
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Game Setup Guide",
  "slug": "game-setup-guide",
  "description": "Step-by-step guide for setting up your game",
  "path": "tutorial/game-setup-guide",
  "depth": 1,
  "sort_order": 1,
  "is_active": true,
  "created_at": "2026-04-05T10:30:00Z",
  "updated_at": "2026-04-05T10:30:00Z",
  "children": []
}
```

**Example - Create Root Category**
```http
POST /api/v1/admin/categories
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Documentation",
  "slug": "documentation",
  "description": "All documentation and reference materials"
}
```

**Response - 201 Created**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440050",
  "parent_id": null,
  "name": "Documentation",
  "slug": "documentation",
  "description": "All documentation and reference materials",
  "path": "documentation",
  "depth": 0,
  "sort_order": 0,
  "is_active": true,
  "created_at": "2026-04-05T10:35:00Z",
  "updated_at": "2026-04-05T10:35:00Z",
  "children": []
}
```

**Error Responses**

| Status | Error | Message |
|--------|-------|---------|
| 400 | `validation_error` | Slug validation failed: must be lowercase with hyphens |
| 400 | `validation_error` | Name is required |
| 400 | `validation_error` | Parent category not found |
| 409 | `category_slug_exists` | Category slug 'game-setup' already exists under this parent |
| 409 | `category_max_depth` | Category max depth exceeded (max 3 levels) |

**Example Error - Slug Validation**
```json
{
  "error": "validation_error",
  "message": "Slug validation failed: must be lowercase with hyphens"
}
```

**Example Error - Max Depth**
```json
{
  "error": "category_max_depth",
  "message": "Category max depth exceeded (max 3 levels)"
}
```

---

### 2. Update Category

#### `PATCH /categories/{category_id}`

**Purpose**: Update category properties (partial update allowed).

**Path Parameters**

| Parameter | Type | Required |
|-----------|------|----------|
| `category_id` | UUID | Yes |

**Request Parameters** (all optional)

| Parameter | Type | Validation |
|-----------|------|----------|
| `name` | string | Max 100 chars if provided |
| `slug` | string | ^[a-z0-9]+(-[a-z0-9]+)*$, unique per parent |
| `description` | string | Max 500 chars if provided |
| `sort_order` | integer | Any integer |
| `is_active` | boolean | true or false |

**Example Request - Update Name & Description**
```http
PATCH /api/v1/admin/categories/550e8400-e29b-41d4-a716-446655440099
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Advanced Game Setup",
  "description": "Advanced guide for complex game setups",
  "sort_order": 2
}
```

**Response - 200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440099",
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Advanced Game Setup",
  "slug": "game-setup-guide",
  "description": "Advanced guide for complex game setups",
  "path": "tutorial/game-setup-guide",
  "depth": 1,
  "sort_order": 2,
  "is_active": true,
  "created_at": "2026-04-05T10:30:00Z",
  "updated_at": "2026-04-05T11:00:00Z",
  "children": []
}
```

**Example - Disable Category**
```http
PATCH /api/v1/admin/categories/550e8400-e29b-41d4-a716-446655440099
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "is_active": false
}
```

**Response - 200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440099",
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Advanced Game Setup",
  "slug": "game-setup-guide",
  "description": "Advanced guide for complex game setups",
  "path": "tutorial/game-setup-guide",
  "depth": 1,
  "sort_order": 2,
  "is_active": false,
  "created_at": "2026-04-05T10:30:00Z",
  "updated_at": "2026-04-05T11:05:00Z",
  "children": []
}
```

**Example - Change Slug**
```http
PATCH /api/v1/admin/categories/550e8400-e29b-41d4-a716-446655440099
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "slug": "advanced-game-setup"
}
```

**Response - 200 OK (Path Updated)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440099",
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Advanced Game Setup",
  "slug": "advanced-game-setup",
  "description": "Advanced guide for complex game setups",
  "path": "tutorial/advanced-game-setup",
  "depth": 1,
  "sort_order": 2,
  "is_active": true,
  "created_at": "2026-04-05T10:30:00Z",
  "updated_at": "2026-04-05T11:10:00Z",
  "children": []
}
```

**Error Responses**

| Status | Error | Message |
|--------|-------|---------|
| 400 | `validation_error` | Slug validation failed |
| 404 | `category_not_found` | Category not found |
| 409 | `category_slug_exists` | Category slug already exists under this parent |

**Example Error - Category Not Found**
```json
{
  "error": "category_not_found",
  "message": "Category not found"
}
```

---

### 3. Delete Category

#### `DELETE /categories/{category_id}`

**Purpose**: Delete a category (only if no children exist).

**Path Parameters**

| Parameter | Type | Required |
|-----------|------|----------|
| `category_id` | UUID | Yes |

**Constraints**:
- Category must have NO children
- Root categories with children cannot be deleted
- Soft delete (data preserved for audit)

**Example Request**
```http
DELETE /api/v1/admin/categories/550e8400-e29b-41d4-a716-446655440099
Authorization: Bearer <jwt_token>
```

**Response - 204 No Content**
```
(Empty response body)
```

**Error Responses**

| Status | Error | Message |
|--------|-------|---------|
| 400 | `category_has_children` | Cannot delete category with children |
| 404 | `category_not_found` | Category not found |

**Example Error - Has Children**
```json
{
  "error": "category_has_children",
  "message": "Cannot delete category with children"
}
```

---

## Slug Format Rules

Slug must match pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`

**Valid Examples**:
- `game-setup` ✅
- `inventory` ✅
- `quest-system-2` ✅
- `faq` ✅

**Invalid Examples**:
- `Game-Setup` ❌ (uppercase)
- `game_setup` ❌ (underscore)
- `game--setup` ❌ (double hyphen)
- `-game` ❌ (starts with hyphen)
- `game-` ❌ (ends with hyphen)

---

## Hierarchy Rules

### Max Depth = 3 (4 Levels Total)

```
Level 0 (Depth 0): tutorial         ← Root
  ├─ Level 1 (Depth 1): game-setup
  │   └─ Level 2 (Depth 2): basics
  │       └─ Level 3 (Depth 3): installation ✅ maxallowed
  │           └─ Level 4 (Depth 4): ❌ NOT ALLOWED
```

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 201 | Category created successfully |
| 200 | Category updated successfully |
| 204 | Category deleted successfully |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not super admin) |
| 404 | Not found (category ID doesn't exist) |
| 409 | Conflict (slug exists, max depth, has children) |
| 500 | Internal server error |

---

## Common Use Cases

### Create Category Tree Structure

```
Step 1: Create root category "Tutorial"
POST /api/v1/admin/categories
{
  "name": "Tutorial",
  "slug": "tutorial",
  "description": "Educational content"
}
Response: id = "cat-001"

Step 2: Create child "Game Setup" under Tutorial
POST /api/v1/admin/categories
{
  "parent_id": "cat-001",
  "name": "Game Setup",
  "slug": "game-setup",
  "description": "Game setup instructions"
}
Response: id = "cat-002"

Step 3: Create grandchild "Basics" under Game Setup
POST /api/v1/admin/categories
{
  "parent_id": "cat-002",
  "name": "Basics",
  "slug": "basics",
  "description": "Basic setup steps"
}
Response: id = "cat-003"

Result Path:
tutorial
└── game-setup
    └── basics
```

### Reorder Categories

```
PATCH /api/v1/admin/categories/{category_id}
{
  "sort_order": 5
}
```

### Disable Category (Hide from Public)

```
PATCH /api/v1/admin/categories/{category_id}
{
  "is_active": false
}
```

### Rename & Update Path

```
PATCH /api/v1/admin/categories/{category_id}
{
  "slug": "new-slug-name"
}
→ Automatically updates path and all children paths
```

---

## CURL Examples

### Create Root Category
```bash
curl -X POST "https://api.saigame.studio/api/v1/admin/categories" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Documentation",
    "slug": "documentation",
    "description": "All docs"
  }'
```

### Create Child Category
```bash
curl -X POST "https://api.saigame.studio/api/v1/admin/categories" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Getting Started",
    "slug": "getting-started",
    "description": "For beginners"
  }'
```

### Update Category
```bash
curl -X PATCH "https://api.saigame.studio/api/v1/admin/categories/550e8400-e29b-41d4-a716-446655440099" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "sort_order": 3
  }'
```

### Delete Category
```bash
curl -X DELETE "https://api.saigame.studio/api/v1/admin/categories/550e8400-e29b-41d4-a716-446655440099" \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## Headers Reference

**Required for All Requests**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response Headers**:
```
Content-Type: application/json
X-Total-Count: <count>  (for list operations)
```

---

## Notes for Frontend

1. **Always validate slug format** before sending - pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
2. **Check for parent_id existence** before creating child categories
3. **Prevent deletion of categories with children** - show warning to user
4. **Auto-disable before deleting** - update `is_active: false` first as soft-delete alternative
5. **Handle 409 Conflict** - slug already exists, show error and suggest unique name
6. **Cache category tree** - fetch once on page load, use in-memory for dropdowns
7. **Path updates are automatic** - when slug changes, all children paths update automatically

