Biến một user đã đăng nhập thành người chơi của game bằng **Gamer Progress**. Gamer Progress là bản ghi lưu game theo từng game mà Sai Server giữ cho mỗi người chơi: level, kinh nghiệm, vàng và dữ liệu JSON riêng của bạn. Chỉ cần tạo một lần, sau đó tải lại mỗi khi người chơi mở game.

> **⚠️ Gamer Progress không chống hack.** Tính năng này chủ yếu dành cho các game, nhất là game offline, muốn lưu save game lên cloud.

**Trong bài này bạn sẽ:**
- tạo Gamer Progress cho user đang đăng nhập,
- tải lại bằng Get Progress,
- hiểu sự khác nhau giữa Gamer Profile và Gamer Progress.

## Chuẩn bị

- Dự án Unity đã kết nối Sai Server, có user đăng nhập qua `SaiAuth` hoặc Google.

Tài khoản bạn dùng để tạo studio và game cũng có thể đăng nhập và chơi game của bạn, rất tiện để làm người chơi test.

## Bước 1: Tạo Gamer Progress

1. Đăng nhập, rồi chọn component `GamerProgress` trên object `SaiServer`.
2. Nhấn **Create Progress**.

**Kết quả mong đợi:** nếu tài khoản chưa là người chơi của game, Console báo thành công và component hiển thị progress mới.

![Tạo Gamer Progress trong Unity](/tutorial-guides/create-gamer-progress/step-01.png)

## Bước 2: Tải Gamer Progress

Nhấn **Get Progress** để tải dữ liệu đã lưu của người chơi vào game.

![Get Gamer Progress trong Unity](/tutorial-guides/create-gamer-progress/step-02.png)

Trong code, tải progress sau khi đăng nhập và tạo mới nếu là người chơi mới:

```csharp
using SaiGame.Services;
using UnityEngine;

public class LoadPlayerSave : MonoBehaviour
{
    public void LoadOrCreate()
    {
        GamerProgress progress = SaiServer.Instance.GamerProgress;
        progress.GetProgress(
            data => Debug.Log($"Level {data.level}, XP {data.experience}, Gold {data.gold}"),
            error => progress.CreateProgress(
                data => Debug.Log("New player created"),
                createError => Debug.LogError(createError)));
    }
}
```

Dữ liệu đã tải nằm trong `GamerProgress.CurrentProgress`. Bạn phải tải hoặc tạo progress trước khi cập nhật.

## Bước 3 (tùy chọn): Xóa Gamer Progress

**Clear Progress** xóa progress của người chơi hiện tại trong game này.

> **Cảnh báo:** thao tác này xóa vĩnh viễn dữ liệu chơi của người chơi trong game và không thể khôi phục. Chỉ dùng khi test.

![Xóa Gamer Progress](/tutorial-guides/create-gamer-progress/step-03.png)

## Gamer Progress lưu những gì?

| Trường | Mô tả |
|---|---|
| `level` | Server tính từ kinh nghiệm: `floor(sqrt(experience / 100))`, tối thiểu là 1. |
| `experience` | Tổng kinh nghiệm, cập nhật bằng delta phía server. |
| `gold` | Số vàng, cập nhật bằng delta phía server và không bao giờ âm. |
| `game_data` | Dữ liệu save JSON của bạn (xem [Lưu game đám mây đa nền tảng](/tutorials/guides/cross-platform-save)). |
| `version` | Tăng sau mỗi lần cập nhật progress. |

## Gamer Profile và Gamer Progress

- **Gamer Profile** – được tạo tự động khi user vào một game bất kỳ lần đầu. Mỗi user chỉ có **một** Gamer Profile toàn hệ thống.
- **Gamer Progress** – mỗi **game** một bản ghi. Một user có thể có Gamer Progress ở nhiều game.

![Gamer Profile được tạo tự động](/tutorial-guides/create-gamer-progress/step-04.png)

Để xem progress của một người chơi, mở **Players** trong dashboard của game và chọn người chơi đó.

![Tìm Gamer Progress của người chơi trong dashboard](/tutorial-guides/create-gamer-progress/step-05.png)

## Lỗi thường gặp

- **Get Progress lỗi với người chơi mới.** User chưa có progress trong game này. Gọi **Create Progress** trước.
- **Update Progress báo cần tải dữ liệu trước.** Gọi `CreateProgress` hoặc `GetProgress` thành công trước khi gọi `UpdateProgress`.
- **"You are banned from this game".** Progress của người chơi đã bị cấm từ dashboard nên không thể cập nhật.

## Câu hỏi thường gặp

### Khi nào user trở thành người chơi của game?
Khi Gamer Progress của user đó được tạo trong game. Chỉ đăng nhập thì chưa phải là người chơi.

### Level của người chơi được tính thế nào?
Server tính từ kinh nghiệm theo công thức `floor(sqrt(experience / 100))`. Level tối thiểu là 1.

### Một tài khoản có chơi được nhiều game không?
Có. Một tài khoản có một Gamer Profile và một Gamer Progress riêng cho mỗi game.

## Bước tiếp theo

- [Lưu game đám mây đa nền tảng](/tutorials/guides/cross-platform-save)
- [Send an item to a player](/tutorials/guides/5b-send-an-item-to-a-player)
