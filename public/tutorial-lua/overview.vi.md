## **Giới hạn**
| Giới hạn | Giá trị |
|---|---|
| Thời gian thực thi tối đa | 500 ms |
| Độ sâu ngăn xếp lời gọi tối đa | 200 khung |
| Kích thước mã script tối đa | 32 KB |
| Số khóa `output` tối đa | 64 |
| Số dòng `game.log` tối đa | 100 |
| Số script tối đa mỗi game | 200 |

---

## Biến toàn cục

Các biến này được tự động đưa vào trước khi script chạy.

| Tên | Kiểu | Mô tả |
|---|---|---|
| `payload` | table | JSON tùy ý do bên gọi gửi qua `POST .../run`. Theo quy ước chỉ dùng để đọc. |
| `ctx` | table | Ngữ cảnh thực thi. Luôn chứa `player_id`, `game_id`, `studio_id`, `timestamp` (giây Unix). Có thể chứa các khóa bổ sung do máy chủ đưa vào như `ctx.pack`. |
| `output` | table | Script ghi kết quả vào đây. Tất cả khóa được trả về cho bên gọi. Tối đa 64 khóa. |

### C?c tr??ng c?a `ctx`

| Trường | Kiểu | Mô tả |
|---|---|---|
| `ctx.player_id` | string | UUID của người chơi đã xác thực. |
| `ctx.game_id` | string | UUID của game hiện tại. |
| `ctx.studio_id` | string | UUID của studio hiện tại. |
| `ctx.timestamp` | number | Thời điểm Unix phía máy chủ (giây) khi bắt đầu thực thi. |

---

## Các thư viện chuẩn có sẵn

| Thư viện | Các hàm được cung cấp |
|---|---|
| `base` | `print`, `pairs`, `ipairs`, `type`, `tostring`, `tonumber`, `unpack`, `select`, `pcall`, `xpcall`, `error`, `assert`, `rawget`, `rawset`, `rawequal`, `next`, `setmetatable`, `getmetatable` |
| `table` | `table.insert`, `table.remove`, `table.concat`, `table.sort`, `table.unpack` |
| `string` | `string.format`, `string.sub`, `string.len`, `string.upper`, `string.lower`, `string.rep`, `string.reverse`, `string.byte`, `string.char`, `string.find`, `string.match`, `string.gmatch`, `string.gsub` |
| `math` | `math.abs`, `math.ceil`, `math.floor`, `math.sqrt`, `math.random`, `math.randomseed`, `math.max`, `math.min`, `math.huge`, `math.pi`, v.v. |

---

### `game.log(msg)`

Thêm thông báo vào nhật ký thực thi script (được thu thập và trả về trong `ScriptRunResult.logs`).  
`print(msg)` là bí danh của hàm này.

```lua
game.log("damage dealt: " .. damage)
print("player hp: " .. hp)  -- same effect
```

**Tham số**

| # | Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | `msg` | string | có | Thông báo cần ghi vào nhật ký. |

**Trả về:** không có giá trị

