Tạo gift code (mã đổi quà) cho game và cho người chơi đổi mã trong Unity. Gift code của Sai Server mở một hoặc nhiều **gacha pack** cho người chơi. Server kiểm tra thời gian hiệu lực, giới hạn lượt dùng và việc người chơi đã đổi mã hay chưa, nên mỗi người chơi chỉ đổi một mã được một lần.

**Trong bài này bạn sẽ:**
- tạo gift code liên kết với gacha pack,
- chọn mã dùng một lần, giới hạn lượt hoặc không giới hạn, kèm ngày bắt đầu và kết thúc,
- đổi mã trong Unity bằng component `GiftCodeRedeemer`,
- theo dõi ai đã đổi mã.

## Chuẩn bị

- Ít nhất một gacha pack chứa phần thưởng (xem [Open Gacha Pack](/tutorials/guides/open-gacha-pack)). Reward destination của pack (Mailbox hoặc Direct Inventory) quyết định phần thưởng được giao về đâu.
- Một người chơi đã đăng nhập và có Gamer Progress trong Unity (xem [Create Gamer Progress](/tutorials/guides/create-gamer-progress)).

## Bước 1: Tạo gift code

1. Mở **Items** trong dashboard của game và chọn tab **Giftcodes**.

![Tab Giftcodes trên trang Items](/tutorial-guides/gift-codes/giftcodes-tab.png)

2. Tạo mã mới và điền form:

| Trường | Mô tả |
|---|---|
| **Code** | Chuỗi người chơi nhập, ví dụ `SUMMER2024`. Không đổi được sau khi tạo. |
| **Description** | Ghi chú nội bộ cho team. |
| **Linked Gacha Packs** | Các pack được mở khi đổi mã. Yêu cầu chìa khóa được bỏ qua, người chơi không cần key. |
| **Max Uses** | **Single use (1 person)**, **Limited uses** (nhập số lượt) hoặc **Unlimited (everyone can redeem)**. |
| **Active At** | Thời điểm mã bắt đầu dùng được. |
| **Expires At** | Thời điểm mã hết hạn. Để trống nếu không có ngày kết thúc. |

3. Lưu mã.

![Form Create Gift Code đã điền ví dụ](/tutorial-guides/gift-codes/create-form.png)


**Kết quả mong đợi:** mã xuất hiện trong **Game Giftcodes** với trạng thái **Active**, **Scheduled** (Active At ở tương lai), **Inactive**, **Expired** hoặc **Depleted** (đã hết lượt).

![Danh sách Game Giftcodes với nhãn trạng thái](/tutorial-guides/gift-codes/status-list.png)


## Bước 2: Đổi mã trong Unity

1. Vào **Play Mode** và đăng nhập bằng một người chơi.
2. Chọn component `GiftCodeRedeemer` dưới object `SaiServer`.
3. Nhập mã vào **Default Gift Code** và nhấn **Redeem Gift Code**.

> 🖼️ **CHỖ ĐẶT ẢNH** · `/tutorial-guides/gift-codes/redeemer-inspector.png`  
> Cần chụp: component `GiftCodeRedeemer` trong Inspector ở Play Mode, đã nhập `SUMMER2024` vào **Default Gift Code**.  
> ⚙️ **Cần chụp trong Unity:** bạn chụp thủ công trong Unity Editor (Play Mode).


**Kết quả mong đợi:** Inspector hiện **Total Items Granted** và **Total Gacha Rolls** cùng kết quả gacha. Phần thưởng được giao vào Mailbox hoặc inventory tùy reward destination của từng pack.

> 🖼️ **CHỖ ĐẶT ẢNH** · `/tutorial-guides/gift-codes/redeem-result.png`  
> Cần chụp: Inspector sau khi đổi mã thành công, hiện **Total Items Granted**, **Total Gacha Rolls** và kết quả gacha.  
> ⚙️ **Cần chụp trong Unity:** bạn chụp thủ công trong Unity Editor (Play Mode).


Bằng code, ví dụ từ nút "Đổi mã" trong màn hình cài đặt:

```csharp
using SaiGame.Services;
using UnityEngine;

public class RedeemCodeButton : MonoBehaviour
{
    [SerializeField] private GiftCodeRedeemer redeemer;

    public void Redeem(string code)
    {
        redeemer.Redeem(code.Trim(),
            result => Debug.Log($"Redeemed: {result.total_items_granted} items"),
            error => Debug.LogWarning($"Cannot redeem: {error}"));
    }
}
```

Mã được so khớp **chính xác**, nên `summer2024` và `SUMMER2024` là hai mã khác nhau. Hãy hướng dẫn người chơi cách nhập, hoặc chuyển chuỗi nhập vào cho khớp với cách bạn tạo mã.

## Bước 3: Xem ai đã đổi mã

Mở mã trong tab **Giftcodes** và xem **redemptions**. Mỗi dòng gồm người chơi và thời điểm đổi. Số lượt đã dùng cho biết còn bao nhiêu lượt.

![Hộp thoại Giftcode Redemptions](/tutorial-guides/gift-codes/redemptions.png)


Mã đã được đổi ít nhất một lần thì không xóa được. Hãy chuyển sang inactive hoặc để mã hết hạn.

## Lỗi khi đổi mã

| Kết quả | Nguyên nhân |
|---|---|
| **404** gift code not found or invalid | Mã không tồn tại trong game này, hoặc nhập khác chữ hoa/thường. |
| **403** gift code cannot be claimed | Mã đang inactive hoặc chưa đến giờ hiệu lực, đã hết hạn, đã hết lượt, hoặc người chơi đã đổi mã này. |

## Lỗi thường gặp

- **Báo "not found" dù mã có tồn tại.** Kiểm tra chính tả và chữ hoa/thường, và Unity đang dùng đúng Game ID của game sở hữu mã.
- **Người chơi không thấy gì trong inventory.** Kiểm tra Mailbox. Pack có thể giao phần thưởng vào Mailbox.
- **Mã chỉ dùng được cho một người.** Max Uses đang là **Single use (1 person)**. Dùng **Unlimited** cho mã công khai.

## Câu hỏi thường gặp

### Một người chơi có đổi cùng một gift code hai lần được không?
Không. Mỗi người chơi chỉ đổi một mã một lần, kể cả khi mã không giới hạn lượt.

### Làm sao tạo mã cho mọi người chơi?
Đặt **Max Uses** là **Unlimited (everyone can redeem)** và đặt ngày **Expires At** cho chiến dịch.

### Gift code tặng được những gì?
Gift code mở các gacha pack được liên kết. Hãy đặt phần thưởng cụ thể vào pack, ví dụ một pack chỉ có một vật phẩm cố định, để tặng phần thưởng chắc chắn.

## Bước tiếp theo

- [What is Gacha Pack?](/tutorials/guides/what-is-gacha-pack)
- [Send an item to a player](/tutorials/guides/5b-send-an-item-to-a-player)
