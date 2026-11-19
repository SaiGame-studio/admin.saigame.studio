Gửi vật phẩm cho người chơi qua **Mailbox** trong game và nhận vật phẩm trong Unity. Mailbox là cách phát phần thưởng, đền bù và quà tặng trên Sai Server: bạn đính kèm vật phẩm vào thư trong trang quản trị, người chơi nhận (claim) từ game client, rồi server thêm vật phẩm vào inventory của người chơi.

**Trong bài này bạn sẽ:**
- gửi thư có đính kèm vật phẩm từ trang quản trị,
- tải và nhận thư trong Unity bằng component `Mailbox`,
- kiểm tra vật phẩm đã vào inventory của người chơi.

## Chuẩn bị

- Một Item Definition để gửi (xem [What is Item Definition?](/tutorials/guides/what-is-item-definition)).
- Một người chơi đã có Gamer Progress trong game (xem [Create Gamer Progress](/tutorials/guides/create-gamer-progress)).

## Bước 1: Mở hồ sơ người chơi

1. Mở **Players** trong dashboard của game.
2. Chọn người chơi.
3. Mở tab **Items** và ghi nhận các vật phẩm hiện có. Người chơi test mới sẽ chưa có vật phẩm nào.

![Tab Items trong hồ sơ người chơi](/tutorial-guides/5b-send-an-item-to-a-player/step-01.png)

## Bước 2: Gửi thư có đính kèm

1. Trong hồ sơ người chơi đó, mở tab **Mail**. Player ID được điền sẵn.
2. Ở mục **Attachments**, chọn vật phẩm và số lượng.
3. Viết tiêu đề và nội dung, rồi nhấn **Send**.

![Tab Mail trong hồ sơ người chơi](/tutorial-guides/5b-send-an-item-to-a-player/step-02.png)

**Kết quả mong đợi:** danh sách **Player Mailbox** hiện thư mới với trạng thái **unread** và **unclaimed**.

![Thư mới ở trạng thái unread và unclaimed](/tutorial-guides/5b-send-an-item-to-a-player/step-03.png)

## Bước 3: Nhận vật phẩm trong Unity

1. Vào **Play Mode** và đăng nhập bằng người chơi đó.
2. Chọn component `Mailbox` trên object `SaiServer`.
3. Nhấn **Load Messages**. Mỗi thư có nhãn trạng thái: **[Unread]**, **[Read]**, **[Claimed]** hoặc **[Expired]**.
4. Nhấn **Claim** trên thư có đính kèm. Để nhận tất cả thư đã tải một lần, nhấn **Claim All**.

![Load Messages trong component Mailbox](/tutorial-guides/5b-send-an-item-to-a-player/step-04.png)

![Nhận vật phẩm đính kèm](/tutorial-guides/5b-send-an-item-to-a-player/step-05.png)

Dùng **Unread Count** và **Unclaimed Count** để hiện huy hiệu thông báo trong giao diện game.

Luồng tương tự bằng code:

```csharp
using SaiGame.Services;
using UnityEngine;

public class MailboxExample : MonoBehaviour
{
    public void ClaimFirstMail()
    {
        Mailbox mailbox = SaiServer.Instance.Mailbox;
        mailbox.GetMessages(null, null,
            response =>
            {
                if (response.messages == null || response.messages.Length == 0) return;
                string messageId = response.messages[0].id;
                mailbox.ClaimMessage(messageId,
                    claimed => Debug.Log("Claimed"),
                    error => Debug.LogError(error));
            },
            error => Debug.LogError(error));
    }

    // Call after Load Messages / GetMessages: claims every loaded mail with an unclaimed attachment.
    public void ClaimEverything()
    {
        SaiServer.Instance.Mailbox.ClaimAllMessages(
            claimed => Debug.Log($"Claimed {claimed.Length} mails"),
            error => Debug.LogError(error));
    }
}
```

## Bước 4: Kiểm tra vật phẩm trong inventory

1. Quay lại hồ sơ người chơi trong trang quản trị.
2. Làm mới tab **Items**.

**Kết quả mong đợi:** vật phẩm đính kèm xuất hiện trong inventory của người chơi.

![Vật phẩm đã nhận hiển thị trong tab Items](/tutorial-guides/5b-send-an-item-to-a-player/step-06.png)

## Vì sao nên phát vật phẩm qua Mailbox?

- **Server là bên cấp vật phẩm.** Game client chỉ gửi yêu cầu nhận, không tự tạo ra vật phẩm.
- **Người chơi thấy rõ mình nhận được gì.** Mỗi thư có tiêu đề và nội dung, ví dụ "Đền bù bảo trì".
- **Nhiều tính năng dùng chung.** Gacha pack, item generator và phần thưởng nhiệm vụ có thể giao vào Mailbox thay vì thẳng vào inventory.

## Lỗi thường gặp

- **Load Messages không trả về gì.** Kiểm tra bạn đăng nhập đúng người chơi đã được gửi thư, trong đúng game.
- **Không thấy nút Claim.** Thư không có đính kèm. Nút Claim chỉ hiện với thư có đính kèm.
- **Vật phẩm không xuất hiện sau khi nhận.** Làm mới tab **Items**. Nếu inventory đầy, server sẽ trả lỗi hết chỗ chứa.

## Câu hỏi thường gặp

### Làm sao tặng vật phẩm cho một người chơi trên Sai Server?
Mở hồ sơ người chơi, dùng tab **Mail** gửi thư có đính kèm vật phẩm, rồi để người chơi nhận trong game.

### Người chơi có nhận tất cả thư một lần được không?
Được. Tải thư trước, sau đó **Claim All** (hoặc `ClaimAllMessages` trong code) sẽ nhận mọi thư đã tải còn đính kèm chưa nhận.

### Phần thưởng có bỏ qua Mailbox được không?
Được. Một số tính năng như gacha pack và nhiệm vụ có thể giao thẳng vào inventory chính. Xem [What is Gacha Pack?](/tutorials/guides/what-is-gacha-pack).

## Bước tiếp theo

- [What is Container?](/tutorials/guides/what-is-container)
- [Tạo và đổi Gift Code](/tutorials/guides/gift-codes)
