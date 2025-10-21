import { rtdb } from '@/firebaseConfig'
import {
  off,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set
} from 'firebase/database'

export interface TypingData {
  isTyping: boolean
  timestamp: number
}

export interface TypingUser {
  userId: string
  displayName: string
  isTyping: boolean
  timestamp: number
}

export class TypingService {
  private static listeners: Map<string, any> = new Map()
  private static timeouts: Map<string, NodeJS.Timeout> = new Map()
  private static readonly TYPING_TIMEOUT = 5000 // 5 seconds

  // Set user typing status
  static async setUserTyping(
    conversationId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      const typingRef = ref(rtdb, `typing/${conversationId}/${userId}`)

      if (isTyping) {
        // Set typing status with timestamp
        await set(typingRef, {
          isTyping: true,
          timestamp: serverTimestamp()
        })

        // Clear any existing timeout
        const timeoutKey = `${conversationId}_${userId}`
        if (this.timeouts.has(timeoutKey)) {
          clearTimeout(this.timeouts.get(timeoutKey)!)
        }

        // Set new timeout to clear typing after 5 seconds
        const timeout = setTimeout(async () => {
          await this.clearTypingIndicator(conversationId, userId)
          this.timeouts.delete(timeoutKey)
        }, this.TYPING_TIMEOUT)

        this.timeouts.set(timeoutKey, timeout as unknown as NodeJS.Timeout)
      } else {
        // Clear typing immediately
        await this.clearTypingIndicator(conversationId, userId)
      }
    } catch (error) {
      console.error('Error setting user typing status:', error)
    }
  }

  // Clear typing indicator
  static async clearTypingIndicator(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      const typingRef = ref(rtdb, `typing/${conversationId}/${userId}`)
      await remove(typingRef)

      // Clear timeout if exists
      const timeoutKey = `${conversationId}_${userId}`
      if (this.timeouts.has(timeoutKey)) {
        clearTimeout(this.timeouts.get(timeoutKey)!)
        this.timeouts.delete(timeoutKey)
      }
    } catch (error) {
      console.error('Error clearing typing indicator:', error)
    }
  }

  // Listen to typing indicators for a conversation
  static listenToTypingIndicators(
    conversationId: string,
    callback: (typingUsers: TypingUser[]) => void
  ): () => void {
    const typingRef = ref(rtdb, `typing/${conversationId}`)

    const listener = onValue(typingRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const typingUsers: TypingUser[] = []

        // Process each user's typing status
        for (const [userId, typingData] of Object.entries(data)) {
          const typedData = typingData as TypingData

          // Check if typing data is recent (within 5 seconds)
          const now = Date.now()
          const timestamp = typedData.timestamp || 0
          const isRecent = now - timestamp < this.TYPING_TIMEOUT

          if (typedData.isTyping && isRecent) {
            // Get user display name (you might want to cache this)
            try {
              const { UserService } = await import('./userService')
              const userProfile = await UserService.getUserProfile(userId)

              if (userProfile) {
                typingUsers.push({
                  userId,
                  displayName: userProfile.displayName,
                  isTyping: true,
                  timestamp: typedData.timestamp
                })
              }
            } catch (error) {
              console.error(
                'Error getting user profile for typing indicator:',
                error
              )
            }
          }
        }

        callback(typingUsers)
      } else {
        callback([])
      }
    })

    // Store listener for cleanup
    this.listeners.set(conversationId, listener)

    // Return cleanup function
    return () => {
      off(typingRef, 'value', listener)
      this.listeners.delete(conversationId)
    }
  }

  // Clear all typing indicators for a user (when they leave conversation)
  static async clearAllTypingForUser(userId: string): Promise<void> {
    try {
      // This would require a more complex query to find all conversations
      // For now, we'll rely on individual conversation cleanup
      console.log(`Clearing all typing indicators for user: ${userId}`)
    } catch (error) {
      console.error('Error clearing all typing indicators for user:', error)
    }
  }

  // Clean up all listeners and timeouts
  static cleanup(): void {
    // Clear all timeouts
    this.timeouts.forEach((timeout) => {
      clearTimeout(timeout)
    })
    this.timeouts.clear()

    // Clean up listeners
    this.listeners.forEach((listener, conversationId) => {
      const typingRef = ref(rtdb, `typing/${conversationId}`)
      off(typingRef, 'value', listener)
    })
    this.listeners.clear()
  }

  // Format typing indicator text
  static formatTypingText(
    typingUsers: TypingUser[],
    currentUserId: string
  ): string {
    // Filter out current user
    const otherTypingUsers = typingUsers.filter(
      (user) => user.userId !== currentUserId
    )

    if (otherTypingUsers.length === 0) {
      return ''
    }

    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].displayName} is typing...`
    }

    if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].displayName} and ${otherTypingUsers[1].displayName} are typing...`
    }

    if (otherTypingUsers.length === 3) {
      return `${otherTypingUsers[0].displayName}, ${otherTypingUsers[1].displayName}, and ${otherTypingUsers[2].displayName} are typing...`
    }

    // More than 3 users
    return `${otherTypingUsers[0].displayName}, ${
      otherTypingUsers[1].displayName
    }, and ${otherTypingUsers.length - 2} others are typing...`
  }
}
