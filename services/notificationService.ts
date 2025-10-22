import { getDatabase, onChildAdded, ref, remove } from 'firebase/database'
import { AppState, AppStateStatus } from 'react-native'
import { UserCacheService } from './userCacheService'

export interface NotificationData {
  conversationId: string
  senderId: string
  senderName: string
  messageText: string
  messageType: 'text' | 'image'
  timestamp: number
  notificationId: string
}

export interface NotificationBanner {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  messageText: string
  messageType: 'text' | 'image'
  timestamp: number
}

class NotificationService {
  private db = getDatabase()
  private notificationListener: (() => void) | null = null
  private appStateListener: any = null
  private currentUserId: string | null = null
  private currentConversationId: string | null = null
  private bannerCallback: ((banner: NotificationBanner) => void) | null = null
  private isInitialized = false

  // Initialize notification service for a user
  async initialize(
    userId: string,
    bannerCallback?: (banner: NotificationBanner) => void
  ) {
    if (this.isInitialized && this.currentUserId === userId) {
      return
    }

    // Clean up previous listener
    await this.cleanup()

    this.currentUserId = userId
    this.bannerCallback = bannerCallback
    this.isInitialized = true

    // Set up app state listener
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    )

    // Set up RTDB listener for notifications
    await this.setupNotificationListener()

    console.log('NotificationService initialized for user:', userId)
  }

  // Set banner callback (for when NotificationContext is available)
  setBannerCallback(callback: (banner: NotificationBanner) => void) {
    this.bannerCallback = callback
  }

  // Set up RTDB listener for user notifications
  private async setupNotificationListener() {
    if (!this.currentUserId) return

    const notificationsRef = ref(this.db, `notifications/${this.currentUserId}`)

    this.notificationListener = onChildAdded(
      notificationsRef,
      async (snapshot) => {
        const notificationData = snapshot.val() as NotificationData
        const notificationId = snapshot.key

        if (!notificationData || !notificationId) return

        console.log('Received notification:', notificationData)

        // Check if this is for the currently open conversation
        if (this.currentConversationId === notificationData.conversationId) {
          console.log('Skipping notification for active conversation')
          // Still clean up the notification
          await this.cleanupNotification(notificationId)
          return
        }

        // Get sender profile for avatar
        let senderAvatar: string | undefined
        try {
          const senderProfile = await UserCacheService.getUserProfile(
            notificationData.senderId
          )
          senderAvatar = senderProfile?.photoURL
        } catch (error) {
          console.warn('Failed to get sender profile:', error)
        }

        // Create banner notification
        const banner: NotificationBanner = {
          id: notificationId,
          conversationId: notificationData.conversationId,
          senderId: notificationData.senderId,
          senderName: notificationData.senderName,
          senderAvatar,
          messageText: notificationData.messageText,
          messageType: notificationData.messageType,
          timestamp: notificationData.timestamp
        }

        // Show in-app banner
        if (this.bannerCallback) {
          this.bannerCallback(banner)
        }

        // Clean up notification after processing
        await this.cleanupNotification(notificationId)
      }
    )
  }

  // Handle app state changes
  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log('App state changed to:', nextAppState)

    if (nextAppState === 'active') {
      // App came to foreground - notifications will be handled by RTDB listener
      console.log('App is now active')
    }
  }

  // Set current conversation (to prevent notifications for active chat)
  setCurrentConversation(conversationId: string | null) {
    this.currentConversationId = conversationId
    console.log('Current conversation set to:', conversationId)
  }

  // Clean up a specific notification from RTDB
  private async cleanupNotification(notificationId: string) {
    if (!this.currentUserId) return

    try {
      const notificationRef = ref(
        this.db,
        `notifications/${this.currentUserId}/${notificationId}`
      )
      await remove(notificationRef)
      console.log('Cleaned up notification:', notificationId)
    } catch (error) {
      console.error('Failed to cleanup notification:', error)
    }
  }

  // Clean up all user notifications (on logout)
  async cleanupUserNotifications() {
    if (!this.currentUserId) return

    try {
      const notificationsRef = ref(
        this.db,
        `notifications/${this.currentUserId}`
      )
      await remove(notificationsRef)
      console.log('Cleaned up all notifications for user:', this.currentUserId)
    } catch (error) {
      console.error('Failed to cleanup user notifications:', error)
    }
  }

  // Clean up service
  async cleanup() {
    if (this.notificationListener) {
      this.notificationListener()
      this.notificationListener = null
    }

    if (this.appStateListener) {
      this.appStateListener.remove()
      this.appStateListener = null
    }

    this.currentUserId = null
    this.currentConversationId = null
    this.bannerCallback = null
    this.isInitialized = false

    console.log('NotificationService cleaned up')
  }
}

export const notificationService = new NotificationService()
