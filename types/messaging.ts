// Data models for Babel messaging system

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

export interface ReadReceipt {
  messageId: string
  userId: string
  readAt: Date
  senderName: string
  senderPhotoURL?: string
}

export interface CulturalContext {
  hasNuance: boolean
  hint: string
  whyDiffers?: string
}

export interface FormalityAlternatives {
  casual: string
  neutral: string
  formal: string
}

export interface Formality {
  detected: 'casual' | 'neutral' | 'formal'
  alternatives: FormalityAlternatives
}

export interface IdiomExplanation {
  phrase: string
  type: 'idiom' | 'slang'
  meaning: string
  example?: string
}

export interface Translation {
  messageId: string
  targetLanguage: string
  translatedText: string
  detectedSourceLanguage: string
  culturalContext?: CulturalContext
  formality?: Formality
  idioms?: IdiomExplanation[]
  translatedAt: Date
  translatedBy: string[] // User IDs who have requested this translation
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
  detectedLanguage?: string // Source language of original message (detected once)
  isTranslating?: boolean // Only used for UI state during active translation
  readBy?: ReadReceipt[] // Array of users who've read this message (for group chats)
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
  statusUpdatedAt?: Date
  lastSeen: Date
  createdAt: Date
  presence?: {
    status: 'online' | 'offline'
    lastSeen: Date
  }
  preferredLanguage?: string
  autoTranslate?: boolean
}

export interface Contact {
  id: string
  userId: string
  contactUserId: string
  addedAt: Date
  addedFrom: 'manual' | 'conversation'
}

// Firestore collection names
export const COLLECTIONS = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  MEMBERSHIPS: 'memberships',
  USERS: 'users',
  CONTACTS: 'contacts',
  READ_RECEIPTS: 'readReceipts',
  TRANSLATIONS: 'translations' // Subcollection under messages
} as const

// Message status types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

// Conversation types
export type ConversationType = 'direct' | 'group'

// Message types
export type MessageType = 'text' | 'image' | 'system'

// Language codes for translation
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  uk: 'Ukrainian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  nl: 'Dutch'
} as const

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES
