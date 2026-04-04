# Content Category Management API

**Version**: 1.0  
**Base URL**: `https://api.saigame.studio/api/v1/contents`

---

## Overview

Content categories form a **hierarchical tree structure** with parent-child relationships. Categories are used to organize content items by topic (e.g., "tutorial/game-setup", "guide/inventory").

**Structure**:
- Root categories: `parent_id = null` (e.g., "tutorial", "guide")
- Child categories: `parent_id = <root_id>` (e.g., "game-setup" under "tutorial")
- Max depth: 3 → 4 levels total (root → child → grandchild → great-grandchild)

**Access Model**:
- **GET endpoints**: Public - No authentication required
- **POST/PATCH/DELETE endpoints**: Super Admin only - Require JWT + `super_admin` role

---

## Data Model

### ContentCategory
```typescript
{
  id: UUID,                    // Unique identifier
  parent_id: UUID | null,      // null = root category, set = parent category
  name: string,               // Display name: "Game Setup"
  slug: string,               // URL slug: "game-setup" (unique under parent)
  description: string,        // Category description (max 500 chars)
  path: string,               // Materialized path: "tutorial/game-setup"
  depth: integer,             // 0 = root, 1 = child, 2 = grandchild, max 3
  sort_order: integer,        // Ordering within same parent level
  is_active: boolean,         // soft enable/disable
  created_at: timestamp,
  updated_at: timestamp,
  children: ContentCategory[] // nested children (not stored, populated by tree builder)
}
```

**Constraints**:
- **Slug format**: `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase, hyphens only)
- **Unique slug per parent**: `UNIQUE(slug, parent_id)`
- **Unique path**: `UNIQUE(path)` (materialized path)
- **Max depth**: 3 (4 levels total)

## Endpoints (6 Operations)

### 1. List Category Tree

#### `GET /categories`
**🔓 Public** - List entire category tree (nested structure).

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "parent_id": null,
      "name": "Tutorial",
      "slug": "tutorial",
      "description": "Educational content and step-by-step guides",
      "path": "tutorial",
      "depth": 0,
      "sort_order": 0,
      "is_active": true,
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-04-01T10:00:00Z",
      "children": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "parent_id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "Game Setup",
          "slug": "game-setup",
          "description": "Getting started with game setup",
          "path": "tutorial/game-setup",
          "depth": 1,
          "sort_order": 0,
          "is_active": true,
          "created_at": "2026-04-01T11:00:00Z",
          "updated_at": "2026-04-01T11:00:00Z",
          "children": []
        },
        {
          "id": "550e8400-e29b-41d4-a716-446655440003",
          "parent_id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "Quest System",
          "slug": "quest-system",
          "description": "Quest system design and implementation",
          "path": "tutorial/quest-system",
          "depth": 1,
          "sort_order": 1,
          "is_active": true,
          "created_at": "2026-04-01T12:00:00Z",
          "updated_at": "2026-04-01T12:00:00Z",
          "children": []
        }
      ]
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "parent_id": null,
      "name": "Guide",
      "slug": "guide",
      "description": "In-depth guides and best practices",
      "path": "guide",
      "depth": 0,
      "sort_order": 1,
      "is_active": true,
      "created_at": "2026-04-01T13:00:00Z",
      "updated_at": "2026-04-01T13:00:00Z",
      "children": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440005",
          "parent_id": "550e8400-e29b-41d4-a716-446655440004",
          "name": "Inventory",
          "slug": "inventory",
          "description": "Inventory system guide",
          "path": "guide/inventory",
          "depth": 1,
          "sort_order": 0,
          "is_active": true,
          "created_at": "2026-04-01T14:00:00Z",
          "updated_at": "2026-04-01T14:00:00Z",
          "children": []
        }
      ]
    }
  ]
}
```

**Response `500 Internal Server Error`**
```json
{
  "error": "internal_server_error",
  "message": "Failed to fetch categories"
}
```

---

### 2. Get Category

#### `GET /categories/{category_id}`
**🔓 Public** - Get single category details.

**Path Parameters**
```
category_id: UUID → Category ID
```

**Response `200 OK`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Game Setup",
  "slug": "game-setup",
  "description": "Getting started with game setup",
  "path": "tutorial/game-setup",
  "depth": 1,
  "sort_order": 0,
  "is_active": true,
  "created_at": "2026-04-01T11:00:00Z",
  "updated_at": "2026-04-01T11:00:00Z",
  "children": []
}
```

**Response `400 Bad Request`**
```json
{
  "error": "validation_error",
  "message": "Invalid category ID"
}
```

**Response `404 Not Found`**
```json
{
  "error": "category_not_found",
  "message": "Category not found"
}
```

---

### 3. List Children

#### `GET /categories/{category_id}/children`
**🔓 Public** - List immediate children of a category.

**Path Parameters**
```
category_id: UUID → Parent Category ID
```

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "parent_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Game Setup",
      "slug": "game-setup",
      "description": "Getting started with game setup",
      "path": "tutorial/game-setup",
      "depth": 1,
      "sort_order": 0,
      "is_active": true,
      "created_at": "2026-04-01T11:00:00Z",
      "updated_at": "2026-04-01T11:00:00Z",
      "children": []
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "parent_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Quest System",
      "slug": "quest-system",
      "description": "Quest system design",
      "path": "tutorial/quest-system",
      "depth": 1,
      "sort_order": 1,
      "is_active": true,
      "created_at": "2026-04-01T12:00:00Z",
      "updated_at": "2026-04-01T12:00:00Z",
      "children": []
    }
  ]
}
```

**Response `404 Not Found`**
```json
{
  "error": "category_not_found",
  "message": "Category not found"
}
```

---

### 4. Create Category

#### `POST /admin/contents/categories`
**🔒 SUPER ADMIN ONLY** - Create new category.

**Request Headers**
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body**
```json
{
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Monetization",
  "slug": "monetization",
  "description": "Game monetization strategies",
  "sort_order": 2
}
```

**Field Descriptions**
```
parent_id        (optional, UUID)  - Parent category UUID (null = root)
name             (required, string) - Display name (max 100 chars)
slug             (required, string) - URL-friendly slug (lowercase, hyphens)
description      (optional, string) - Description (max 500 chars)
sort_order       (optional, integer) - Sort order (default 0)
```

**Response `201 Created`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Monetization",
  "slug": "monetization",
  "description": "Game monetization strategies",
  "path": "tutorial/monetization",
  "depth": 1,
  "sort_order": 2,
  "is_active": true,
  "created_at": "2026-04-05T10:30:00Z",
  "updated_at": "2026-04-05T10:30:00Z",
  "children": []
}
```

**Response `400 Bad Request`**
```json
{
  "error": "validation_error",
  "message": "Slug validation failed: must be lowercase with hyphens"
}
```

**Response `409 Conflict`**
```json
{
  "error": "category_slug_exists",
  "message": "Category slug 'monetization' already exists under this parent"
}
```

**Response `409 Max Depth`**
```json
{
  "error": "category_max_depth",
  "message": "Category max depth exceeded (max 3 levels)"
}
```

---

### 5. Update Category

#### `PATCH /admin/contents/categories/{category_id}`
**🔒 SUPER ADMIN ONLY** - Update category details.

**Path Parameters**
```
category_id: UUID → Category ID
```

**Request Body** (all fields optional)
```json
{
  "name": "Advanced Monetization",
  "slug": "advanced-monetization",
  "description": "Advanced monetization strategies and tips",
  "sort_order": 3,
  "is_active": true
}
```

**Response `200 OK`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "parent_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Advanced Monetization",
  "slug": "advanced-monetization",
  "description": "Advanced monetization strategies and tips",
  "path": "tutorial/advanced-monetization",
  "depth": 1,
  "sort_order": 3,
  "is_active": true,
  "created_at": "2026-04-05T10:30:00Z",
  "updated_at": "2026-04-05T11:00:00Z",
  "children": []
}
```

**Response `400 Bad Request`**
```json
{
  "error": "validation_error",
  "message": "Slug validation failed"
}
```

**Response `404 Not Found`**
```json
{
  "error": "category_not_found",
  "message": "Category not found"
}
```

---

### 6. Delete Category

#### `DELETE /admin/contents/categories/{category_id}`
**🔒 SUPER ADMIN ONLY** - Delete category (only if no children).

**Path Parameters**
```
category_id: UUID → Category ID
```

**Response `204 No Content`**
```
(No body)
```

**Response `400 Bad Request` (Has Children)**
```json
{
  "error": "category_has_children",
  "message": "Cannot delete category with children"
}
```

**Response `404 Not Found`**
```json
{
  "error": "category_not_found",
  "message": "Category not found"
}
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `validation_error` | 400 | Invalid request body or parameters |
| `category_not_found` | 404 | Category ID doesn't exist |
| `category_slug_exists` | 409 | Slug already exists under this parent |
| `category_path_exists` | 409 | Full path already exists |
| `category_has_children` | 400 | Cannot delete category with children |
| `category_max_depth` | 400 | Max nesting depth exceeded (3) |
| `unauthorized` | 401 | No JWT token or invalid |
| `forbidden` | 403 | User is not Super Admin |
| `internal_server_error` | 500 | Server error |

---

## Data Constraints & Limits

| Field | Limit | Notes |
|-------|-------|-------|
| Name | 100 chars | Required, display name |
| Slug | 100 chars | Required, URL-friendly (lowercase, hyphens) |
| Description | 500 chars | Optional, max 500 |
| Path | 500 chars | Materialized, unique globally |
| Depth | 3 max | 4 levels total (root + 3 children) |
| Sort Order | integer | Ordering within same parent |

---

## Examples

### Create Root Category
```bash
POST /api/v1/admin/contents/categories
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "name": "FAQ",
  "slug": "faq",
  "description": "Frequently asked questions"
}
```

**Response: 201 Created**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "parent_id": null,
  "name": "FAQ",
  "slug": "faq",
  "path": "faq",
  "depth": 0,
  "is_active": true,
  ...
}
```

---

### Create Child Category
```bash
POST /api/v1/admin/contents/categories
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "parent_id": "550e8400-e29b-41d4-a716-446655440020",
  "name": "Account Recovery",
  "slug": "account-recovery",
  "description": "How to recover your account"
}
```

**Response: 201 Created**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440021",
  "parent_id": "550e8400-e29b-41d4-a716-446655440020",
  "name": "Account Recovery",
  "slug": "account-recovery",
  "path": "faq/account-recovery",
  "depth": 1,
  "is_active": true,
  ...
}
```

---

### List Category Tree
```bash
GET /api/v1/contents/categories
```

Returns nested tree structure with all categories and their children.

---

### Delete Category
```bash
DELETE /api/v1/admin/contents/categories/{category_id}
Authorization: Bearer <admin_jwt>
```

**Error: Category has children**
```json
{
  "error": "category_has_children",
  "message": "Cannot delete category with children"
}
```

Solution: Delete children first, then delete parent.

---

## Implementation Notes

### Tree Structure
- Categories form hierarchical tree with `parent_id` (adjacency list)
- Each category has `path` (materialized path) for fast queries: "tutorial/game-setup"
- **Tree builder** converts flat list to nested structure using parent-child relationships
- Public list endpoint returns nested children; admin list returns flat

### Path Updates on Rename
- When category slug/path changes, all **children's paths updated automatically**
- Uses **recursive query** to update child paths in **one operation**
- Example: If "tutorial" → "guides", then "tutorial/game-setup" → "guides/game-setup"

### Delete Validation
- **Leaf-only deletion**: Cannot delete category if it has children
- **Soft deletion**: Not implemented (permanent delete only)
- Must delete all descendants before deleting parent

### Slug Uniqueness
- Slug is **unique under same parent** (UNIQUE(slug, parent_id))
  - Root "tutorial" + Child "game-setup" = OK
  - Root "guide" + Child "game-setup" = OK (different parent)
  - Two "tutorial" at root level = NOT OK
- Path is **globally unique** (UNIQUE(path))
  - Only one "tutorial/game-setup" can exist

### Max Depth
- **Root (depth 0)** → **Child (depth 1)** → **Grandchild (depth 2)** → **Great-grandchild (depth 3)**
- Cannot create fifth level
- Returns `category_max_depth` error if attempted

---

## Authentication & Authorization

### Public Endpoints
- `GET /categories` - List tree
- `GET /categories/{id}` - Get category
- `GET /categories/{id}/children` - List children

**Requires**: No authentication

### Admin-Only Endpoints
- `POST /admin/contents/categories` - Create
- `PATCH /admin/contents/categories/{id}` - Update
- `DELETE /admin/contents/categories/{id}` - Delete

**Requires**: JWT + `super_admin` role

**Error: Unauthorized**
```json
{
  "error": "unauthorized",
  "message": "Missing or invalid JWT token"
}
```

**Error: Forbidden**
```json
{
  "error": "forbidden",
  "message": "User is not Super Admin"
}
```
