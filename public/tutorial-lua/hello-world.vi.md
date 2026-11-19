Viết và chạy **script Lua phía server** đầu tiên trên Sai Server, rồi gọi nó từ Unity. Script Lua chạy luật chơi trên server, nơi người chơi không thể sửa. Mỗi script đọc `payload` từ client và trả về `output`.

**Trong bài này bạn sẽ:**
- tạo script Lua trong web editor,
- tải mẫu Hello World và chạy với payload thử,
- chạy cùng script từ Unity bằng `BattleScript`,
- quản lý file script từ Unity bằng `LuaScriptManager`.

## Chuẩn bị

- Một game trên Sai Server (xem [Tạo Studio](/tutorials/guides/create-a-studio)).
- Cho phần Unity: dự án Unity đã kết nối và có người chơi đăng nhập (xem [Cài Unity Package](/tutorials/guides/import-unity-package)).

Mỗi game có sẵn **7 slot script**. Bộ đếm ở đầu trang **Scripts** cho biết bạn đã dùng bao nhiêu. Plugin có thể tăng giới hạn này.

![Trang Scripts với bộ đếm slot](/tutorial-lua/hello-world/step-00.png)

## Bước 1: Tạo script

1. Mở **Scripts** trong dashboard của game và nhấn **New Script**.
2. Nhập tên, ví dụ `hello_world`. Tên phải bắt đầu bằng chữ cái và chỉ gồm chữ thường, chữ số và dấu gạch dưới. Đây là **trigger key** mà game client dùng để chạy script.

![Tạo script Lua mới](/tutorial-lua/hello-world/step-01.png)

3. Nhấn biểu tượng **Edit** (cây bút) trong danh sách script để mở web Lua editor.

![Mở Lua editor](/tutorial-lua/hello-world/step-02.png)

> **Lưu ý:** giữ công tắc **Active** ở trạng thái bật. Script inactive không chạy được.

## Bước 2: Tải mẫu Hello World

Editor có hai phần:
- **Script Body** – nơi viết code. Lỗi cú pháp được tô sáng khi gõ, thanh dung lượng cho biết bạn đã dùng bao nhiêu trong giới hạn **250 KB**.
- **Sample Scripts** – ở bên phải. Mở tab **Core** và chọn `#1 tut_hello_output`. Công tắc **Replace / Append** quyết định mẫu sẽ thay thế code hiện tại hay được thêm vào cuối.

![Sample Scripts với tut_hello_output](/tutorial-lua/hello-world/step-03.png)

Nhấn **Ctrl+S** hoặc biểu tượng **Save** sau mỗi lần sửa.

Mẫu trông như sau:

```lua
-- 'payload' is the input table sent by the client.
local player_name = payload.player_name or "stranger"

-- 'output' is returned to the client.
output.greeting  = "Hello, " .. player_name .. "!"
output.processed = true

-- game.log() writes to the script log.
game.log("tut_hello_output ran for: " .. player_name)
```

## Bước 3: Chạy script trong editor

1. Cuộn xuống **Run Script**.
2. Xem nhãn cạnh nút **Run**. Script chạy dưới tài khoản của bạn, nên bạn cần một player profile trong game này. Nếu nhãn là **No profile**, nhấn **Create profile**. Nút **Run** bật khi nhãn hiện **Profile ready**.

![Tạo player profile trước khi chạy](/tutorial-lua/hello-world/step-04-profile.png)

3. Nhập payload sau và nhấn **Run**:

```json
{
  "payload": {
    "player_name": "Alice"
  }
}
```

**Kết quả mong đợi:** **Run Result** hiện `"greeting": "Hello, Alice!"` và `"processed": true` cùng thời gian chạy tính bằng mili giây. Bỏ `player_name` và chạy lại sẽ nhận `"Hello, stranger!"`.

![Run Result của script Hello World](/tutorial-lua/hello-world/step-04.png)

> **Mẹo:** nhấn **Ctrl+S** trong ô payload (hoặc biểu tượng **Save** của nó) để giữ payload cho lần sau.

## Bước 4: Chạy script từ Unity

1. Vào **Play Mode** và đăng nhập.
2. Chọn component `BattleScript` trên object `SaiServer`.
3. Đặt **Script Name** là `hello_world` và dán cùng request body.
4. Nhấn **Run Script**.

**Kết quả mong đợi:** **JSON Response** giống trên web editor, gồm `output`, `logs` và `duration_ms`.

![Chạy script Lua từ Unity](/tutorial-lua/hello-world/step-05.png)

Bằng code:

```csharp
using SaiGame.Services;
using UnityEngine;

public class HelloLua : MonoBehaviour
{
    public void Run()
    {
        SaiServer.Instance.BattleScript.RunScript(
            "hello_world",
            "{\"payload\":{\"player_name\":\"Alice\"}}",
            json => Debug.Log(json),
            error => Debug.LogError(error));
    }
}
```

## Bước 5 (tùy chọn): Quản lý script từ Unity

Component `LuaScriptManager` lưu script thành file `.lua` trong `Assets/SaiGame/LuaScript/Scripts`, để bạn sửa bằng code editor và đưa vào version control.

- **Load Scripts** – liệt kê script trên server và khớp với file local.
- **Download** – lưu script trên server thành file local.
- **Upload New** – tạo script trên server từ file local.
- **Update** – đẩy file local lên script đã có trên server.
- **Create BattleStart script**, **Create BattleEnd script**, **Create Custom script** – tạo file script mới. Tên file theo cùng quy tắc: `^[a-z][a-z0-9_]*$`.

## Giới hạn runtime Lua

| Giới hạn | Giá trị |
|---|---|
| Thời gian chạy | 500 ms mỗi lần |
| Kích thước script | 250 KB |
| Số script mỗi game | 7 mặc định (plugin có thể thêm) |

Script chạy quá 500 ms sẽ bị dừng. Xem [Tổng quan Lua API](/tutorials/lua-guides/overview) để biết mọi giới hạn runtime và các hàm có sẵn.

## Lỗi thường gặp

- **Script not found.** Tên trong Unity phải khớp chính xác với tên script.
- **Script is inactive.** Bật lại công tắc **Active**.
- **Nút Run bị tắt.** Nhãn đang là **No profile**. Nhấn **Create profile**.
- **Output trống.** Kiểm tra request body có object `payload` và bạn đã lưu script trước khi chạy.
- **Script bị dừng.** Script chạy quá 500 ms. Đưa phần xử lý nặng ra khỏi vòng lặp hoặc chia ra nhiều lần gọi.

## Câu hỏi thường gặp

### Vì sao nên chạy logic game bằng Lua trên server?
Server chạy luật chơi, nên người chơi không thể sửa phần thưởng, sát thương hay tỉ lệ rơi đồ bằng cách chỉnh client.

### Một game có bao nhiêu script Lua?
7 mặc định. Plugin có thể thêm.

### Script Lua có tặng vật phẩm cho người chơi được không?
Được. Dùng các hàm inventory như `grant_item` và `deduct_item`. Xem [các hàm Lua inventory](/tutorials/lua-guides/inventory).

## Bước tiếp theo

- [Enemy Definition](/tutorials/lua-guides/enemy-definition)
- [Execute Script](/tutorials/lua-guides/execute-script)
