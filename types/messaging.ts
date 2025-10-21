// Data models for MessageAI messaging system

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  participants: string[] // Array of user IDs
  title?: string // For group chats
  photoURL?: string // For group chats
  adminId?: string // For group chats
  lastMessage?: {
    id: string
    text: string
    senderId: string
    senderName: string
    timestamp: Date
    type: 'text' | 'image' | 'system'
  }
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  text: string
  timestamp: Date
  type: 'text' | 'image' | 'system'
  imageURL?: string
  thumbnailURL?: string
  imageMetadata?: {
    width: number
    height: number
    size: number
  }
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  replyTo?: string // ID of message being replied to
}

export interface Membership {
  id: string
  conversationId: string
  userId: string
  role: 'admin' | 'member'
  lastReadMessageId?: string
  lastReadAt?: Date
  joinedAt: Date
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  status?: string
  lastSeen: Date
  createdAt: Date
  presence?: {
    status: 'online' | 'offline'
    lastSeen: Date
  }
}

// Firestore collection names
export const COLLECTIONS = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  MEMBERSHIPS: 'memberships',
  USERS: 'users'
} as const

// Message status types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

// Conversation types
export type ConversationType = 'direct' | 'group'

// Message types
export type MessageType = 'text' | 'image' | 'system'
