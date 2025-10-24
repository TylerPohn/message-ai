import { Message } from '@/types/messaging'

// Configuration
const N8N_WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL || ''

export interface ConversationContextMessage {
  sender: string
  text: string
  timestamp: string
}

export interface RAGStoreMessagePayload {
  type: 'store_message'
  messageId: string
  chatId: string
  senderId: string
  senderName: string
  recipientId: string
  recipientName: string
  currentMessage: string
  language?: string
  timestamp: string
  conversationContext: ConversationContextMessage[]
}

export interface RAGQueryPayload {
  type: 'rag_query'
  query: string
  chatId?: string
  userId?: string
}

export class RAGService {
  /**
   * Store a message in the RAG system with conversation context
   */
  static async storeMessage(
    message: Message,
    recipientId: string,
    recipientName: string,
    conversationContext: Message[]
  ): Promise<void> {
    if (!N8N_WEBHOOK_URL) {
      console.warn('N8N webhook URL not configured, skipping RAG storage')
      return
    }

    try {
      // Build conversation context array
      const contextMessages: ConversationContextMessage[] = conversationContext.map((msg) => ({
        sender: msg.senderName,
        text: msg.text,
        timestamp: msg.timestamp.toISOString()
      }))

      const payload: RAGStoreMessagePayload = {
        type: 'store_message',
        messageId: message.id,
        chatId: message.conversationId,
        senderId: message.senderId,
        senderName: message.senderName,
        recipientId,
        recipientName,
        currentMessage: message.text,
        language: message.detectedLanguage,
        timestamp: message.timestamp.toISOString(),
        conversationContext: contextMessages
      }

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error('Failed to store message in RAG:', await response.text())
      } else {
        console.log('Message stored in RAG successfully:', message.id)
      }
    } catch (error) {
      console.error('Error storing message in RAG:', error)
      // Don't throw - RAG storage failure shouldn't break messaging
    }
  }

  /**
   * Query the RAG system for relevant information
   */
  static async query(
    query: string,
    chatId?: string,
    targetLang?: string
  ): Promise<any> {
    if (!N8N_WEBHOOK_URL) {
      console.error('🔍 [RAGService] N8N webhook URL not configured')
      throw new Error('N8N webhook URL not configured')
    }

    console.log('🔍 [RAGService] Sending query to n8n:', {
      url: N8N_WEBHOOK_URL,
      query,
      chatId,
      targetLang
    })

    try {
      const payload = {
        type: 'rag_query',
        query,
        chatId,
        target_lang: targetLang
      }

      console.log('🔍 [RAGService] Payload:', JSON.stringify(payload, null, 2))

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log('🔍 [RAGService] Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔍 [RAGService] Request failed:', errorText)
        throw new Error(`RAG query failed: ${errorText}`)
      }

      const data = await response.json()
      console.log('🔍 [RAGService] Response data:', JSON.stringify(data, null, 2))

      return data
    } catch (error) {
      console.error('🔍 [RAGService] Error querying RAG:', error)
      throw error
    }
  }
}
