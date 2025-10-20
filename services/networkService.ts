import NetInfo from '@react-native-community/netinfo'
import { MessagingService } from './messagingService'
import { OfflineQueueService } from './offlineQueueService'

export interface NetworkState {
  isConnected: boolean
  isInternetReachable: boolean | null
  type: string | null
  isOnline: boolean
}

export class NetworkService {
  private static listeners: Set<(state: NetworkState) => void> = new Set()
  private static currentState: NetworkState = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
    isOnline: false
  }
  private static isInitialized = false

  // Initialize network monitoring
  static async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Get initial network state
    const netInfoState = await NetInfo.fetch()
    this.updateNetworkState(netInfoState)

    // Listen for network state changes
    NetInfo.addEventListener((state) => {
      this.updateNetworkState(state)
    })

    this.isInitialized = true
    console.log('NetworkService initialized')
  }

  // Update internal network state
  private static updateNetworkState(netInfoState: any): void {
    const newState: NetworkState = {
      isConnected: netInfoState.isConnected ?? false,
      isInternetReachable: netInfoState.isInternetReachable,
      type: netInfoState.type,
      isOnline:
        (netInfoState.isConnected ?? false) &&
        netInfoState.isInternetReachable !== false
    }

    const wasOnline = this.currentState.isOnline
    this.currentState = newState

    // Notify listeners
    this.listeners.forEach((listener) => listener(newState))

    // Handle online/offline transitions
    if (!wasOnline && newState.isOnline) {
      console.log('Network came back online - processing offline queue')
      this.handleOnlineTransition()
    } else if (wasOnline && !newState.isOnline) {
      console.log('Network went offline')
    }
  }

  // Handle transition to online
  private static async handleOnlineTransition(): Promise<void> {
    try {
      // Process offline queue when coming back online
      await OfflineQueueService.processQueue(async (queuedMessage) => {
        return await MessagingService.sendMessage(
          queuedMessage.conversationId,
          queuedMessage.senderId,
          queuedMessage.senderName,
          queuedMessage.text,
          queuedMessage.type,
          queuedMessage.imageURL,
          queuedMessage.replyTo
        )
      })
    } catch (error) {
      console.error('Error processing offline queue:', error)
    }
  }

  // Get current network state
  static getCurrentState(): NetworkState {
    return { ...this.currentState }
  }

  // Subscribe to network state changes
  static subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Check if currently online
  static isOnline(): boolean {
    return this.currentState.isOnline
  }

  // Check if currently connected (but internet might not be reachable)
  static isConnected(): boolean {
    return this.currentState.isConnected
  }

  // Get network type
  static getNetworkType(): string | null {
    return this.currentState.type
  }

  // Force refresh network state
  static async refresh(): Promise<NetworkState> {
    const netInfoState = await NetInfo.fetch()
    this.updateNetworkState(netInfoState)
    return this.getCurrentState()
  }

  // Get network status for UI display
  static getStatusText(): string {
    if (!this.currentState.isConnected) {
      return 'No Connection'
    }

    if (this.currentState.isInternetReachable === false) {
      return 'No Internet'
    }

    if (this.currentState.isOnline) {
      return 'Online'
    }

    return 'Connecting...'
  }

  // Get network status color for UI
  static getStatusColor(): string {
    if (!this.currentState.isConnected) {
      return '#FF3B30' // Red
    }

    if (this.currentState.isInternetReachable === false) {
      return '#FF9500' // Orange
    }

    if (this.currentState.isOnline) {
      return '#34C759' // Green
    }

    return '#FF9500' // Orange
  }
}
