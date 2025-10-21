import { db } from '@/firebaseConfig'
import {
  COLLECTIONS,
  Conversation,
  Membership,
  Message,
  MessageStatus,
  MessageType,
  UserProfile
} from '@/types/messaging'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore'
import { NetworkService } from './networkService'
import { OfflineQueueService } from './offlineQueueService'
// Removed ulid import - using custom ID generation

export class MessagingService {
  // Create a new conversation
  static async createConversation(
    participants: string[],
    type: 'direct' | 'group' = 'direct',
    title?: string,
    adminId?: string
  ): Promise<string> {
    const conversationData: any = {
      type,
      participants,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Only add optional fields if they have values
    if (title && title.trim()) {
      conversationData.title = title
    }
    if (adminId && adminId.trim()) {
      conversationData.adminId = adminId
    }

    const conversationRef = await addDoc(
      collection(db, COLLECTIONS.CONVERSATIONS),
      {
        ...conversationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    )

    // Create memberships for all participants
    const membershipPromises = participants.map(async (userId) => {
      const membershipData: Omit<Membership, 'id'> = {
        conversationId: conversationRef.id,
        userId,
        role: userId === adminId ? 'admin' : 'member',
        joinedAt: new Date()
      }

      await addDoc(collection(db, COLLECTIONS.MEMBERSHIPS), {
        ...membershipData,
        joinedAt: serverTimestamp()
      })
    })

    await Promise.all(membershipPromises)

    return conversationRef.id
  }

  // Send a message with offline support and retry logic
  static async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    text: string,
    type: MessageType = 'text',
    imageURL?: string,
    replyTo?: string
  ): Promise<string> {
    // Check if we're online
    if (!NetworkService.isOnline()) {
      console.log('Offline - adding message to queue')
      const queuedId = await OfflineQueueService.addToQueue(
        conversationId,
        senderId,
        senderName,
        text,
        type,
        imageURL,
        replyTo
      )
      return queuedId
    }

    try {
      // Prepare message data for Firestore (remove undefined values)
      const messageData: any = {
        conversationId,
        senderId,
        senderName,
        text,
        timestamp: serverTimestamp(),
        type,
        status: 'sending'
      }

      // Only add optional fields if they have values
      if (imageURL) {
        messageData.imageURL = imageURL
      }
      if (replyTo) {
        messageData.replyTo = replyTo
      }

      // Add message to Firestore
      const messageRef = await addDoc(
        collection(db, COLLECTIONS.MESSAGES),
        messageData
      )

      // Update conversation's last message using Firestore document ID
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId)
      await updateDoc(conversationRef, {
        lastMessage: {
          id: messageRef.id,
          text,
          senderId,
          senderName,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      })

      // Update message status to sent
      await updateDoc(messageRef, { status: 'sent' })

      return messageRef.id
    } catch (error) {
      console.error('Error sending message:', error)

      // Check if it's a network error
      if (this.isNetworkError(error)) {
        console.log('Network error - adding message to queue')
        const queuedId = await OfflineQueueService.addToQueue(
          conversationId,
          senderId,
          senderName,
          text,
          type,
          imageURL,
          replyTo
        )
        return queuedId
      }

      throw error
    }
  }

  // Check if error is network-related
  private static isNetworkError(error: any): boolean {
    if (!error) return false

    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code?.toLowerCase() || ''

    return (
      errorMessage.includes('network') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorCode.includes('unavailable') ||
      errorCode.includes('timeout') ||
      errorCode.includes('network')
    )
  }

  // Get a single conversation by ID
  static async getConversation(
    conversationId: string
  ): Promise<Conversation | null> {
    try {
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId)
      const conversationSnap = await getDoc(conversationRef)

      if (!conversationSnap.exists()) {
        return null
      }

      const data = conversationSnap.data()
      return {
        id: conversationSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastMessage: data.lastMessage
          ? {
              ...data.lastMessage,
              timestamp: data.lastMessage.timestamp?.toDate() || new Date()
            }
          : undefined
      } as Conversation
    } catch (error) {
      console.error('Error getting conversation:', error)
      return null
    }
  }

  // Get conversations for a user
  static async getUserConversations(userId: string): Promise<Conversation[]> {
    const membershipsQuery = query(
      collection(db, COLLECTIONS.MEMBERSHIPS),
      where('userId', '==', userId)
    )

    const membershipsSnapshot = await getDocs(membershipsQuery)
    const conversationIds = membershipsSnapshot.docs.map(
      (doc) => doc.data().conversationId
    )

    if (conversationIds.length === 0) return []

    const conversationsQuery = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where('__name__', 'in', conversationIds),
      orderBy('updatedAt', 'desc')
    )

    const conversationsSnapshot = await getDocs(conversationsQuery)
    return conversationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      lastMessage: doc.data().lastMessage
        ? {
            ...doc.data().lastMessage,
            timestamp: doc.data().lastMessage.timestamp?.toDate() || new Date()
          }
        : undefined
    })) as Conversation[]
  }

  // Get messages for a conversation
  static async getConversationMessages(
    conversationId: string,
    limitCount: number = 50
  ): Promise<Message[]> {
    const messagesQuery = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    const messagesSnapshot = await getDocs(messagesQuery)
    return messagesSnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id, // Use Firestore document ID as authoritative ID
      timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as Message[]
  }

  // Listen to conversations for a user (real-time)
  static listenToUserConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ) {
    let conversationUnsubscribe: (() => void) | null = null

    const membershipsQuery = query(
      collection(db, COLLECTIONS.MEMBERSHIPS),
      where('userId', '==', userId)
    )

    const membershipsUnsubscribe = onSnapshot(
      membershipsQuery,
      async (membershipsSnapshot) => {
        // Clean up previous conversation listener
        if (conversationUnsubscribe) {
          conversationUnsubscribe()
          conversationUnsubscribe = null
        }

        const conversationIds = membershipsSnapshot.docs.map(
          (doc) => doc.data().conversationId
        )

        if (conversationIds.length === 0) {
          callback([])
          return
        }

        // Set up real-time listener on conversations collection
        const conversationsQuery = query(
          collection(db, COLLECTIONS.CONVERSATIONS),
          where('__name__', 'in', conversationIds),
          orderBy('updatedAt', 'desc')
        )

        // Use onSnapshot for real-time updates on conversations
        conversationUnsubscribe = onSnapshot(
          conversationsQuery,
          (conversationsSnapshot) => {
            const conversations = conversationsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate() || new Date(),
              lastMessage: doc.data().lastMessage
                ? {
                    ...doc.data().lastMessage,
                    timestamp:
                      doc.data().lastMessage.timestamp?.toDate() || new Date()
                  }
                : undefined
            })) as Conversation[]

            callback(conversations)
          }
        )
      }
    )

    // Return cleanup function that unsubscribes from both listeners
    return () => {
      membershipsUnsubscribe()
      if (conversationUnsubscribe) {
        conversationUnsubscribe()
      }
    }
  }

  // Listen to messages for a conversation (real-time)
  static listenToConversationMessages(
    conversationId: string,
    callback: (messages: Message[]) => void,
    limitCount: number = 50
  ) {
    const messagesQuery = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    return onSnapshot(messagesQuery, async (messagesSnapshot) => {
      const messages = messagesSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id, // Use Firestore document ID as authoritative ID
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Message[]

      // Mark new messages as delivered (if not sent by current user)
      await this.markNewMessagesAsDelivered(messages, conversationId)

      callback(messages)
    })
  }

  // Mark new messages as delivered when they reach the recipient's device
  private static async markNewMessagesAsDelivered(
    messages: Message[],
    conversationId: string
  ): Promise<void> {
    try {
      // Get current user ID from auth context (we'll need to pass this in)
      // For now, we'll implement this in the UI components where we have access to user context
      console.log(
        'New messages received - delivered status will be handled in UI components'
      )
    } catch (error) {
      console.error('Error marking messages as delivered:', error)
    }
  }

  // Mark a specific message as delivered
  static async markMessageAsDelivered(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId)
      await updateDoc(messageRef, { status: 'delivered' })
      console.log(`Marked message ${messageId} as delivered`)
    } catch (error) {
      console.error('Error marking message as delivered:', error)
    }
  }

  // Update message status
  static async updateMessageStatus(
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId)
    await updateDoc(messageRef, { status })
  }

  // Mark messages as read
  static async markMessagesAsRead(
    conversationId: string,
    userId: string,
    lastReadMessageId: string
  ): Promise<void> {
    const membershipQuery = query(
      collection(db, COLLECTIONS.MEMBERSHIPS),
      where('conversationId', '==', conversationId),
      where('userId', '==', userId)
    )

    const membershipSnapshot = await getDocs(membershipQuery)
    if (!membershipSnapshot.empty) {
      const membershipRef = membershipSnapshot.docs[0].ref
      await updateDoc(membershipRef, {
        lastReadMessageId,
        lastReadAt: serverTimestamp()
      })
    }
  }

  // Check if a direct conversation already exists between two users
  static async checkExistingDirectConversation(
    userId1: string,
    userId2: string
  ): Promise<Conversation | null> {
    try {
      // Get all conversations for user1
      const user1Conversations = await this.getUserConversations(userId1)

      // Find direct conversation with user2
      const existingConversation = user1Conversations.find(
        (conv) =>
          conv.type === 'direct' &&
          conv.participants.includes(userId1) &&
          conv.participants.includes(userId2)
      )

      return existingConversation || null
    } catch (error) {
      console.error('Error checking existing conversation:', error)
      throw error
    }
  }

  // Get user membership for a conversation
  static async getUserMembership(
    conversationId: string,
    userId: string
  ): Promise<Membership | null> {
    try {
      const membershipQuery = query(
        collection(db, COLLECTIONS.MEMBERSHIPS),
        where('conversationId', '==', conversationId),
        where('userId', '==', userId)
      )

      const membershipSnapshot = await getDocs(membershipQuery)
      if (membershipSnapshot.empty) {
        return null
      }

      const membershipData = membershipSnapshot.docs[0].data()
      return {
        id: membershipSnapshot.docs[0].id,
        ...membershipData,
        joinedAt: membershipData.joinedAt?.toDate() || new Date(),
        lastReadAt: membershipData.lastReadAt?.toDate() || undefined
      } as Membership
    } catch (error) {
      console.error('Error fetching user membership:', error)
      throw error
    }
  }

  // Get all participants' profiles for a conversation
  static async getConversationParticipants(
    conversationId: string
  ): Promise<UserProfile[]> {
    try {
      // First get all memberships for this conversation
      const membershipsQuery = query(
        collection(db, COLLECTIONS.MEMBERSHIPS),
        where('conversationId', '==', conversationId)
      )

      const membershipsSnapshot = await getDocs(membershipsQuery)
      const userIds = membershipsSnapshot.docs.map((doc) => doc.data().userId)

      if (userIds.length === 0) {
        return []
      }

      // Then get all user profiles
      const usersQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('__name__', 'in', userIds)
      )

      const usersSnapshot = await getDocs(usersQuery)
      return usersSnapshot.docs.map((doc) => ({
        ...doc.data(),
        uid: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastSeen: doc.data().lastSeen?.toDate() || new Date()
      })) as UserProfile[]
    } catch (error) {
      console.error('Error fetching conversation participants:', error)
      throw error
    }
  }
}
