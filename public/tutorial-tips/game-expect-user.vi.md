Người chơi có thể đang đăng nhập **tài khoản A** trong game nhưng lại đăng nhập **tài khoản B** trên Sai Play. Khi game đưa họ sang Sai Play để mua hoặc nạp, giao dịch sẽ vào tài khoản đang đăng nhập trên web, không phải tài khoản trong game.

Thêm `game_expect_user` vào link, Sai Play sẽ cảnh báo người chơi khi hai tài khoản khác nhau.

## Định dạng link

```
https://play.saigame.studio/<trang>?game_expect_user=<user_id>
```

| Tham số | Bắt buộc | Giá trị |
|---|---|---|
| `game_expect_user` | Không | ID (UUID) của người dùng đang đăng nhập trong game |

Tham số dùng được ở **mọi** trang của Sai Play, ví dụ:

| Trang | Đường dẫn |
|---|---|
| Trang game | `/games/{game_id}` |
| Vật phẩm | `/games/{game_id}/items` |
| Danh sách shop | `/games/{game_id}/shops` |
| Một shop | `/games/{game_id}/shops/{shop_id}` |
| Nạp sGem | `/sgem` |

## Sai Play xử lý thế nào

- **Không có `game_expect_user`, hoặc giá trị không phải UUID:** trang hoạt động bình thường.
- **Cùng tài khoản:** không hiện gì.
- **Khác tài khoản:** hiện cảnh báo ngay dưới header, kèm tên và email (đã che bớt) của tài khoản trên web. Người chơi có thể **đăng xuất và đăng nhập lại** (xong sẽ quay về đúng trang cũ) hoặc **giữ tài khoản này**.
- **Chưa đăng nhập:** sau khi người chơi đăng nhập, hai tài khoản sẽ được so sánh.

![Cảnh báo của Sai Play khi tài khoản web khác tài khoản trong game](/tutorial-tips/game-expect-user-warning.png)

Sai Play xóa tham số khỏi thanh địa chỉ và ghi nhớ nó cho tới khi đóng tab trình duyệt.

## Ví dụ trong Unity

```csharp
using System;
using UnityEngine;
using SaiGame.Services;

public static class SaiPlayLinks
{
    private const string SaiPlayUrl = "https://play.saigame.studio";

    public static void OpenShop(string shopId)
    {
        string url = $"{SaiPlayUrl}/games/{SaiServer.Instance.GameId}/shops/{shopId}";

        // Add the signed-in user so Sai Play can warn about a different web account.
        UserData user = SaiServer.Instance.CurrentUser;
        if (user != null && !string.IsNullOrEmpty(user.id))
            url += "?game_expect_user=" + Uri.EscapeDataString(user.id);

        Application.OpenURL(url);
    }
}
```

## Lưu ý

- Dùng `?` khi link chưa có tham số nào, dùng `&` khi link đã có tham số khác.
- Chỉ gửi ID của người dùng **đang** đăng nhập trong game.
- Tham số này chỉ dùng để cảnh báo. Nó không đăng nhập hay đăng xuất ai và không cấp quyền gì vào tài khoản.
