Lưu tiến trình người chơi lên đám mây và tải lại trên mọi thiết bị bằng Sai Server Unity SDK. Kinh nghiệm và vàng được cập nhật bằng delta phía server. Dữ liệu save riêng của bạn được lưu dạng JSON trong **Game Data**. Người chơi đăng nhập cùng tài khoản trên Android, iOS hay PC đều chơi tiếp được từ chỗ đã dừng.

> **⚠️ Gamer Progress không chống hack.** Tính năng này chủ yếu dành cho các game, nhất là game offline, muốn lưu save game lên cloud.

**Trong bài này bạn sẽ:**
- cộng kinh nghiệm và vàng bằng delta,
- lưu và tải trạng thái game dạng JSON,
- tải cùng bản save trên thiết bị thứ hai,
- nắm các giới hạn của cloud save.

## Chuẩn bị

- Người chơi đã đăng nhập và có Gamer Progress trong game (xem [Create Gamer Progress](/tutorials/guides/create-gamer-progress)).
- Progress đã được tải bằng **Create Progress** hoặc **Get Progress** trong phiên hiện tại. Nếu chưa, mọi cập nhật sẽ bị từ chối.

## Bước 1: Cập nhật kinh nghiệm và vàng bằng delta

Delta cộng thêm vào giá trị hiện tại trên server thay vì ghi đè. Hai phiên cùng cộng vàng một lúc thì cả hai đều được tính.

1. Trên component `GamerProgress`, nhập số lượng trong mục **Update Delta Values**.
2. Nhấn **Update Progress (+XP, +Gold)**.

![Update Delta Values trong component GamerProgress](/tutorial-guides/cross-platform-save/step-01.png)

```csharp
// Add 150 XP and spend 20 gold. The current Game Data is kept.
SaiServer.Instance.GamerProgress.UpdateProgress(150, -20, null,
    data => Debug.Log($"Level {data.level}, Gold {data.gold}"),
    error => Debug.LogError(error));
```

Server kiểm tra các quy tắc sau:
- **Delta kinh nghiệm:** từ 0 đến 1.000.000. Không thể giảm kinh nghiệm.
- **Delta vàng:** từ -1.000.000 đến 1.000.000. Vàng không bao giờ âm, khoản trừ lớn hơn số dư sẽ dừng ở 0.
- **Level** được tính lại từ kinh nghiệm sau mỗi lần cập nhật.

## Bước 2: Lưu trạng thái game dạng JSON

**Game Data** là trường JSON không cố định cấu trúc. Bạn lưu được mọi cấu trúc cần thiết như checkpoint, cài đặt hay các tutorial đã hoàn thành.

```json
{
  "last_checkpoint": "dungeon_level_07",
  "inventory": {
    "potions": 5,
    "equipped_weapon": "iron_sword_plus_1"
  },
  "tutorials_completed": ["movement", "combat_basics"],
  "settings": {
    "difficulty": "hard",
    "invert_y": false
  }
}
```

Trong Inspector, dán JSON vào ô Game Data (dùng **Beautify JSON** để định dạng) rồi nhấn **Update Progress**. Trong code, truyền chuỗi JSON làm tham số thứ ba:

```csharp
string saveJson = JsonUtility.ToJson(mySaveState);
SaiServer.Instance.GamerProgress.UpdateProgress(0, 0, saveJson,
    data => Debug.Log("Saved to the cloud"),
    error => Debug.LogError(error));
```

![Game Data JSON được lưu trên Gamer Progress](/tutorial-guides/cross-platform-save/step-02.png)

## Bước 3: Tải bản save trên thiết bị khác

1. Trên thiết bị thứ hai, đăng nhập bằng **cùng tài khoản**.
2. Gọi **Get Progress**.
3. Đọc save bằng `GamerProgress.GetGameData()` và khôi phục trạng thái game.

```csharp
SaiServer.Instance.GamerProgress.GetProgress(
    data =>
    {
        string json = SaiServer.Instance.GamerProgress.GetGameData();
        MySaveState state = JsonUtility.FromJson<MySaveState>(json);
        // Apply the state to your game.
    },
    error => Debug.LogError(error));
```

**Kết quả mong đợi:** thiết bị thứ hai hiển thị đúng level, kinh nghiệm, vàng và Game Data như thiết bị đầu.

## Xử lý xung đột

- **Kinh nghiệm và vàng** dùng delta với optimistic locking. Nếu hai lần cập nhật xảy ra cùng lúc, server tự thử lại. Nếu vẫn không được, server trả **409** "concurrent update conflict, please retry".
- **Game Data** được thay thế toàn bộ mỗi lần lưu, lần lưu sau cùng sẽ thắng. Sai Server không gộp hai bản JSON khác nhau. Nếu người chơi có thể chơi trên hai thiết bị cùng lúc, hãy tải progress mới nhất trước khi lưu, hoặc giữ các giá trị quan trọng trong kinh nghiệm, vàng hay vật phẩm.
- SDK **không có đồng bộ offline**. Hãy lưu khi thiết bị có mạng và tự thử lại các lần lưu thất bại trong game.

## Giới hạn

| Giới hạn | Giá trị |
|---|---|
| Kích thước Game Data | 2,5 MiB JSON sau khi serialize |
| Delta kinh nghiệm mỗi lần | 0 đến 1.000.000 |
| Delta vàng mỗi lần | -1.000.000 đến 1.000.000 |

Bản save lớn hơn 2,5 MiB sẽ lỗi **413** với message code `GAME_DATA_TOO_LARGE`.

## Lỗi thường gặp

- **"invalid experience delta".** Delta kinh nghiệm âm hoặc lớn hơn 1.000.000.
- **413 `GAME_DATA_TOO_LARGE`.** Giảm kích thước save. Lưu nội dung lớn hoặc dùng chung ở nơi khác, Game Data chỉ nên chứa trạng thái.
- **409 concurrent update conflict.** Thử cập nhật lại.
- **Thiết bị thứ hai hiển thị dữ liệu cũ.** Gọi **Get Progress** sau khi đăng nhập. SDK không tự đẩy thay đổi sang thiết bị khác.

## Câu hỏi thường gặp

### Người chơi có chơi tiếp cùng một save trên Android, iOS và PC được không?
Được. Progress gắn với tài khoản và game, không gắn với thiết bị. Đăng nhập cùng tài khoản rồi gọi Get Progress.

### Cloud save có được gộp giữa các thiết bị không?
Không. Thay đổi kinh nghiệm và vàng được cộng dồn trên server, còn Game Data bị thay bằng bản lưu mới nhất.

### Cloud save lớn tối đa bao nhiêu?
Tối đa 2,5 MiB JSON cho mỗi người chơi trong mỗi game.

## Bước tiếp theo

- [What is Item Definition?](/tutorials/guides/what-is-item-definition)
- [Send an item to a player](/tutorials/guides/5b-send-an-item-to-a-player)
