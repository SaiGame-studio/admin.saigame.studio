import { useState, useEffect, useRef } from "react";
import { fetchGameItemProfiles } from "@/lib/item-profile-api";
interface CacheEntry {
    data: any[];
    timestamp: number;
    searchQuery?: string;
}
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = "item_profiles_cache_";
export function useItemProfilesCache(gameId: string) {
    const [itemProfiles, setItemProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
    // Generate cache key based on gameId and search query
    const getCacheKey = (searchQuery?: string) => {
        return searchQuery ? `${gameId}_${searchQuery}` : gameId;
    };
    // Check if cache entry is still valid
    const isCacheValid = (entry: CacheEntry, searchQuery?: string) => {
        const now = Date.now();
        // If search query changed, invalidate cache
        if (searchQuery && entry.searchQuery !== searchQuery) {
            return false;
        }
        return (now - entry.timestamp) < CACHE_DURATION;
    };
    // Load from cache
    const loadFromCache = (searchQuery?: string) => {
        const cacheKey = getCacheKey(searchQuery);
        const cached = cacheRef.current.get(cacheKey);
        if (cached && isCacheValid(cached, searchQuery)) {
            setItemProfiles(cached.data);
            return true;
        }
        return false;
    };
    // Save to cache
    const saveToCache = (data: any[], searchQuery?: string) => {
        const cacheKey = getCacheKey(searchQuery);
        cacheRef.current.set(cacheKey, {
            data,
            timestamp: Date.now(),
            searchQuery
        });
    };
    // Clear cache for this game (called when user re-enters the page)
    const clearCache = () => {
        cacheRef.current.clear();
        // Also clear from localStorage if we're using persistent storage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    };
    // Fetch item profiles with caching
    const loadItemProfiles = async (searchQuery?: string) => {
        setLoading(true);
        setError(null);
        try {
            // First try to load from memory cache
            if (loadFromCache(searchQuery)) {
                setLoading(false);
                return;
            }
            // If not in cache or cache expired, fetch from API
            const profiles = await fetchGameItemProfiles(gameId, searchQuery);
            setItemProfiles(profiles);
            saveToCache(profiles, searchQuery);
        }
        catch (err: any) {
            console.error("Failed to fetch item profiles:", err);
            setError(err.message || "Failed to load item profiles");
        }
        finally {
            setLoading(false);
        }
    };
    // Initialize cache on mount
    useEffect(() => {
        // Load initial data without search query
        loadItemProfiles();
    }, [gameId]);
    return {
        itemProfiles,
        loading,
        error,
        loadItemProfiles,
        clearCache
    };
}
