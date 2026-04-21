# Leaderboard — Hướng dẫn tạo board đúng chuẩn (Frontend Guide)

> **Audience:** Frontend Web / Mobile khi tích hợp với Studio Admin Panel.
> **Ticket reference:** P2-T35 — Leaderboard Service Local Implementation.
> **Source of truth:** [leaderboard_handler.go:357-434](../../internal/handler/leaderboard_handler.go#L357-L434), [leaderboard.go:1-170](../../internal/domain/leaderboard.go#L1-L170).

---

## 1. Yêu cầu tiên quyết (MUST-HAVE)

Trước khi gọi create board, game **phải** có một subscription plugin tier thuộc nhóm "leaderboard-capable":

| Plugin ID       | OK? |
| --------------- | --- |
| `rare`          | ✅  |
| `epic`          | ✅  |
| `legendary`     | ✅  |
| `leaderboard`   | ✅  |
| `free` / `common` | ❌  |

Nếu không có, server trả `403` với message:
```
leaderboard feature requires rare plugin or above; please upgrade your plugin tier
```
→ Frontend nên chặn nút "Create" và hiện CTA nâng cấp plugin.

Ref: [leaderboard.go:156-169](../../internal/domain/leaderboard.go#L156-L169).

---

## 2. Endpoint

```
POST /api/v1/studios/{studio_id}/games/{game_id}/leaderboards
```

- **Auth:** JWT (Studio member) + permission `leaderboard:create`.
- **Content-Type:** `application/json`.
- **Path params:** `studio_id`, `game_id` — đều là UUID v4.

---

## 3. Request body — đầy đủ các trường

```json
{
  "board_key": "weekly_gacha_opens",
  "name": "Weekly Gacha Opens",
  "description": "Tổng số lần mở Premium Pack trong tuần; reset 00:00 UTC thứ Hai.",
  "score_mode": "sum",
  "sort_direction": "DESC",
  "reset_schedule": "weekly",
  "first_season_start_at": "2026-05-04T00:00:00Z",
  "first_season_name": "Season {n} - Launch",
  "score_source_type": "gacha_pack_open_count",
  "score_source_ref_id": "7c1b8a4a-8ef2-4a11-9b0b-5f5a2cbb9e71"
}
```

### 3.1 Bảng mô tả từng trường

| Field                   | Type              | Required | Mặc định                 | Ghi chú                                                                 |
| ----------------------- | ----------------- | -------- | ------------------------ | ----------------------------------------------------------------------- |
| `board_key`             | string            | ✅       | —                        | Unique per game. Dùng làm key bền vững (không đổi sau khi tạo).         |
| `name`                  | string            | ✅       | —                        | Tên hiển thị cho player.                                                |
| `description`           | string            | ❌       | `""`                     | Mô tả tự do.                                                            |
| `score_mode`            | enum              | ✅       | —                        | Xem §3.2.                                                               |
| `sort_direction`        | enum              | ✅       | —                        | `ASC` \| `DESC`.                                                        |
| `reset_schedule`        | enum              | ✅       | —                        | Xem §3.4.                                                               |
| `first_season_start_at` | RFC3339 \| null   | ❌       | auto (xem §3.5)          | Khi nào Season 1 bắt đầu.                                               |
| `first_season_name`     | string            | ❌       | `"Season N"`             | Tên season. Hỗ trợ pattern — xem §3.7.                                  |
| `score_source_type`     | enum \| null      | ❌*      | `null`                   | Auto-scoring rule. Xem §3.6.                                            |
| `score_source_ref_id`   | uuid \| null      | ❌*      | `null`                   | Id của entity ref. Xem §3.6.                                            |

\* `score_source_type` và `score_source_ref_id` phải **cùng** có hoặc **cùng** null — nếu chỉ set 1 trong 2, server trả `400`.

### 3.2 `score_mode` — cách cộng dồn điểm

Ref: [leaderboard.go:17-34](../../internal/domain/leaderboard.go#L17-L34).

| Value    | Ý nghĩa                                                                 | Use case                     |
| -------- | ----------------------------------------------------------------------- | ---------------------------- |
| `max`    | Giữ delta cao nhất từng thấy.                                           | Highest score, best combo.   |
| `min`    | Giữ delta thấp nhất từng thấy.                                          | Speedrun "best time".        |
| `latest` | Luôn ghi đè bằng delta mới nhất.                                        | Rating hiện tại, MMR.        |
| `sum`    | Cộng tất cả các delta.                                                  | Total XP, total pack opens.  |

### 3.3 `sort_direction` — thứ tự xếp hạng

| Value  | Nghĩa                                    |
| ------ | ---------------------------------------- |
| `DESC` | Điểm cao = rank tốt hơn (mặc định).      |
| `ASC`  | Điểm thấp = rank tốt hơn (vd: speedrun). |

### 3.4 `reset_schedule` — chu kỳ reset season

Ref: [leaderboard.go:49-67](../../internal/domain/leaderboard.go#L49-L67), [leaderboard_service_local.go:218-329](../../internal/services/implementations/leaderboard_service_local.go#L218-L329).

| Value     | Behavior                                                                            | Pre-created seasons |
| --------- | ----------------------------------------------------------------------------------- | ------------------- |
| `daily`   | Reset 00:00 UTC mỗi ngày. Mỗi season = 24h.                                         | **7** seasons       |
| `weekly`  | Reset 00:00 UTC thứ Hai đầu tuần. Mỗi season = 7 ngày.                              | **4** seasons       |
| `monthly` | Reset 00:00 UTC ngày 1 mỗi tháng. Mỗi season = 1 calendar month.                    | **2** seasons       |
| `season`  | Không tự reset — admin phải gọi endpoint `StartNewSeason` / `EndSeason` thủ công.   | 0 (tạo khi gọi API) |
| `never`   | Không bao giờ reset — chỉ có 1 lifetime season.                                     | 1 (tùy chọn)        |

**Lưu ý:** với `never`, endpoint `EndSeason` sẽ trả lỗi `422 — cannot end season for a board with reset_schedule = 'never'`.

### 3.5 `first_season_start_at` — thời điểm Season 1 bắt đầu

- **`null`** (mặc định):
  - `daily` → 00:00 UTC ngày mai
  - `weekly` → 00:00 UTC thứ Hai tuần tới
  - `monthly` → 00:00 UTC ngày 1 tháng tới
  - `never` / `season` → **không** tạo season ngay; season 1 sẽ được tạo tự động khi hệ thống cần (hoặc admin gọi `StartNewSeason` endpoint).
- **Có giá trị (RFC3339):** Season 1 bắt đầu đúng thời điểm đó. Dùng khi cần lên lịch launch trong tương lai, hoặc backfill từ quá khứ.

### 3.6 Auto-scoring rule (`score_source_type` + `score_source_ref_id`) — BẮT BUỘC để board có điểm

Ref: [leaderboard.go:69-115](../../internal/domain/leaderboard.go#L69-L115), [leaderboard.go:476-518](../../internal/domain/leaderboard.go#L476-L518).

⚠️ **QUAN TRỌNG:** Hệ thống **không** expose HTTP endpoint nào để push score thủ công. Cách duy nhất để board có điểm là set auto-scoring rule. Nếu không set (cả 2 trường = `null`), board sẽ **không bao giờ có score** — chỉ hiển thị được thiết kế, không có player trên bảng xếp hạng.

Khi set, các hệ thống game nội bộ (gacha khi open, inventory/mailbox khi grant item) tự động bắn score event vào board:

| `score_source_type`       | `score_source_ref_id` là gì           | Delta mỗi lần           | Trigger trong code                                                                                 |
| ------------------------- | ------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `gacha_pack_open_count`   | `gacha_pack_id` (UUID)                | `+1` mỗi lần open       | [gacha_usecase.go:380](../../internal/usecase/gacha_usecase.go#L380)                               |
| `item_collected_count`    | `item_definition_id` (UUID)           | `+quantity` mỗi lần nhận | [inventory_service_local.go:147](../../internal/services/implementations/inventory_service_local.go#L147), [mailbox_service_local.go:432](../../internal/services/implementations/mailbox_service_local.go#L432) |

Frontend **nên fetch** danh sách options từ endpoint:
```
GET /api/v1/leaderboards/score-source-type-options
```
để render dropdown có `label` + `description` + `ref_id_label` (không hard-code).

Tương tự cho `reset_schedule`:
```
GET /api/v1/leaderboards/reset-schedule-options
```

### 3.7 `first_season_name` — literal hoặc pattern

Ref: [leaderboard_service_local.go:19-36](../../internal/services/implementations/leaderboard_service_local.go#L19-L36).

`first_season_name` có **3 chế độ**, backend tự phân loại dựa trên chuỗi:

| Chế độ                  | Input ví dụ                | Season 1       | Season 2       | Season 3       | ... |
| ----------------------- | -------------------------- | -------------- | -------------- | -------------- | --- |
| **(a) Bỏ trống**        | `""` hoặc không gửi        | `Season 1`     | `Season 2`     | `Season 3`     | ... |
| **(b) Literal**         | `"S1 - Start"`             | `S1 - Start`   | `Season 2`     | `Season 3`     | ... |
| **(c) Pattern `{n}`**   | `"Season {n} - Launch"`    | `Season 1 - Launch` | `Season 2 - Launch` | `Season 3 - Launch` | ... |

**Rule phân loại:**
- Chuỗi **có** token `{n}` → **pattern mode**: backend thay `{n}` bằng số thứ tự season cho **tất cả** seasons được pre-create.
- Chuỗi **không** có `{n}` → **literal mode**: chỉ Season 1 dùng tên này; Season 2+ dùng mặc định `"Season N"`.

**Khuyến nghị cho FE:** nếu user muốn naming đồng bộ (đặc biệt với `daily` = 7 seasons, `weekly` = 4 seasons), UI nên **mặc định điền** pattern kèm `{n}`, ví dụ:
```
Season {n} - Launch
```

Tokens hỗ trợ: chỉ `{n}` (số thứ tự season, bắt đầu từ 1). Không hỗ trợ `{yyyy}`, `{MM}`, `{dd}`.

---

## 4. Sample response (HTTP 201 Created)

```json
{
  "board": {
    "id": "b0f1c7d8-4c2e-4a5a-9e6f-7c1b8a4a8ef2",
    "game_id": "a4d3a7b2-1111-2222-3333-444455556666",
    "board_key": "weekly_gacha_opens",
    "name": "Weekly Gacha Opens",
    "description": "Tổng số lần mở Premium Pack trong tuần; reset 00:00 UTC thứ Hai.",
    "score_mode": "sum",
    "sort_direction": "DESC",
    "reset_schedule": "weekly",
    "season_id": "5f5a2cbb-9e71-4a11-9b0b-7c1b8a4a8ef2",
    "is_active": true,
    "score_source_type": "gacha_pack_open_count",
    "score_source_ref_id": "7c1b8a4a-8ef2-4a11-9b0b-5f5a2cbb9e71",
    "created_at": "2026-04-21T09:32:11Z",
    "updated_at": "2026-04-21T09:32:11Z"
  }
}
```

**Tips:**
- `season_id` có thể `null` nếu `reset_schedule = never/season` và `first_season_start_at` không được set.
- `studio_id` **không** trả về trong response (field `json:"-"`) — FE đã có từ URL.

---

## 5. Các lỗi frontend phải handle

| HTTP | Khi nào                                                                 | Error message / code                                                                                     |
| ---- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 400  | `game_id` sai format UUID                                               | `invalid game_id`                                                                                        |
| 400  | Thiếu `board_key` hoặc `name`                                           | `board_key and name are required`                                                                        |
| 400  | `score_mode` sai                                                        | `invalid score_mode: "xyz"` — valid: `max, min, latest, sum`                                             |
| 400  | `sort_direction` sai                                                    | `invalid sort_direction: "xyz"` — valid: `ASC, DESC`                                                     |
| 400  | `reset_schedule` sai                                                    | `invalid reset_schedule: "xyz"` — valid: `never, daily, weekly, monthly, season`                         |
| 400  | Chỉ set 1 trong 2 của `score_source_type` / `score_source_ref_id`       | `scoring rule requires both score_source_type and score_source_ref_id`                                   |
| 400  | `score_source_type` sai enum                                            | `invalid score_source_type: "xyz"`                                                                       |
| 403  | Game thiếu plugin rare+                                                 | `leaderboard feature requires rare plugin or above; please upgrade your plugin tier`                     |
| 403  | Đã chạm `max_leaderboards` limit của game                               | `{"error":"GAME_LEADERBOARD_LIMIT_REACHED","message":"leaderboards limit exceeded for Game ...: 5/5"}`   |
| 500  | Lỗi không mong đợi                                                      | `failed to create leaderboard`                                                                           |

Ref handler: [leaderboard_handler.go:379-430](../../internal/handler/leaderboard_handler.go#L379-L430).

### 5.1 Sample error body — limit exceeded

```json
{
  "error": "GAME_LEADERBOARD_LIMIT_REACHED",
  "message": "leaderboards limit exceeded for Game a4d3a7b2-...: 5/5",
  "details": {
    "resource": "leaderboards",
    "owner_type": "Game",
    "owner_id": "a4d3a7b2-1111-2222-3333-444455556666",
    "current": 5,
    "max": 5
  }
}
```

### 5.2 Sample error body — validation

```json
{
  "error": "invalid score_mode: \"highest\"",
  "details": "valid values: max, min, latest, sum"
}
```

---

## 6. Validation checklist trước khi submit (client-side)

Để giảm round-trip, FE nên validate **trước** khi gọi API:

1. `board_key` non-empty, không chứa whitespace thừa, ≤ 64 chars.
2. `name` non-empty.
3. `score_mode` ∈ {`max`, `min`, `latest`, `sum`}.
4. `sort_direction` ∈ {`ASC`, `DESC`}.
5. `reset_schedule` ∈ {`never`, `daily`, `weekly`, `monthly`, `season`}.
6. `first_season_start_at` nếu có phải parse được thành ISO-8601/RFC3339.
7. Nếu `score_source_type` set → `score_source_ref_id` bắt buộc phải là UUID hợp lệ (và ngược lại).
8. Game phải có plugin rare+ (fetch subscription trước, disable UI nếu không có).

---

## 7. Preset gợi ý cho UI

Để giảm sai sót, Admin Panel có thể ship các template preset. Các preset dưới đây khớp với 2 auto-scoring rule mà hệ thống hỗ trợ (`gacha_pack_open_count`, `item_collected_count`) — xem [leaderboard.go:73-79](../../internal/domain/leaderboard.go#L73-L79):

| Preset                           | score_mode | sort_direction | reset_schedule | Gợi ý `score_source_type`   |
| -------------------------------- | ---------- | -------------- | -------------- | --------------------------- |
| **Daily Gacha Opens**            | `sum`      | `DESC`         | `daily`        | `gacha_pack_open_count`     |
| **Weekly Gacha Opens**           | `sum`      | `DESC`         | `weekly`       | `gacha_pack_open_count`     |
| **Monthly Item Collection**      | `sum`      | `DESC`         | `monthly`      | `item_collected_count`      |
| **All-time Gacha Opens**         | `sum`      | `DESC`         | `never`        | `gacha_pack_open_count`     |
| **All-time Item Collection**     | `sum`      | `DESC`         | `never`        | `item_collected_count`      |

> **Lưu ý:** board không set `score_source_type` sẽ không có bất kỳ score event nào vào — vì hiện tại không có endpoint push score public. Luôn nhớ set auto-scoring rule (xem §3.6).

---

## 8. Flow tổng quan

```
FE                                           Backend
 │                                              │
 │ 1. GET /games/{id}/plugins (check rare+)    │
 ├────────────────────────────────────────────►│
 │                                              │
 │ 2. GET /leaderboards/reset-schedule-options │
 │    GET /leaderboards/score-source-type-...  │
 ├────────────────────────────────────────────►│
 │                                              │
 │ 3. User fills form → client validate §6     │
 │                                              │
 │ 4. POST .../leaderboards  (body §3)         │
 ├────────────────────────────────────────────►│
 │                                              │ ├─ plugin check
 │                                              │ ├─ limit check
 │                                              │ ├─ enum validate
 │                                              │ ├─ create board
 │                                              │ └─ pre-create seasons (§3.4)
 │                                              │
 │ 5. 201 { "board": {...} }                   │
 │◄────────────────────────────────────────────┤
 │                                              │
 │ 6. Navigate to board detail page            │
 │    (GET .../leaderboards/{id})              │
```

---

## 9. Endpoint liên quan (chỉ tham khảo, không chi tiết trong doc này)

| Method | Path                                                                                | Dùng khi                                          |
| ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/v1/studios/{sid}/games/{gid}/leaderboards`                                    | List tất cả board (admin view).                   |
| GET    | `/api/v1/studios/{sid}/games/{gid}/leaderboards/{bid}`                              | Xem chi tiết board.                               |
| PUT    | `/api/v1/studios/{sid}/games/{gid}/leaderboards/{bid}`                              | Update `name`, `description`, `is_active`. |
| DELETE | `/api/v1/studios/{sid}/games/{gid}/leaderboards/{bid}`                              | Soft-delete board.                                |
| POST   | `/api/v1/studios/{sid}/games/{gid}/leaderboards/{bid}/seasons`                      | Start season thủ công (cho `reset_schedule=season`). |
| POST   | `/api/v1/studios/{sid}/games/{gid}/leaderboards/{bid}/seasons/end`                  | End season hiện tại + archive + phát reward.       |
| DELETE | `/api/v1/studios/{sid}/games/{gid}/leaderboards/{bid}/seasons/{sid}`                | Xóa upcoming season (chưa start).                 |
| GET    | `/api/v1/games/{gid}/leaderboards/{bid}/top?limit=100`                              | Top N cho player UI.                              |
| GET    | `/api/v1/games/{gid}/leaderboards/{bid}/me`                                         | Rank của chính player (JWT player).               |
| GET    | `/api/v1/games/{gid}/leaderboards/{bid}/neighbors?window=5`                         | ±window rank quanh player.                        |

---

**Ticket ID source:** `P2-T35` — trích từ comment trong [leaderboard_service_local.go:3](../../internal/services/implementations/leaderboard_service_local.go#L3).

✅ Compliance — Rule 0.1 (METHOD + path + sample JSON response), Rule 0.2 (doc-only, không tạo feature ngoài spec), Rule 4 (Ticket ID source: P2-T35 từ file comment), Rule 5 (compliance footer), Rule 17 (mọi claim đều kèm file:line reference).
