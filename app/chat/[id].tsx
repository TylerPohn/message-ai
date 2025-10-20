import { useAuth } from '@/contexts/AuthContext'
import { MessagingService } from '@/services/messagingService'
import { NetworkService, NetworkState } from '@/services/networkService'
import { OfflineQueueService } from '@/services/offlineQueueService'
import { Conversation, Message } from '@/types/messaging'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
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
  const [networkState, setNetworkState] = useState<NetworkState>(
    NetworkService.getCurrentState()
  )
  const [queuedMessages, setQueuedMessages] = useState<any[]>([])
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (!user || !id) return

    // Initialize network service
    NetworkService.initialize()

    // Set up network state listener
    const unsubscribeNetwork = NetworkService.subscribe((state) => {
      setNetworkState(state)
    })

    // Set up real-time listener for messages
    const unsubscribe = MessagingService.listenToConversationMessages(
      id,
      async (updatedMessages) => {
        // Deduplicate messages by ID to prevent duplicates
        const uniqueMessages = updatedMessages.reduce((acc, message) => {
          if (!acc.find((m) => m.id === message.id)) {
            acc.push(message)
          }
          return acc
        }, [] as Message[])

        // Mark new messages as delivered (if not sent by current user)
        const newMessages = uniqueMessages.filter(
          (msg) => msg.senderId !== user.uid && msg.status === 'sent'
        )

        for (const message of newMessages) {
          await MessagingService.markMessageAsDelivered(message.id)
        }

        setMessages(uniqueMessages.reverse()) // Reverse to show oldest first
        setLoading(false)
      }
    )

    // Load queued messages for this conversation
    const loadQueuedMessages = async () => {
      const queued = OfflineQueueService.getQueuedMessagesForConversation(id)
      setQueuedMessages(queued)
    }
    loadQueuedMessages()

    return () => {
      unsubscribe()
      unsubscribeNetwork()
    }
  }, [user, id])

  // Refresh queued messages when network state changes
  useEffect(() => {
    const refreshQueuedMessages = () => {
      const queued = OfflineQueueService.getQueuedMessagesForConversation(id)
      setQueuedMessages(queued)
    }
    refreshQueuedMessages()
  }, [networkState.isOnline, id])

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
    const isQueued = queuedMessages.some((q) => q.id === item.id)

    // Only show status on the most recent message sent by current user
    const allMessages = getAllMessages()
    const userMessages = allMessages.filter((msg) => msg.senderId === user?.uid)
    const isMostRecentUserMessage =
      userMessages.length > 0 &&
      userMessages[userMessages.length - 1].id === item.id

    const getStatusIcon = (status: string, isQueued: boolean = false) => {
      if (isQueued) {
        return '⏳' // Spinner for queued messages
      }

      switch (status) {
        case 'sending':
          return '⏳' // Spinner
        case 'sent':
        case 'delivered':
          return '✓' // Gray checkmark
        case 'read':
          return '✓' // Blue checkmark (stays blue forever)
        default:
          return ''
      }
    }

    const getStatusColor = (status: string, isQueued: boolean = false) => {
      if (isQueued) {
        return '#FF9500' // Orange for queued messages
      }

      switch (status) {
        case 'sending':
          return '#FF9500' // Orange
        case 'sent':
        case 'delivered':
          return '#8E8E93' // Gray
        case 'read':
          return '#34C759' // Green (stays green forever)
        default:
          return '#8E8E93'
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
            {isOwnMessage && isMostRecentUserMessage && (
              <Text
                style={[
                  styles.statusIcon,
                  { color: getStatusColor(item.status, isQueued) }
                ]}
              >
                {getStatusIcon(item.status, isQueued)}
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

  // Merge Firestore messages with queued messages
  const getAllMessages = (): Message[] => {
    // Convert queued messages to Message format
    const queuedAsMessages: Message[] = queuedMessages.map((queued) => ({
      id: queued.id,
      conversationId: queued.conversationId,
      senderId: queued.senderId,
      senderName: queued.senderName,
      text: queued.text,
      timestamp: new Date(queued.timestamp),
      type: queued.type,
      status: 'sending' as const, // Queued messages are always in sending state
      imageURL: queued.imageURL,
      replyTo: queued.replyTo
    }))

    // Combine and sort by timestamp
    const allMessages = [...messages, ...queuedAsMessages]
    return allMessages.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{getConversationTitle()}</Text>
            {!networkState.isOnline && (
              <Text
                style={[
                  styles.networkStatus,
                  { color: NetworkService.getStatusColor() }
                ]}
              >
                {NetworkService.getStatusText()}
              </Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={getAllMessages()}
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
            <Text style={styles.sendButtonText}>
              {sending ? '...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
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
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center'
  },
  networkStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500'
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
    borderTopColor: '#E5E5E7',
    minHeight: 60
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
    minHeight: 40,
    fontSize: 16,
    textAlignVertical: 'top'
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
