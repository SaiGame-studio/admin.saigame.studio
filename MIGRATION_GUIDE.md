# Token Expiration Migration Guide

## Vấn đề đã giải quyết

Trước đây, token được lưu trữ trong localStorage mà không có kiểm tra thời gian hết hạn. Điều này có nghĩa là:
- Token không bao giờ hết hạn nếu không có timestamp
- Người dùng có thể sử dụng token cũ vô thời hạn
- Không có cảnh báo khi token sắp hết hạn
- Không có xử lý tự động khi token hết hạn

## Giải pháp đã triển khai

### 1. Token Management Utilities (`lib/auth-utils.ts`)
- `saveToken(token)`: Lưu token với thông tin expiration
- `getValidToken()`: Lấy token chỉ khi còn hiệu lực
- `isTokenExpired()`: Kiểm tra token có hết hạn không
- `clearToken()`: Xóa tất cả dữ liệu token

### 2. Enhanced AuthContext
- Tự động kiểm tra token expiration mỗi phút
- Cung cấp `timeUntilExpiration` để theo dõi thời gian còn lại
- Tự động logout khi token hết hạn

### 3. Token Expiration Warning Component
- Hiển thị cảnh báo khi token sắp hết hạn (< 30 phút)
- Đếm ngược thời gian real-time
- Nút renew session

### 4. API Client với Auto Token Handling
- Tự động kiểm tra token validity trước mỗi request
- Xử lý 401 responses và redirect đến login
- Centralized error handling

## Cách migration

### Bước 1: Thay thế localStorage.getItem("token")

**Trước:**
```typescript
const token = localStorage.getItem("token")
if (!token) {
  throw new Error("Authentication required")
}
```

**Sau:**
```typescript
import { getValidToken } from "@/lib/auth-utils"

const token = getValidToken()
if (!token) {
  throw new Error("Authentication required")
}
```

Hoặc sử dụng hook:
```typescript
import { useAuthTokenOrThrow } from "@/hooks/use-auth-token"

const token = useAuthTokenOrThrow() // Throws if invalid
```

### Bước 2: Thay thế localStorage.setItem("token")

**Trước:**
```typescript
localStorage.setItem("token", tokenValue)
```

**Sau:**
```typescript
import { saveToken } from "@/lib/auth-utils"

saveToken(tokenValue)
```

### Bước 3: Sử dụng API Client mới (Recommended)

**Trước:**
```typescript
const response = await fetch(`${API_URL}/api/item-profiles/${profileId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  },
})
```

**Sau:**
```typescript
import { api } from "@/lib/api-client"

const data = await api.get(`/api/item-profiles/${profileId}`)
```

### Bước 4: Thêm TokenExpirationWarning vào layout

```typescript
import { TokenExpirationWarning } from "@/components/token-expiration-warning"

export default function Layout({ children }) {
  return (
    <div>
      <TokenExpirationWarning />
      {children}
    </div>
  )
}
```

## Các tính năng mới

### 1. JWT Expiration Detection
- Tự động phát hiện expiration time từ JWT token
- Fallback về default 24h nếu không có exp claim

### 2. Automatic Token Cleanup
- Token hết hạn được xóa tự động
- Không còn token "zombie" trong localStorage

### 3. User Experience Improvements
- Cảnh báo trước khi hết hạn
- Smooth logout experience
- Automatic redirect đến login

### 4. Security Enhancements
- Centralized token validation
- Consistent expiration checking
- Reduced risk of sử dụng expired tokens

## Backward Compatibility

Hệ thống mới vẫn tương thích với token cũ:
- Existing tokens sẽ được migrate sang format mới
- `localStorage.getItem("token")` vẫn hoạt động nhưng không recommended
- Gradual migration được khuyến khích

## Best Practices

1. **Luôn sử dụng `getValidToken()` thay vì direct localStorage access**
2. **Sử dụng API client mới cho tất cả API calls**
3. **Thêm TokenExpirationWarning vào main layout**
4. **Handle ApiError trong các components**
5. **Test với token có expiration time khác nhau**

## Files cần update

1. Tất cả API functions trong `lib/` folder
2. Components gọi API trực tiếp
3. Main layout để thêm expiration warning
4. Error boundaries để handle ApiError

## Testing

1. Test với token hợp lệ
2. Test với token hết hạn
3. Test với token không có exp claim
4. Test warning UI khi token sắp hết hạn
5. Test auto-logout functionality 