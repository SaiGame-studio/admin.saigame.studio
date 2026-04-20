# Quest Reward Delivery — Studio Member Guide

Hướng dẫn cho **Studio Member UI** (Quest Builder): chọn cách hệ thống trao thưởng cho player khi họ hoàn thành quest.

## 1. Hai lựa chọn

| Lựa chọn | Giá trị gửi lên BE | Ý nghĩa |
|---|---|---|
| **Hộp thư** (mặc định) | `"mailbox"` | Thưởng vào inbox → player tự vào mở thư để nhận |
| **Trao thẳng** | `"direct"` | Thưởng chảy thẳng vào inventory + ví coin, không qua thư |

## 1a. Cấu hình mặc định ở cấp Game

Studio owner có thể đặt **mặc định toàn game** thông qua `GameSettings.quest_reward_delivery`. Khi field này được đặt, tất cả quest trong game sẽ follow theo — trừ khi quest đó tự override trong `metadata["reward_delivery"]`.

| `quest_reward_delivery` trong Game Settings | Hiệu lực |
|---|---|
| `""` hoặc `"mailbox"` (mặc định) | Tất cả quest dùng mailbox (trừ quest override sang "direct") |
| `"direct"` | Tất cả quest trao thẳng (trừ quest override sang "mailbox") |

**Endpoint cập nhật Game Settings:**

`PATCH /api/v1/studios/{studio_id}/games/{game_id}`

```json
{
  "settings": {
    "quest_reward_delivery": "mailbox",
    "quest_mailbox_title": "Phần thưởng quest đang chờ bạn!",
    "quest_mailbox_body": "Bạn đã hoàn thành nhiệm vụ. Mở hòm thư để nhận phần thưởng."
  }
}
```

`quest_mailbox_title` và `quest_mailbox_body` chỉ có ý nghĩa khi `quest_reward_delivery = "mailbox"` (hoặc để trống). Khi `quest_reward_delivery = "direct"`, hai field này được bỏ qua.

> ⚠️ **Game setting là cao nhất.** Quest chỉ được override khi trong metadata có `"override_game_delivery": true`. Khi không có flag này, game setting luôn thắng dù quest có `reward_delivery` trong metadata.

**Bảng ưu tiên — delivery mode (cao → thấp):**
1. `GameSettings.quest_reward_delivery` — **cao nhất**, áp dụng cho toàn game
2. Quest `metadata["reward_delivery"]` — chỉ có hiệu lực khi `metadata["override_game_delivery"] = true`
3. System default — `"mailbox"`

**Bảng ưu tiên — mailbox title / body (cao → thấp):**
1. `GameSettings.quest_mailbox_title` / `quest_mailbox_body` — **cao nhất**
2. Quest `metadata["mailbox_title"]` / `metadata["mailbox_body"]` — chỉ có hiệu lực khi `override_game_delivery = true`
3. System default — `"Quest Reward: {tên quest}"` / `"You have completed '{tên quest}'. Claim your rewards!"`

Tham chiếu logic ở BE: [quest.go](../../internal/domain/quest.go) `RewardDeliveryMode` và [quest_usecase.go](../../internal/services/implementations/quest_usecase.go) `buildQuestRewardMailboxMessage`.

## 2. UI cần làm gì

### 2a. Game Settings — cài đặt mặc định toàn game

Trong trang **Game Settings**, thêm radio group cho `quest_reward_delivery`:

```
Cách trao thưởng mặc định (áp dụng cho tất cả quest)
  ◉ Gửi vào hộp thư (khuyên dùng)
  ○ Trao thẳng cho người chơi
```

Khi chọn **Hộp thư**, hiển thị thêm hai trường tuỳ chọn bên dưới:

```
Tiêu đề thư mặc định  [___________________________]  (bỏ trống = dùng mặc định hệ thống)
Nội dung thư mặc định [___________________________]  (bỏ trống = dùng mặc định hệ thống)
```

Gửi tất cả qua `PATCH /api/v1/studios/{studio_id}/games/{game_id}` với `settings`:

```ts
// Khi delivery = "mailbox"
const settings = {
  quest_reward_delivery: "mailbox",
  quest_mailbox_title: titleInput || "",   // "" = xoá game default, BE dùng system default
  quest_mailbox_body:  bodyInput  || "",
};

// Khi delivery = "direct"
const settings = {
  quest_reward_delivery: "direct",
  // không gửi quest_mailbox_title / quest_mailbox_body
  // (hoặc gửi "" để clear về trống)
};
```

### 2b. Quest Builder — override per quest

Quest **mặc định follow game setting**. Chỉ khi studio bật cờ override mới có thể cài đặt khác.

**Bước 1**: Thêm toggle "Ghi đè cài đặt game":

```
[ ] Ghi đè cài đặt game cho quest này
```

Khi toggle OFF (mặc định): không gửi `override_game_delivery`, `reward_delivery`, `mailbox_title`, `mailbox_body` trong metadata — quest hoàn toàn theo game setting.

Khi toggle ON: hiển thị thêm:

```
Cách trao thưởng
  ◉ Gửi vào hộp thư
  ○ Trao thẳng cho người chơi

(nếu chọn Hộp thư)
Tiêu đề thư  [___________________________]  (bỏ trống = dùng game default)
Nội dung thư [___________________________]  (bỏ trống = dùng game default)
```

**Mapping sang metadata khi toggle ON**:

```ts
// Toggle ON + mailbox
const metadata = {
  ...existingMetadata,
  override_game_delivery: true,
  reward_delivery: "mailbox",
  // mailbox_title / mailbox_body chỉ thêm nếu user nhập
  ...(title ? { mailbox_title: title } : {}),
  ...(body  ? { mailbox_body:  body  } : {}),
};

// Toggle ON + direct
const metadata = {
  ...existingMetadata,
  override_game_delivery: true,
  reward_delivery: "direct",
  // xóa mailbox_title / mailbox_body nếu có
};

// Toggle OFF (xóa toàn bộ override keys)
const { override_game_delivery, reward_delivery, mailbox_title, mailbox_body, ...rest } = existingMetadata;
// gửi { metadata: rest }
```

> ⚠️ **Quan trọng — không ghi đè metadata**: `metadata` trong `UpdateQuestDefinitionInput` **replace toàn bộ object** khi non-nil. FE phải fetch metadata hiện tại rồi merge, không gửi chỉ 1 key.

```ts
const metadata = {
  ...existingMetadata,
  reward_delivery: "mailbox",
  mailbox_title: "Chúc mừng! Phần thưởng đang chờ bạn",
  mailbox_body: "Bạn đã hoàn thành nhiệm vụ. Vào hòm thư để nhận phần thưởng!",
};
```

## 3. Endpoints

### Tạo quest mới

`POST /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions`

**Mặc định**: quest follow game setting (không cần gửi gì thêm). Nếu muốn override:

Request (ví dụ quest override với **Hộp thư** và nội dung tuỳ chỉnh):

```json
{
  "code_name": "daily_login",
  "name": "Đăng nhập hằng ngày",
  "quest_type": "daily",
  "conditions": { "...": "..." },
  "rewards": [ { "reward_type": "coin", "amount": 500 } ],
  "is_active": true,
  "metadata": {
    "override_game_delivery": true,
    "reward_delivery": "mailbox",
    "mailbox_title": "Phần thưởng hằng ngày của bạn!",
    "mailbox_body": "Cảm ơn bạn đã đăng nhập hôm nay. Vào hòm thư để nhận coin!"
  }
}
```

Request (quest override — **Trao thẳng**):

```json
{
  "code_name": "daily_login",
  "name": "Đăng nhập hằng ngày",
  "quest_type": "daily",
  "conditions": { "...": "..." },
  "rewards": [ { "reward_type": "coin", "amount": 500 } ],
  "is_active": true,
  "metadata": {
    "override_game_delivery": true,
    "reward_delivery": "direct"
  }
}
```

Request (quest theo game setting — không cần metadata delivery):

```json
{
  "code_name": "daily_login",
  "name": "Đăng nhập hằng ngày",
  "quest_type": "daily",
  "conditions": { "...": "..." },
  "rewards": [ { "reward_type": "coin", "amount": 500 } ],
  "is_active": true
}
```

Sample response:

```json
{
  "id": "7b1f...",
  "code_name": "daily_login",
  "rewards": [ { "reward_type": "coin", "amount": 500 } ],
  "metadata": { "override_game_delivery": true, "reward_delivery": "direct" },
  "is_active": true
}
```

### Sửa quest sẵn có

`PUT /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}`

Request body chỉ gửi các field cần đổi. Khi đổi reward delivery hoặc nội dung thư, **luôn gửi đủ metadata cũ + các key mới**:

```json
{
  "metadata": {
    "reset_timezone": "Asia/Ho_Chi_Minh",
    "reward_delivery": "mailbox",
    "mailbox_title": "Tiêu đề tuỳ chỉnh",
    "mailbox_body": "Nội dung tuỳ chỉnh"
  }
}
```

Sample response: giống như tạo mới, với metadata đã cập nhật.

## 4. Hiển thị giá trị hiện tại khi edit

### Quest Builder

Khi load quest để edit:

```ts
const isOverriding = quest.metadata?.override_game_delivery === true;

// Toggle state
// isOverriding = true  → hiện radio + title/body inputs
// isOverriding = false → ẩn, chỉ hiện hint "Đang theo game: [mailbox/direct]"

const effectiveMode = isOverriding
  ? (quest.metadata?.reward_delivery ?? game.settings.quest_reward_delivery ?? "mailbox")
  : (game.settings.quest_reward_delivery ?? "mailbox");

// Title/body (chỉ dùng để pre-fill inputs khi isOverriding=true)
const title = quest.metadata?.mailbox_title ?? "";
const body  = quest.metadata?.mailbox_body  ?? "";
// Placeholder khi trống: game default → system default
const titlePlaceholder = game.settings.quest_mailbox_title || "Quest Reward: {tên quest}";
const bodyPlaceholder  = game.settings.quest_mailbox_body  || "You have completed '{tên quest}'. Claim your rewards!";
```

Khi user tắt toggle override: xóa toàn bộ override keys khỏi metadata:

```ts
const { override_game_delivery, reward_delivery, mailbox_title, mailbox_body, ...rest } = existingMetadata;
// gửi { metadata: rest }
```

### Game Settings

```ts
const gameDelivery = game.settings?.quest_reward_delivery ?? "mailbox";
const gameTitle    = game.settings?.quest_mailbox_title   ?? "";
const gameBody     = game.settings?.quest_mailbox_body    ?? "";
```

Hiển thị `gameTitle` / `gameBody` trong input fields của Game Settings (tuỳ chọn, bỏ trống = hệ thống tự sinh). Ẩn hai trường này khi `gameDelivery === "direct"`.

`mailbox_title` và `mailbox_body` (ở cả cấp game và cấp quest) chỉ cần hiển thị / cho phép chỉnh sửa khi mode cuối cùng là `"mailbox"`. Khi `"direct"`, ẩn tất cả các trường liên quan đến nội dung thư.

## 5. Gợi ý UX

- Mặc định game: **Hộp thư** — an toàn hơn, player không bỏ lỡ thưởng kể cả khi offline / inventory đầy.
- Dùng **Trao thẳng** ở cấp game khi toàn bộ game muốn phản hồi tức thì (ví dụ: idle game, casual game thưởng nhỏ liên tục).
- Quest Builder nên hiển thị hint: *"Đang theo mặc định game: [Hộp thư / Trao thẳng]"* để studio member biết quest sẽ thực sự dùng mode gì khi không override.
- Có thể thêm tooltip: *"Trao thẳng: coin được cộng sau khi giao dịch DB hoàn tất (best-effort). Nếu cần đảm bảo 100% giao đủ, hãy chọn Hộp thư."*
- Placeholder cho `mailbox_title`: `"Quest Reward: {tên quest}"` — giúp studio thấy giá trị mặc định trước khi nhập.
- Placeholder cho `mailbox_body`: `"You have completed '{tên quest}'. Claim your rewards!"`.

## 6. Tổng kết 1 dòng cho developer

> **Game Settings** là cao nhất: `settings.quest_reward_delivery` + `quest_mailbox_title` / `quest_mailbox_body` áp dụng cho toàn game. **Quest Builder**: chỉ override được khi set `metadata.override_game_delivery = true`; khi không có flag này, game setting luôn thắng.
