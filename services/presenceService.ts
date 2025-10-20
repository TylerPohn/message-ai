import { rtdb } from '@/firebaseConfig'
import {
  get,
  off,
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set
} from 'firebase/database'
import { AppState, AppStateStatus } from 'react-native'

export interface PresenceData {
  status: 'online' | 'offline'
  lastSeen: number
}

export interface PresenceListener {
  userId: string
  callback: (presence: PresenceData | null) => void
}

export class PresenceService {
  private static listeners: Map<string, PresenceListener> = new Map()
  private static appStateSubscription: any = null
  private static isInitialized = false
  private static heartbeatInterval: NodeJS.Timeout | null = null

  // Heartbeat configuration
  private static readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private static readonly OFFLINE_THRESHOLD = 30000 // 30 seconds (more responsive)

  // Initialize presence service
  static initialize(userId: string): void {
    if (this.isInitialized) return

    this.setUserOnline(userId)
    this.setupPresenceListeners(userId)
    this.setupAppStateListeners(userId)
    this.isInitialized = true
  }

  // Set user as online
  static async setUserOnline(userId: string): Promise<void> {
    try {
      const presenceRef = ref(rtdb, `presence/${userId}`)
      await set(presenceRef, {
        status: 'online',
        lastSeen: serverTimestamp()
      })
    } catch (error) {
      console.error('Error setting user online:', error)
    }
  }

  // Set user as offline
  static async setUserOffline(userId: string): Promise<void> {
    try {
      const presenceRef = ref(rtdb, `presence/${userId}`)
      await set(presenceRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      })
    } catch (error) {
      console.error('Error setting user offline:', error)
    }
  }

  // Set up onDisconnect handlers
  static setupPresenceListeners(userId: string): void {
    const presenceRef = ref(rtdb, `presence/${userId}`)

    // Set up onDisconnect handler to mark user offline when connection drops
    onDisconnect(presenceRef).set({
      status: 'offline',
      lastSeen: serverTimestamp()
    })
  }

  // Listen to user presence changes
  static listenToUserPresence(
    userId: string,
    callback: (presence: PresenceData | null) => void
  ): () => void {
    const presenceRef = ref(rtdb, `presence/${userId}`)

    const listener = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        callback({
          status: data.status,
          lastSeen: data.lastSeen
        })
      } else {
        callback(null)
      }
    })

    // Store listener for cleanup
    this.listeners.set(userId, { userId, callback })

    // Return cleanup function
    return () => {
      off(presenceRef, 'value', listener)
      this.listeners.delete(userId)
    }
  }

  // Get current user presence
  static async getUserPresence(userId: string): Promise<PresenceData | null> {
    try {
      const presenceRef = ref(rtdb, `presence/${userId}`)
      const snapshot = await get(presenceRef)

      if (snapshot.exists()) {
        const data = snapshot.val()
        return {
          status: data.status,
          lastSeen: data.lastSeen
        }
      }
      return null
    } catch (error) {
      console.error('Error getting user presence:', error)
      return null
    }
  }

  // Set up app state listeners to handle foreground/background
  private static setupAppStateListeners(userId: string): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          // App came to foreground
          this.setUserOnline(userId)
        } else if (
          nextAppState === 'background' ||
          nextAppState === 'inactive'
        ) {
          // App went to background
          this.setUserOffline(userId)
        }
      }
    )
  }

  // Start heartbeat to keep presence fresh
  static startHeartbeat(userId: string): void {
    this.stopHeartbeat() // Clear any existing heartbeat

    this.heartbeatInterval = setInterval(async () => {
      try {
        // Only send heartbeat if we have network connectivity
        const { NetworkService } = await import('./networkService')
        const networkState = NetworkService.getCurrentState()

        console.log(`[PresenceService] Heartbeat check:`, {
          userId,
          isOnline: networkState.isOnline,
          connectionType: networkState.connectionType
        })

        if (networkState.isOnline) {
          await this.setUserOnline(userId)
          console.log(`[PresenceService] Heartbeat sent for user: ${userId}`)
        } else {
          console.log(
            `[PresenceService] Skipping heartbeat - no network for user: ${userId}`
          )
        }
      } catch (error) {
        console.error('Error in heartbeat:', error)
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  // Stop heartbeat
  static stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Check if user should be considered offline based on lastSeen timestamp
  static isUserOffline(presence: PresenceData): boolean {
    if (presence.status === 'offline') return true

    const now = Date.now()
    const lastSeen = presence.lastSeen
    const timeDiff = now - lastSeen

    // Debug logging for testing
    console.log(`[PresenceService] Checking offline status:`, {
      status: presence.status,
      lastSeen: new Date(lastSeen).toISOString(),
      timeDiff: Math.round(timeDiff / 1000),
      threshold: Math.round(this.OFFLINE_THRESHOLD / 1000),
      isOffline: timeDiff > this.OFFLINE_THRESHOLD
    })

    return timeDiff > this.OFFLINE_THRESHOLD
  }

  // Clean up all listeners
  static cleanup(): void {
    // Stop heartbeat
    this.stopHeartbeat()

    // Clean up presence listeners
    this.listeners.forEach((listener) => {
      const presenceRef = ref(rtdb, `presence/${listener.userId}`)
      off(presenceRef, 'value')
    })
    this.listeners.clear()

    // Clean up app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove()
      this.appStateSubscription = null
    }

    this.isInitialized = false
  }

  // Format last seen timestamp for display
  static formatLastSeen(lastSeen: number): string {
    const now = Date.now()
    const diff = now - lastSeen

    if (diff < 60000) {
      // Less than 1 minute
      return 'Just now'
    } else if (diff < 3600000) {
      // Less than 1 hour
      const minutes = Math.floor(diff / 60000)
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    } else if (diff < 86400000) {
      // Less than 1 day
      const hours = Math.floor(diff / 3600000)
      return `${hours} hour${hours === 1 ? '' : 's'} ago`
    } else {
      // More than 1 day
      const days = Math.floor(diff / 86400000)
      return `${days} day${days === 1 ? '' : 's'} ago`
    }
  }
}
