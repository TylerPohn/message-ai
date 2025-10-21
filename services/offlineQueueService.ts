import AsyncStorage from '@react-native-async-storage/async-storage'

interface QueuedMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  text: string
  type: 'text' | 'image' | 'system'
  imageURL?: string
  thumbnailURL?: string
  imageMetadata?: { width: number; height: number; size: number }
  localImageURI?: string
  replyTo?: string
  timestamp: number
  retryCount: number
  lastRetryAt?: number
  maxRetries: number
}

const QUEUE_STORAGE_KEY = 'offline_message_queue'
const MAX_RETRIES = 5
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000] // Exponential backoff in ms

export class OfflineQueueService {
  private static queue: QueuedMessage[] = []
  private static isProcessing = false
  private static retryTimeout: NodeJS.Timeout | null = null

  // Initialize queue from storage
  static async initialize(): Promise<void> {
    try {
      const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY)
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue)
        console.log(`Loaded ${this.queue.length} messages from offline queue`)
      }
    } catch (error) {
      console.error('Error loading offline queue:', error)
    }
  }

  // Add message to queue
  static async addToQueue(
    conversationId: string,
    senderId: string,
    senderName: string,
    text: string,
    type: 'text' | 'image' | 'system' = 'text',
    imageURL?: string,
    thumbnailURL?: string,
    imageMetadata?: { width: number; height: number; size: number },
    localImageURI?: string,
    replyTo?: string
  ): Promise<string> {
    const queuedMessage: QueuedMessage = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId,
      senderName,
      text,
      type,
      imageURL,
      thumbnailURL,
      imageMetadata,
      localImageURI,
      replyTo,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES
    }

    this.queue.push(queuedMessage)
    await this.persistQueue()

    console.log(`Added message to offline queue: ${queuedMessage.id}`)
    return queuedMessage.id
  }

  // Remove message from queue (after successful send)
  static async removeFromQueue(messageId: string): Promise<void> {
    this.queue = this.queue.filter((msg) => msg.id !== messageId)
    await this.persistQueue()
    console.log(`Removed message from queue: ${messageId}`)
  }

  // Get all queued messages
  static getQueuedMessages(): QueuedMessage[] {
    return [...this.queue]
  }

  // Get queued messages for a specific conversation
  static getQueuedMessagesForConversation(
    conversationId: string
  ): QueuedMessage[] {
    return this.queue.filter((msg) => msg.conversationId === conversationId)
  }

  // Check if there are messages ready for retry
  static getMessagesReadyForRetry(): QueuedMessage[] {
    const now = Date.now()
    return this.queue.filter((msg) => {
      if (msg.retryCount >= msg.maxRetries) return false

      const lastRetry = msg.lastRetryAt || msg.timestamp
      const delay =
        RETRY_DELAYS[Math.min(msg.retryCount, RETRY_DELAYS.length - 1)]

      return now - lastRetry >= delay
    })
  }

  // Mark message as retried
  static async markAsRetried(messageId: string): Promise<void> {
    const message = this.queue.find((msg) => msg.id === messageId)
    if (message) {
      message.retryCount++
      message.lastRetryAt = Date.now()
      await this.persistQueue()
    }
  }

  // Clear all messages from queue
  static async clearQueue(): Promise<void> {
    this.queue = []
    await this.persistQueue()
    console.log('Cleared offline message queue')
  }

  // Process queue (retry failed messages)
  static async processQueue(
    sendMessageCallback: (message: QueuedMessage) => Promise<string>
  ): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true
    const messagesToRetry = this.getMessagesReadyForRetry()

    console.log(
      `Processing ${messagesToRetry.length} messages from offline queue`
    )

    for (const message of messagesToRetry) {
      try {
        await this.markAsRetried(message.id)

        const newMessageId = await sendMessageCallback(message)

        // Remove from queue on success
        await this.removeFromQueue(message.id)
        console.log(
          `Successfully sent queued message: ${message.id} -> ${newMessageId}`
        )
      } catch (error) {
        console.error(`Failed to retry message ${message.id}:`, error)

        // If max retries reached, remove from queue
        if (message.retryCount >= message.maxRetries) {
          await this.removeFromQueue(message.id)
          console.log(`Removed message ${message.id} after max retries`)
        }
      }
    }

    this.isProcessing = false

    // Schedule next retry if there are still messages in queue
    if (this.queue.length > 0) {
      this.scheduleNextRetry()
    }
  }

  // Schedule next retry attempt
  static scheduleNextRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }

    const nextRetryTime = Math.min(
      ...this.queue
        .filter((msg) => msg.retryCount < msg.maxRetries)
        .map((msg) => {
          const lastRetry = msg.lastRetryAt || msg.timestamp
          const delay =
            RETRY_DELAYS[Math.min(msg.retryCount, RETRY_DELAYS.length - 1)]
          return lastRetry + delay
        })
    )

    if (nextRetryTime && nextRetryTime > Date.now()) {
      const delay = nextRetryTime - Date.now()
      this.retryTimeout = setTimeout(() => {
        this.processQueue(() => Promise.reject('No callback provided'))
      }, delay)
    }
  }

  // Persist queue to storage
  private static async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error('Error persisting offline queue:', error)
    }
  }

  // Get queue statistics
  static getQueueStats(): {
    totalMessages: number
    messagesByConversation: Record<string, number>
    retryStats: {
      pending: number
      maxRetriesReached: number
    }
  } {
    const messagesByConversation: Record<string, number> = {}
    let pending = 0
    let maxRetriesReached = 0

    this.queue.forEach((msg) => {
      messagesByConversation[msg.conversationId] =
        (messagesByConversation[msg.conversationId] || 0) + 1

      if (msg.retryCount >= msg.maxRetries) {
        maxRetriesReached++
      } else {
        pending++
      }
    })

    return {
      totalMessages: this.queue.length,
      messagesByConversation,
      retryStats: {
        pending,
        maxRetriesReached
      }
    }
  }
}
