Hiển thị bảng xếp hạng trong game Unity bằng component `Leaderboard` của Sai Server. Bạn có thể liệt kê các bảng của game, tải top người chơi và hiện thứ hạng của người chơi hiện tại. Điểm do server ghi nhận, nên người chơi không thể gửi điểm giả từ client.

**Trong bài này bạn sẽ:**
- liệt kê mọi leaderboard của game,
- tải top N người chơi của một bảng,
- hiện thứ hạng và điểm của người chơi đang đăng nhập.

## Chuẩn bị

- Ít nhất một leaderboard đã tạo cho game (xem [Leaderboard](/tutorials/guides/15a-leaderboard)). Leaderboard cần gói đăng ký **Rare** cho game.
- Một người chơi đã đăng nhập trong Unity.

## Điểm được đưa vào leaderboard thế nào

Game client không gửi điểm. **Score source** của mỗi bảng quyết định cái gì được tính:

- `gacha_pack_open_count` – +1 mỗi lần người chơi mở gacha pack đã chọn.
- `item_collected_count` – +số lượng mỗi lần người chơi nhận vật phẩm đã chọn, qua cấp trực tiếp vào inventory hoặc nhận từ mailbox.

Server ghi nhận các sự kiện này và một worker chạy nền sẽ cộng vào bảng. Điểm mới có thể mất một chút thời gian mới hiện ra.

## Bước 1: Liệt kê leaderboard

1. Vào **Play Mode** và đăng nhập.
2. Chọn component `Leaderboard` trên object `SaiServer`.
3. Nhấn **List Boards**.

**Kết quả mong đợi:** **Board List** hiện mọi leaderboard của game, kể cả bảng đang tắt, kèm key, score mode và score source.

![Liệt kê leaderboard trong Unity Inspector](/tutorial-guides/leaderboard-for-player/step-01.png)

Nhấn **Get Board** trên một bảng để tải lại thông tin. **Clear Boards** xóa danh sách đã tải.

## Bước 2: Tải top người chơi

1. Dưới một bảng, đặt **Top N** là số người chơi muốn lấy.
2. Nhấn **Get Top N**.

Server trả về **100** người chơi mặc định và tối đa **500**. Giá trị lớn hơn sẽ bị giảm về 500.

![Lấy top người chơi của leaderboard](/tutorial-guides/leaderboard-for-player/step-02.png)

## Bước 3: Hiện thứ hạng của người chơi

Nhấn **My Rank** dưới một bảng để tải thứ hạng, điểm và mùa hiện tại của người chơi đang đăng nhập.

![My Rank hiển thị thứ hạng và điểm](/tutorial-guides/leaderboard-for-player/step-03.png)

## Dùng leaderboard bằng code

```csharp
using SaiGame.Services;
using UnityEngine;

public class LeaderboardPanel : MonoBehaviour
{
    [SerializeField] private string boardKey = "weekly_chest";

    public void Refresh()
    {
        Leaderboard leaderboard = SaiServer.Instance.Leaderboard;
        leaderboard.ListBoards(boards =>
        {
            LeaderboardBoard board = leaderboard.GetBoardByKey(boardKey);
            if (board == null) return;

            leaderboard.GetTopRankings(board.id, 10, top =>
            {
                foreach (LeaderboardRankingEntry entry in top.entries)
                    Debug.Log($"#{entry.rank} {entry.user_id} {entry.score}");
            }, e => Debug.LogError(e));

            leaderboard.GetLocalRanking(board.id,
                me => Debug.Log($"My rank: #{me.rank} ({me.score})"),
                e => Debug.LogError(e));
        }, e => Debug.LogError(e));
    }
}
```

## Lỗi thường gặp

- **Danh sách không có bảng nào.** Tạo leaderboard trong trang quản trị trước, và kiểm tra game đã có gói đăng ký cần thiết.
- **My Rank trống.** Người chơi chưa có điểm ở bảng này. Mở gacha pack hoặc nhận vật phẩm được liên kết để có điểm.
- **Điểm chưa thay đổi.** Điểm được cộng bởi worker chạy nền. Đợi một chút rồi tải lại.
- **Chỉ trả về 500 người chơi.** 500 là mức tối đa cho một lần gọi.

## Câu hỏi thường gặp

### Người chơi có tự gửi điểm từ Unity được không?
Không. Điểm chỉ đến từ sự kiện phía server, như mở gacha pack hay nhận vật phẩm. Nhờ vậy client không thể gửi điểm giả.

### Leaderboard hiển thị được bao nhiêu người chơi?
Tối đa 500 mỗi lần gọi, mặc định là 100.

### Leaderboard có reset theo ngày hoặc tuần được không?
Được. Mỗi bảng có lịch reset (never, daily, weekly, monthly hoặc season). Xem [Leaderboard](/tutorials/guides/15a-leaderboard).

## Bước tiếp theo

- [Leaderboard Admin Page](/tutorials/guides/leaderboard-admin-page)
- [Event Type](/tutorials/guides/event-type)
