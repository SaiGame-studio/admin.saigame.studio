# Leaderboard Raw Data API (Studio Member)

Ticket scope: P2-T34 / P2-T35 / P2-T36

Tai lieu nay mo ta 2 API danh cho Studio Member de xem du lieu raw cua leaderboard theo season.

Luu y quan trong:
- "Raw" trong 2 API nay la raw score rows da duoc aggregate cho ranking (bang leaderboard_scores) hoac raw history rows da archive (bang leaderboard_score_history).
- Day KHONG phai raw event queue tu bang leaderboard_score_events.

## Auth va Permission

- Auth: Bearer token (JWT)
- Role: Studio member (game-scoped route)
- Permission bat buoc: leaderboard:read

## 1) Lay raw data cua season hien tai

Endpoint:
- GET /api/v1/studios/{studio_id}/games/{game_id}/leaderboards/{board_id}/seasons/current/raw

Query params:
- offset (optional, default = 0, min = 0)
- limit (optional, default = 1000, max = 5000)

Muc dich:
- Tra ve toan bo score rows cua active season, co rank + user_id + score + updated_at.
- Ho tro phan trang bang offset/limit.

Sample request:

```http
GET /api/v1/studios/2f8f2c64-f6ae-4a47-9eb1-4c2abf2f3c70/games/4c6134e1-e66f-4b7e-bf5a-8f9f0f4b6df5/leaderboards/7b2cd3f6-c8f9-4eb2-a7c8-f3f1e18423aa/seasons/current/raw?offset=0&limit=100
Authorization: Bearer <access_token>
```

Sample response (200):

```json
{
  "season": {
    "id": "3e086f31-4ea0-4ea3-b4e8-8e1135ae53e7",
    "board_id": "7b2cd3f6-c8f9-4eb2-a7c8-f3f1e18423aa",
    "season_number": 12,
    "name": "Season 12",
    "started_at": "2026-04-20T00:00:00Z",
    "ended_at": null,
    "reward_dispatched_at": null,
    "planned_end_at": "2026-04-21T00:00:00Z"
  },
  "entries": [
    {
      "rank": 1,
      "user_id": "5b2f0a0f-b6d7-4d7c-9db5-d1cb6a7546a2",
      "score": 9800,
      "updated_at": "2026-04-20T10:30:22Z"
    },
    {
      "rank": 2,
      "user_id": "8bdf9c73-b36f-4f87-b5ab-62ad4b8dcaf8",
      "score": 9100,
      "updated_at": "2026-04-20T10:31:45Z"
    }
  ],
  "total": 2314,
  "offset": 0,
  "limit": 100
}
```

Common errors:

```json
{
  "error": "invalid board_id",
  "message": "invalid UUID length: 4"
}
```

```json
{
  "error": "leaderboard not found",
  "message": "leaderboard not found"
}
```

```json
{
  "error": "no active season",
  "message": "leaderboard has no active season"
}
```

## 2) Lay raw data cua 1 season cu the

Endpoint:
- GET /api/v1/studios/{studio_id}/games/{game_id}/leaderboards/{board_id}/seasons/{season_id}/raw

Query params:
- offset (optional, default = 0, min = 0)
- limit (optional, default = 1000, max = 5000)

Muc dich:
- Tra ve score history rows cua season chi dinh (thuong dung cho season da end).
- Ho tro phan trang bang offset/limit.

Sample request:

```http
GET /api/v1/studios/2f8f2c64-f6ae-4a47-9eb1-4c2abf2f3c70/games/4c6134e1-e66f-4b7e-bf5a-8f9f0f4b6df5/leaderboards/7b2cd3f6-c8f9-4eb2-a7c8-f3f1e18423aa/seasons/3e086f31-4ea0-4ea3-b4e8-8e1135ae53e7/raw?offset=0&limit=100
Authorization: Bearer <access_token>
```

Sample response (200):

```json
{
  "season": {
    "id": "3e086f31-4ea0-4ea3-b4e8-8e1135ae53e7",
    "board_id": "7b2cd3f6-c8f9-4eb2-a7c8-f3f1e18423aa",
    "season_number": 11,
    "name": "Season 11",
    "started_at": "2026-04-13T00:00:00Z",
    "ended_at": "2026-04-20T00:00:00Z",
    "reward_dispatched_at": "2026-04-20T00:03:05Z",
    "planned_end_at": "2026-04-20T00:00:00Z"
  },
  "entries": [
    {
      "id": "9ed47fa6-80a3-4997-bad8-f459b89bbf7f",
      "board_id": "7b2cd3f6-c8f9-4eb2-a7c8-f3f1e18423aa",
      "season_id": "3e086f31-4ea0-4ea3-b4e8-8e1135ae53e7",
      "user_id": "5b2f0a0f-b6d7-4d7c-9db5-d1cb6a7546a2",
      "final_score": 15400,
      "final_rank": 1,
      "archived_at": "2026-04-20T00:00:03Z"
    },
    {
      "id": "77d1ef6f-9084-4ca6-8ea8-433c8a8ce9fe",
      "board_id": "7b2cd3f6-c8f9-4eb2-a7c8-f3f1e18423aa",
      "season_id": "3e086f31-4ea0-4ea3-b4e8-8e1135ae53e7",
      "user_id": "8bdf9c73-b36f-4f87-b5ab-62ad4b8dcaf8",
      "final_score": 14820,
      "final_rank": 2,
      "archived_at": "2026-04-20T00:00:03Z"
    }
  ],
  "total": 2481,
  "offset": 0,
  "limit": 100
}
```

Common errors:

```json
{
  "error": "invalid season_id",
  "message": "invalid UUID length: 4"
}
```

```json
{
  "error": "season not found",
  "message": "leaderboard season not found"
}
```

## FE Implementation Notes

- Khuyen nghi dung limit 100-500 cho UI list, chi dung 5000 cho export/admin tooling.
- Su dung total de tinh so trang.
- Neu current/raw tra ve no active season, FE nen hien state rong + huong dan admin start season.
- raw current va raw season co khac schema trong entries:
  - current/raw entries: rank, user_id, score, updated_at
  - season/raw entries: id, board_id, season_id, user_id, final_score, final_rank, archived_at

## Data Source Mapping (de tranh nham lan)

- /seasons/current/raw -> leaderboard_scores (active season)
- /seasons/{season_id}/raw -> leaderboard_score_history (archived season)
- leaderboard_score_events khong duoc expose qua Studio Member API.
