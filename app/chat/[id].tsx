import { useAuth } from '@/contexts/AuthContext'
import { MessagingService } from '@/services/messagingService'
import { Conversation, Message } from '@/types/messaging'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (!user || !id) return

    // Set up real-time listener for messages
    const unsubscribe = MessagingService.listenToConversationMessages(
      id,
      (updatedMessages) => {
        // Deduplicate messages by ID to prevent duplicates
        const uniqueMessages = updatedMessages.reduce((acc, message) => {
          if (!acc.find((m) => m.id === message.id)) {
            acc.push(message)
          }
          return acc
        }, [] as Message[])

        setMessages(uniqueMessages.reverse()) // Reverse to show oldest first
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, id])

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (!user || !id || messages.length === 0) return

    const markMessagesAsRead = async () => {
      try {
        // Find the most recent message
        const mostRecentMessage = messages[messages.length - 1]

        // Only mark as read if the current user didn't send the last message
        if (mostRecentMessage && mostRecentMessage.senderId !== user.uid) {
          // Mark conversation as read by updating membership
          await MessagingService.markMessagesAsRead(
            id,
            user.uid,
            mostRecentMessage.id
          )

          // Update message statuses to "read" for messages sent by others
          const unreadMessages = messages.filter(
            (msg) => msg.senderId !== user.uid && msg.status !== 'read'
          )

          // Update each unread message status to "read" (batch for performance)
          const updatePromises = unreadMessages.map((message) =>
            MessagingService.updateMessageStatus(message.id, 'read')
          )

          await Promise.all(updatePromises)
        }
      } catch (error) {
        console.error('Error marking messages as read:', error)
      }
    }

    // Debounce the read status update to avoid excessive calls
    const timeoutId = setTimeout(markMessagesAsRead, 500)
    return () => clearTimeout(timeoutId)
  }, [user, id, messages])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !userProfile || sending) return

    const text = messageText.trim()
    setMessageText('')
    setSending(true)

    try {
      await MessagingService.sendMessage(
        id,
        user.uid,
        userProfile.displayName,
        text
      )

      // The real-time listener will handle adding the message to the UI
      // Scroll to bottom to show new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message text on error
      setMessageText(text)
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.uid
    const messageTime = formatMessageTime(item.timestamp)

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'sending':
          return '⏳'
        case 'sent':
          return '✓'
        case 'delivered':
          return '✓✓'
        case 'read':
          return '✓✓'
        default:
          return ''
      }
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText
            ]}
          >
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
              ]}
            >
              {messageTime}
            </Text>
            {isOwnMessage && (
              <Text style={styles.statusIcon}>
                {getStatusIcon(item.status)}
              </Text>
            )}
          </View>
        </View>
      </View>
    )
  }

  const getConversationTitle = () => {
    if (!conversation) return 'Chat'

    if (conversation.type === 'group' && conversation.title) {
      return conversation.title
    }

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (id) => id !== user?.uid
      )
      return otherParticipant || 'Unknown User'
    }

    return 'Group Chat'
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getConversationTitle()}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={messageText}
          onChangeText={setMessageText}
          placeholder='Type a message...'
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
        >
          <Text style={styles.sendButtonText}>{sending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7'
  },
  backButton: {
    padding: 8
  },
  backButtonText: {
    fontSize: 20,
    color: '#007AFF'
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center'
  },
  headerSpacer: {
    width: 36
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  messageContainer: {
    marginBottom: 8
  },
  ownMessage: {
    alignItems: 'flex-end'
  },
  otherMessage: {
    alignItems: 'flex-start'
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E7'
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20
  },
  ownMessageText: {
    color: '#FFFFFF'
  },
  otherMessageText: {
    color: '#000000'
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4
  },
  ownMessageTime: {
    color: '#FFFFFF',
    opacity: 0.8
  },
  otherMessageTime: {
    color: '#8E8E93'
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  statusIcon: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginLeft: 4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7'
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  sendButtonDisabled: {
    backgroundColor: '#8E8E93'
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
})
