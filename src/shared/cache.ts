// Centralized cache manager for the Woolsocks extension
// Supports multi-tier caching (memory + persistent storage), configurable TTL,
// and cache statistics tracking

import { trackCacheHit, trackCacheMiss } from '../background/analytics'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  etag?: string
  hitCount?: number
}

export interface CacheConfig {
  ttl: number // TTL in milliseconds
  namespace: string
  storageType: 'memory' | 'persistent' | 'both'
  refreshOnAccess?: boolean // Whether to trigger background refresh when accessed
  maxMemoryEntries?: number // LRU eviction limit for memory cache
}

export interface CacheStats {
  hits: number
  misses: number
  totalRequests: number
  hitRate: number
  memoryEntries: number
  persistentEntries: number
  totalSize: number // Approximate size in bytes
}

// In-memory cache storage (per service worker lifetime)
const memoryCache = new Map<string, CacheEntry<any>>()

// LRU tracking for memory cache eviction
const lruQueue: string[] = []

// Cache statistics
const stats = {
  hits: 0,
  misses: 0,
}

// Default configurations for different cache namespaces
export const CACHE_NAMESPACES = {
  WALLET: 'wallet',
  TRANSACTIONS: 'transactions',
  USER_PROFILE: 'user_profile',
  PARTNER_INFO: 'partner_info',
  MERCHANT_SEARCH: 'merchant_search',
  PARTNER_CONFIG: 'partner_config',
} as const

export const DEFAULT_CONFIGS: Record<string, Partial<CacheConfig>> = {
  [CACHE_NAMESPACES.WALLET]: {
    ttl: 15 * 60 * 1000, // 15 minutes
    storageType: 'both',
    refreshOnAccess: true,
  },
  [CACHE_NAMESPACES.TRANSACTIONS]: {
    ttl: 10 * 60 * 1000, // 10 minutes
    storageType: 'both',
    refreshOnAccess: true,
  },
  [CACHE_NAMESPACES.USER_PROFILE]: {
    ttl: 30 * 60 * 1000, // 30 minutes
    storageType: 'persistent',
  },
  [CACHE_NAMESPACES.PARTNER_INFO]: {
    ttl: 60 * 60 * 1000, // 60 minutes
    storageType: 'both',
    maxMemoryEntries: 50,
  },
  [CACHE_NAMESPACES.MERCHANT_SEARCH]: {
    ttl: 30 * 60 * 1000, // 30 minutes
    storageType: 'both',
    maxMemoryEntries: 100,
  },
  [CACHE_NAMESPACES.PARTNER_CONFIG]: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    storageType: 'persistent',
  },
}

/**
 * Generate a cache key from namespace and identifier
 */
function getCacheKey(namespace: string, key: string): string {
  return `__ws_cache_${namespace}_${key}`
}

/**
 * Get persistent storage key for cache namespace
 */
function getStorageKey(namespace: string): string {
  return `__ws_cache_store_${namespace}`
}

/**
 * Check if a cache entry is still valid
 */
function isValid<T>(entry: CacheEntry<T>): boolean {
  if (!entry) return false
  const age = Date.now() - entry.timestamp
  return age < entry.ttl
}

/**
 * Update LRU queue for memory cache
 */
function updateLRU(key: string, maxEntries: number = 50): void {
  // Remove key if it exists
  const index = lruQueue.indexOf(key)
  if (index > -1) {
    lruQueue.splice(index, 1)
  }
  
  // Add to front (most recently used)
  lruQueue.unshift(key)
  
  // Evict least recently used if over limit
  if (lruQueue.length > maxEntries) {
    const evictKey = lruQueue.pop()
    if (evictKey) {
      memoryCache.delete(evictKey)
    }
  }
}

/**
 * Get data from cache (checks memory first, then persistent storage)
 */
export async function get<T>(
  namespace: string,
  key: string,
  config?: Partial<CacheConfig>
): Promise<T | null> {
  const mergedConfig = { ...DEFAULT_CONFIGS[namespace], ...config } as CacheConfig
  const cacheKey = getCacheKey(namespace, key)
  
  // Check memory cache first
  if (mergedConfig.storageType === 'memory' || mergedConfig.storageType === 'both') {
    const memEntry = memoryCache.get(cacheKey)
    if (memEntry && isValid(memEntry)) {
      stats.hits++
      updateLRU(cacheKey, mergedConfig.maxMemoryEntries)
      memEntry.hitCount = (memEntry.hitCount || 0) + 1
      
      // Track cache hit
      try {
        const age = Date.now() - memEntry.timestamp
        trackCacheHit(namespace, key, age)
      } catch {}
      
      return memEntry.data as T
    }
  }
  
  // Check persistent storage
  if (mergedConfig.storageType === 'persistent' || mergedConfig.storageType === 'both') {
    try {
      const storageKey = getStorageKey(namespace)
      const result = await chrome.storage.local.get(storageKey)
      const store = result[storageKey] || {}
      const entry: CacheEntry<T> = store[key]
      
      if (entry && isValid(entry)) {
        stats.hits++
        
        // Track cache hit
        try {
          const age = Date.now() - entry.timestamp
          trackCacheHit(namespace, key, age)
        } catch {}
        
        // Promote to memory cache if using both
        if (mergedConfig.storageType === 'both') {
          memoryCache.set(cacheKey, entry)
          updateLRU(cacheKey, mergedConfig.maxMemoryEntries)
        }
        
        return entry.data as T
      }
    } catch (error) {
      console.warn('[Cache] Error reading from persistent storage:', error)
    }
  }
  
  stats.misses++
  
  // Track cache miss
  try {
    trackCacheMiss(namespace, key, 'not_found')
  } catch {}
  
  return null
}

/**
 * Set data in cache
 */
export async function set<T>(
  namespace: string,
  key: string,
  data: T,
  config?: Partial<CacheConfig>
): Promise<void> {
  const mergedConfig = { ...DEFAULT_CONFIGS[namespace], ...config } as CacheConfig
  const cacheKey = getCacheKey(namespace, key)
  
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: mergedConfig.ttl,
    hitCount: 0,
  }
  
  // Store in memory cache
  if (mergedConfig.storageType === 'memory' || mergedConfig.storageType === 'both') {
    memoryCache.set(cacheKey, entry)
    updateLRU(cacheKey, mergedConfig.maxMemoryEntries)
  }
  
  // Store in persistent storage
  if (mergedConfig.storageType === 'persistent' || mergedConfig.storageType === 'both') {
    try {
      const storageKey = getStorageKey(namespace)
      const result = await chrome.storage.local.get(storageKey)
      const store = result[storageKey] || {}
      store[key] = entry
      await chrome.storage.local.set({ [storageKey]: store })
    } catch (error) {
      console.warn('[Cache] Error writing to persistent storage:', error)
    }
  }
}

/**
 * Invalidate a specific cache entry
 */
export async function invalidate(namespace: string, key: string): Promise<void> {
  const cacheKey = getCacheKey(namespace, key)
  
  // Remove from memory
  memoryCache.delete(cacheKey)
  
  const index = lruQueue.indexOf(cacheKey)
  if (index > -1) {
    lruQueue.splice(index, 1)
  }
  
  // Remove from persistent storage
  try {
    const storageKey = getStorageKey(namespace)
    const result = await chrome.storage.local.get(storageKey)
    const store = result[storageKey] || {}
    delete store[key]
    await chrome.storage.local.set({ [storageKey]: store })
  } catch (error) {
    console.warn('[Cache] Error invalidating from persistent storage:', error)
  }
}

/**
 * Invalidate all entries in a namespace
 */
export async function invalidateNamespace(namespace: string): Promise<void> {
  // Remove all matching keys from memory
  const prefix = `__ws_cache_${namespace}_`
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key)
      const index = lruQueue.indexOf(key)
      if (index > -1) {
        lruQueue.splice(index, 1)
      }
    }
  }
  
  // Clear persistent storage for namespace
  try {
    const storageKey = getStorageKey(namespace)
    await chrome.storage.local.remove(storageKey)
  } catch (error) {
    console.warn('[Cache] Error clearing namespace from persistent storage:', error)
  }
}

/**
 * Clear all caches
 */
export async function clearAll(): Promise<void> {
  // Clear memory
  memoryCache.clear()
  lruQueue.length = 0
  
  // Clear all persistent cache storage
  try {
    const allKeys = await chrome.storage.local.get(null)
    const cacheKeys = Object.keys(allKeys).filter(k => k.startsWith('__ws_cache_store_'))
    if (cacheKeys.length > 0) {
      await chrome.storage.local.remove(cacheKeys)
    }
  } catch (error) {
    console.warn('[Cache] Error clearing all caches:', error)
  }
  
  // Reset stats
  stats.hits = 0
  stats.misses = 0
}

/**
 * Get cache statistics
 */
export async function getStats(): Promise<CacheStats> {
  const totalRequests = stats.hits + stats.misses
  const hitRate = totalRequests > 0 ? stats.hits / totalRequests : 0
  
  // Count persistent entries
  let persistentEntries = 0
  let totalSize = 0
  
  try {
    const allKeys = await chrome.storage.local.get(null)
    for (const [key, value] of Object.entries(allKeys)) {
      if (key.startsWith('__ws_cache_store_')) {
        const store = value as Record<string, CacheEntry<any>>
        persistentEntries += Object.keys(store).length
        totalSize += JSON.stringify(value).length
      }
    }
  } catch (error) {
    console.warn('[Cache] Error calculating stats:', error)
  }
  
  return {
    hits: stats.hits,
    misses: stats.misses,
    totalRequests,
    hitRate,
    memoryEntries: memoryCache.size,
    persistentEntries,
    totalSize,
  }
}

/**
 * Cleanup expired entries from persistent storage
 */
export async function cleanupExpired(): Promise<number> {
  let removed = 0
  
  try {
    const allKeys = await chrome.storage.local.get(null)
    
    for (const [storageKey, value] of Object.entries(allKeys)) {
      if (!storageKey.startsWith('__ws_cache_store_')) continue
      
      const store = value as Record<string, CacheEntry<any>>
      const cleaned: Record<string, CacheEntry<any>> = {}
      
      for (const [key, entry] of Object.entries(store)) {
        if (isValid(entry)) {
          cleaned[key] = entry
        } else {
          removed++
        }
      }
      
      // Only update if something was removed
      if (removed > 0) {
        if (Object.keys(cleaned).length > 0) {
          await chrome.storage.local.set({ [storageKey]: cleaned })
        } else {
          await chrome.storage.local.remove(storageKey)
        }
      }
    }
  } catch (error) {
    console.warn('[Cache] Error cleaning up expired entries:', error)
  }
  
  return removed
}

/**
 * Restore memory cache from persistent storage on startup
 */
export async function restoreFromPersistent(namespaces: string[]): Promise<void> {
  for (const namespace of namespaces) {
    const config = DEFAULT_CONFIGS[namespace]
    if (!config || config.storageType === 'memory') continue
    
    try {
      const storageKey = getStorageKey(namespace)
      const result = await chrome.storage.local.get(storageKey)
      const store = result[storageKey] || {}
      
      for (const [key, entry] of Object.entries(store)) {
        if (isValid(entry as CacheEntry<any>)) {
          const cacheKey = getCacheKey(namespace, key)
          memoryCache.set(cacheKey, entry as CacheEntry<any>)
          updateLRU(cacheKey, config.maxMemoryEntries)
        }
      }
    } catch (error) {
      console.warn(`[Cache] Error restoring namespace ${namespace}:`, error)
    }
  }
}

/**
 * Wrapper for cached API calls with automatic cache management
 */
export async function cachedFetch<T>(
  namespace: string,
  key: string,
  fetcher: () => Promise<T>,
  config?: Partial<CacheConfig>
): Promise<T> {
  // Try to get from cache first
  const cached = await get<T>(namespace, key, config)
  if (cached !== null) {
    return cached
  }
  
  // Fetch fresh data
  const data = await fetcher()
  
  // Store in cache
  await set(namespace, key, data, config)
  
  return data
}

