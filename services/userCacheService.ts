import { UserProfile } from '@/types/messaging'
import { UserService } from './userService'

export class UserCacheService {
  private static userCache = new Map<string, UserProfile>()
  private static cacheExpiry = new Map<string, number>()
  private static CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  // Get user profile with caching
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Check if we have a valid cached version
    const cached = this.userCache.get(userId)
    const expiry = this.cacheExpiry.get(userId)

    if (cached && expiry && Date.now() < expiry) {
      return cached
    }

    // Fetch from Firestore
    try {
      const userProfile = await UserService.getUserProfile(userId)
      if (userProfile) {
        this.userCache.set(userId, userProfile)
        this.cacheExpiry.set(userId, Date.now() + this.CACHE_DURATION)
      }
      return userProfile
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  // Get multiple user profiles efficiently
  static async getUserProfiles(
    userIds: string[]
  ): Promise<Map<string, UserProfile>> {
    const profiles = new Map<string, UserProfile>()
    const uncachedIds: string[] = []

    // Check cache first
    for (const userId of userIds) {
      const cached = this.userCache.get(userId)
      const expiry = this.cacheExpiry.get(userId)

      if (cached && expiry && Date.now() < expiry) {
        profiles.set(userId, cached)
      } else {
        uncachedIds.push(userId)
      }
    }

    // Fetch uncached profiles
    if (uncachedIds.length > 0) {
      try {
        const allUsers = await UserService.getAllUsers('') // Get all users
        const now = Date.now()

        for (const user of allUsers) {
          if (uncachedIds.includes(user.uid)) {
            profiles.set(user.uid, user)
            this.userCache.set(user.uid, user)
            this.cacheExpiry.set(user.uid, now + this.CACHE_DURATION)
          }
        }
      } catch (error) {
        console.error('Error fetching user profiles:', error)
      }
    }

    return profiles
  }

  // Clear cache for a specific user
  static clearUserCache(userId: string): void {
    this.userCache.delete(userId)
    this.cacheExpiry.delete(userId)
  }

  // Clear all cache
  static clearAllCache(): void {
    this.userCache.clear()
    this.cacheExpiry.clear()
  }

  // Update cache with new user profile
  static updateUserCache(userProfile: UserProfile): void {
    this.userCache.set(userProfile.uid, userProfile)
    this.cacheExpiry.set(userProfile.uid, Date.now() + this.CACHE_DURATION)
  }
}
