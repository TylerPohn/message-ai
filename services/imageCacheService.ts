import * as FileSystem from 'expo-file-system/legacy'

interface CacheEntry {
  uri: string
  timestamp: number
  size: number
}

export class ImageCacheService {
  private static readonly CACHE_DIR = FileSystem.cacheDirectory + 'images/'
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
  private static cacheIndex: Map<string, CacheEntry> = new Map()

  // Initialize cache service
  static async initialize(): Promise<void> {
    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR)
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, {
          intermediates: true
        })
      }

      // Load existing cache index
      await this.loadCacheIndex()
    } catch (error) {
      console.error('Error initializing image cache:', error)
    }
  }

  // Load cache index from directory
  private static async loadCacheIndex(): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR)

      for (const file of files) {
        const filePath = this.CACHE_DIR + file
        const fileInfo = await FileSystem.getInfoAsync(filePath)

        if (fileInfo.exists) {
          const cacheKey = file.replace('.jpg', '')
          this.cacheIndex.set(cacheKey, {
            uri: filePath,
            timestamp: fileInfo.modificationTime || Date.now(),
            size: fileInfo.size || 0
          })
        }
      }
    } catch (error) {
      console.error('Error loading cache index:', error)
    }
  }

  // Get cached image if exists
  static async getCachedImage(cacheKey: string): Promise<string | null> {
    try {
      const entry = this.cacheIndex.get(cacheKey)
      if (!entry) {
        return null
      }

      // Check if file still exists
      const fileInfo = await FileSystem.getInfoAsync(entry.uri)
      if (!fileInfo.exists) {
        this.cacheIndex.delete(cacheKey)
        return null
      }

      // Update access time
      entry.timestamp = Date.now()
      return entry.uri
    } catch (error) {
      console.error('Error getting cached image:', error)
      return null
    }
  }

  // Cache an image
  static async cacheImage(imageURL: string, cacheKey: string): Promise<string> {
    try {
      const cachedPath = this.CACHE_DIR + cacheKey + '.jpg'

      // Download and cache the image
      const downloadResult = await FileSystem.downloadAsync(
        imageURL,
        cachedPath
      )

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(cachedPath)
      const size = fileInfo.exists ? fileInfo.size || 0 : 0

      // Add to cache index
      this.cacheIndex.set(cacheKey, {
        uri: cachedPath,
        timestamp: Date.now(),
        size
      })

      // Check cache size and clean up if needed
      await this.cleanupCacheIfNeeded()

      return cachedPath
    } catch (error) {
      console.error('Error caching image:', error)
      throw error
    }
  }

  // Get or cache image (returns cached if exists, otherwise downloads and caches)
  static async getOrCacheImage(
    imageURL: string,
    cacheKey: string
  ): Promise<string> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedImage(cacheKey)
      if (cached) {
        return cached
      }

      // Not in cache, download and cache it
      return await this.cacheImage(imageURL, cacheKey)
    } catch (error) {
      console.error('Error getting or caching image:', error)
      throw error
    }
  }

  // Clean up cache if it exceeds size limit
  private static async cleanupCacheIfNeeded(): Promise<void> {
    try {
      // Calculate total cache size
      let totalSize = 0
      for (const entry of this.cacheIndex.values()) {
        totalSize += entry.size
      }

      // If cache is within limits, no cleanup needed
      if (totalSize <= this.MAX_CACHE_SIZE) {
        return
      }

      // Sort entries by timestamp (oldest first)
      const sortedEntries = Array.from(this.cacheIndex.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      )

      // Remove oldest entries until we're under the limit
      let currentSize = totalSize
      for (const [cacheKey, entry] of sortedEntries) {
        if (currentSize <= this.MAX_CACHE_SIZE) {
          break
        }

        try {
          await FileSystem.deleteAsync(entry.uri, { idempotent: true })
          this.cacheIndex.delete(cacheKey)
          currentSize -= entry.size
        } catch (error) {
          console.error('Error deleting cached file:', error)
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error)
    }
  }

  // Clear all cached images
  static async clearCache(): Promise<void> {
    try {
      // Delete all files in cache directory
      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR)
      for (const file of files) {
        await FileSystem.deleteAsync(this.CACHE_DIR + file, {
          idempotent: true
        })
      }

      // Clear cache index
      this.cacheIndex.clear()
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  // Get cache statistics
  static getCacheStats(): { totalSize: number; fileCount: number } {
    let totalSize = 0
    for (const entry of this.cacheIndex.values()) {
      totalSize += entry.size
    }

    return {
      totalSize,
      fileCount: this.cacheIndex.size
    }
  }

  // Generate cache key from URL
  static generateCacheKey(imageURL: string): string {
    // Create a hash-like key from the URL
    const urlParts = imageURL.split('/')
    const fileName = urlParts[urlParts.length - 1]
    return fileName.replace(/[^a-zA-Z0-9]/g, '_')
  }
}
