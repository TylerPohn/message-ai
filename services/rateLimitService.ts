/**
 * Rate Limiting Service
 *
 * Client-side rate limiting using token bucket algorithm to prevent API abuse
 * and control costs for translations, messaging, RAG queries, and image uploads.
 *
 * Token Bucket Algorithm:
 * - Each operation type has a bucket with a max capacity
 * - Tokens refill at a constant rate
 * - Operations consume tokens; if no tokens available, operation is rate limited
 * - Persists state to AsyncStorage to track limits across app restarts
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

export type RateLimitType = 'translation' | 'message' | 'rag' | 'image'

interface RateLimitConfig {
  maxTokens: number // Maximum number of tokens in the bucket
  refillRate: number // Tokens added per second
  tokensPerOperation: number // Tokens consumed per operation
}

interface TokenBucket {
  tokens: number // Current available tokens
  lastRefill: number // Timestamp of last refill (ms)
}

// Rate limit configurations
const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  translation: {
    maxTokens: 30, // 30 translations per minute
    refillRate: 0.5, // Refill 0.5 tokens/second (30 per minute)
    tokensPerOperation: 1
  },
  message: {
    maxTokens: 60, // 60 messages per minute
    refillRate: 1, // Refill 1 token/second (60 per minute)
    tokensPerOperation: 1
  },
  rag: {
    maxTokens: 10, // 10 RAG queries per minute
    refillRate: 0.167, // Refill ~0.167 tokens/second (10 per minute)
    tokensPerOperation: 1
  },
  image: {
    maxTokens: 5, // 5 image uploads per minute
    refillRate: 0.083, // Refill ~0.083 tokens/second (5 per minute)
    tokensPerOperation: 1
  }
}

export class RateLimitService {
  private static buckets = new Map<string, TokenBucket>()
  private static initialized = false

  /**
   * Initialize the rate limit service by loading persisted state
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const storedBuckets = await AsyncStorage.getItem('rateLimitBuckets')
      if (storedBuckets) {
        const parsed = JSON.parse(storedBuckets)
        this.buckets = new Map(Object.entries(parsed))
        console.log('[RateLimitService] Loaded persisted rate limit state')
      }
      this.initialized = true
    } catch (error) {
      console.error('[RateLimitService] Failed to load persisted state:', error)
      // Continue with empty state
      this.initialized = true
    }
  }

  /**
   * Persist current bucket state to AsyncStorage
   */
  private static async persistState(): Promise<void> {
    try {
      const bucketsObj = Object.fromEntries(this.buckets.entries())
      await AsyncStorage.setItem('rateLimitBuckets', JSON.stringify(bucketsObj))
    } catch (error) {
      console.error('[RateLimitService] Failed to persist state:', error)
    }
  }

  /**
   * Get or create a token bucket for a specific user and operation type
   */
  private static getBucket(userId: string, type: RateLimitType): TokenBucket {
    const key = `${userId}:${type}`
    let bucket = this.buckets.get(key)

    if (!bucket) {
      const config = RATE_LIMIT_CONFIGS[type]
      bucket = {
        tokens: config.maxTokens,
        lastRefill: Date.now()
      }
      this.buckets.set(key, bucket)
    }

    return bucket
  }

  /**
   * Refill tokens based on time elapsed since last refill
   */
  private static refillTokens(bucket: TokenBucket, config: RateLimitConfig): void {
    const now = Date.now()
    const elapsedSeconds = (now - bucket.lastRefill) / 1000
    const tokensToAdd = elapsedSeconds * config.refillRate

    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }

  /**
   * Check if an operation is allowed for a user
   *
   * @param userId - User ID to check rate limit for
   * @param type - Type of operation (translation, message, etc.)
   * @returns Object with allowed status and details
   */
  static async checkRateLimit(
    userId: string,
    type: RateLimitType
  ): Promise<{
    allowed: boolean
    remainingTokens: number
    resetInSeconds: number
    message?: string
  }> {
    // Ensure initialized
    if (!this.initialized) {
      await this.initialize()
    }

    const config = RATE_LIMIT_CONFIGS[type]
    const bucket = this.getBucket(userId, type)

    // Refill tokens based on elapsed time
    this.refillTokens(bucket, config)

    const allowed = bucket.tokens >= config.tokensPerOperation

    if (allowed) {
      // Consume tokens
      bucket.tokens -= config.tokensPerOperation
      await this.persistState()

      return {
        allowed: true,
        remainingTokens: Math.floor(bucket.tokens),
        resetInSeconds: 0
      }
    } else {
      // Calculate time until next token is available
      const tokensNeeded = config.tokensPerOperation - bucket.tokens
      const secondsUntilReset = Math.ceil(tokensNeeded / config.refillRate)

      return {
        allowed: false,
        remainingTokens: 0,
        resetInSeconds: secondsUntilReset,
        message: this.getRateLimitMessage(type, secondsUntilReset)
      }
    }
  }

  /**
   * Get user-friendly rate limit message
   */
  private static getRateLimitMessage(type: RateLimitType, resetInSeconds: number): string {
    const typeLabels: Record<RateLimitType, string> = {
      translation: 'translations',
      message: 'messages',
      rag: 'AI queries',
      image: 'image uploads'
    }

    const label = typeLabels[type]
    const timeStr = resetInSeconds < 60
      ? `${resetInSeconds} second${resetInSeconds !== 1 ? 's' : ''}`
      : `${Math.ceil(resetInSeconds / 60)} minute${Math.ceil(resetInSeconds / 60) !== 1 ? 's' : ''}`

    return `Rate limit reached for ${label}. Please wait ${timeStr} before trying again.`
  }

  /**
   * Get current rate limit status for a user and operation type
   */
  static async getStatus(
    userId: string,
    type: RateLimitType
  ): Promise<{
    availableTokens: number
    maxTokens: number
    refillRate: number
  }> {
    if (!this.initialized) {
      await this.initialize()
    }

    const config = RATE_LIMIT_CONFIGS[type]
    const bucket = this.getBucket(userId, type)

    // Refill tokens without consuming
    this.refillTokens(bucket, config)

    return {
      availableTokens: Math.floor(bucket.tokens),
      maxTokens: config.maxTokens,
      refillRate: config.refillRate * 60 // Convert to tokens per minute for clarity
    }
  }

  /**
   * Reset rate limits for a specific user and operation type
   * Useful for testing or admin operations
   */
  static async resetRateLimit(userId: string, type: RateLimitType): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    const key = `${userId}:${type}`
    const config = RATE_LIMIT_CONFIGS[type]

    this.buckets.set(key, {
      tokens: config.maxTokens,
      lastRefill: Date.now()
    })

    await this.persistState()
    console.log(`[RateLimitService] Reset rate limit for ${key}`)
  }

  /**
   * Reset all rate limits for a user
   */
  static async resetAllForUser(userId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    const types: RateLimitType[] = ['translation', 'message', 'rag', 'image']
    for (const type of types) {
      await this.resetRateLimit(userId, type)
    }

    console.log(`[RateLimitService] Reset all rate limits for user ${userId}`)
  }

  /**
   * Clear all rate limit data
   * Useful for testing or when user logs out
   */
  static async clearAll(): Promise<void> {
    this.buckets.clear()
    await AsyncStorage.removeItem('rateLimitBuckets')
    console.log('[RateLimitService] Cleared all rate limit data')
  }

  /**
   * Get configuration for a specific rate limit type
   */
  static getConfig(type: RateLimitType): RateLimitConfig {
    return { ...RATE_LIMIT_CONFIGS[type] }
  }
}

// Example usage:
/*
// Initialize on app start
await RateLimitService.initialize()

// Check if translation is allowed
const result = await RateLimitService.checkRateLimit(userId, 'translation')
if (!result.allowed) {
  Alert.alert('Rate Limit', result.message)
  return
}

// Proceed with translation...

// Get current status
const status = await RateLimitService.getStatus(userId, 'translation')
console.log(`${status.availableTokens}/${status.maxTokens} translations available`)

// Reset rate limits (admin/testing)
await RateLimitService.resetRateLimit(userId, 'translation')
await RateLimitService.resetAllForUser(userId)
await RateLimitService.clearAll()
*/
