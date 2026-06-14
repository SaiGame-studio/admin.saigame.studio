/**
 * Cache utility with expiry support for localStorage
 */
interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresIn: number; // in milliseconds
}
const CACHE_PREFIX = 'ss_cache_';
/**
 * Set data in cache with expiry time
 * @param key Cache key
 * @param data Data to cache
 * @param expiresIn Expiry time in milliseconds (default: 24 hours)
 */
export function setCacheItem<T>(key: string, data: T, expiresIn: number = 24 * 60 * 60 * 1000 // 24 hours default
): void {
    try {
        const cacheItem: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            expiresIn,
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
    }
    catch (error) {
        console.error('Failed to set cache item:', error);
    }
}
/**
 * Get data from cache if not expired
 * @param key Cache key
 * @returns Cached data or null if expired/not found
 */
export function getCacheItem<T>(key: string): T | null {
    try {
        const cached = localStorage.getItem(CACHE_PREFIX + key);
        if (!cached)
            return null;
        const cacheItem: CacheItem<T> = JSON.parse(cached);
        const now = Date.now();
        const isExpired = now - cacheItem.timestamp > cacheItem.expiresIn;
        if (isExpired) {
            // Remove expired item
            removeCacheItem(key);
            return null;
        }
        return cacheItem.data;
    }
    catch (error) {
        console.error('Failed to get cache item:', error);
        return null;
    }
}
/**
 * Remove a specific cache item
 * @param key Cache key
 */
export function removeCacheItem(key: string): void {
    try {
        localStorage.removeItem(CACHE_PREFIX + key);
    }
    catch (error) {
        console.error('Failed to remove cache item:', error);
    }
}
/**
 * Clear all cache items with our prefix
 */
export function clearAllCache(): void {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    }
    catch (error) {
        console.error('Failed to clear cache:', error);
    }
}
/**
 * Check if a cache item exists and is not expired
 * @param key Cache key
 */
export function hasCacheItem(key: string): boolean {
    return getCacheItem(key) !== null;
}
