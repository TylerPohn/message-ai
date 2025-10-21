import { useAuth } from '@/contexts/AuthContext'
import { MessagingService } from '@/services/messagingService'
import { NetworkService, NetworkState } from '@/services/networkService'
import { OfflineQueueService } from '@/services/offlineQueueService'
import { PresenceData, PresenceService } from '@/services/presenceService'
import {
  Conversation,
  Message,
  MessageStatus,
  UserProfile
} from '@/types/messaging'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
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
  const { user, userProfile, loading: authLoading } = useAuth()
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
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([])
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [presenceData, setPresenceData] = useState<PresenceData | null>(null)
  const [otherUserMembership, setOtherUserMembership] = useState<any>(null)
  const [participantProfiles, setParticipantProfiles] = useState<
    Map<string, UserProfile>
  >(new Map())
  const flatListRef = useRef<FlatList>(null)

  // Handle logout redirect
  useEffect(() => {
    if (!user && !authLoading) {
      console.log('User logged out, redirecting to login...')
      router.replace('/auth/login')
    }
  }, [user, authLoading, router])

  // Platform-specific keyboard handling functions
  const setupIOSKeyboardHandling = () => {
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height)
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    )

    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        setKeyboardHeight(0)
      }
    )

    return { keyboardWillShowListener, keyboardWillHideListener }
  }

  const setupAndroidKeyboardHandling = () => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        // Track keyboard height for Android to prevent accumulation issues
        setKeyboardHeight(event.endCoordinates.height)
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    )

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Reset keyboard height when keyboard is hidden
        setKeyboardHeight(0)
      }
    )

    return { keyboardDidShowListener, keyboardDidHideListener }
  }

  useEffect(() => {
    if (!user || !id) return

    // Initialize network service
    NetworkService.initialize()

    // Load conversation details and participant profiles
    const loadConversationData = async () => {
      try {
        const conversationData = await MessagingService.getConversation(id)
        if (conversationData) {
          setConversation(conversationData)

          // Load participant profiles for all conversations
          const participants =
            await MessagingService.getConversationParticipants(id)
          const profilesMap = new Map<string, UserProfile>()
          participants.forEach((profile) => {
            profilesMap.set(profile.uid, profile)
          })
          setParticipantProfiles(profilesMap)
        }
      } catch (error) {
        console.error('Error loading conversation data:', error)
      }
    }

    loadConversationData()

    // Set up platform-specific keyboard listeners
    let keyboardListeners: any = {}

    if (Platform.OS === 'ios') {
      keyboardListeners = setupIOSKeyboardHandling()
    } else {
      keyboardListeners = setupAndroidKeyboardHandling()
    }

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

        // Clean up optimistic messages that now have Firestore equivalents
        setOptimisticMessages((prev) => {
          return prev.filter((optimistic) => {
            // Check if there's a Firestore message with similar content
            const hasFirestoreEquivalent = uniqueMessages.some(
              (firestore) =>
                firestore.text === optimistic.text &&
                firestore.senderId === optimistic.senderId &&
                Math.abs(
                  firestore.timestamp.getTime() - optimistic.timestamp.getTime()
                ) < 5000
            )
            return !hasFirestoreEquivalent
          })
        })

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

      // Clean up platform-specific keyboard listeners
      if (Platform.OS === 'ios') {
        keyboardListeners.keyboardWillShowListener?.remove()
        keyboardListeners.keyboardWillHideListener?.remove()
      } else {
        keyboardListeners.keyboardDidShowListener?.remove()
        keyboardListeners.keyboardDidHideListener?.remove()
      }
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

  // Set up presence tracking for direct conversations
  useEffect(() => {
    if (!user || !id) return

    let presenceUnsubscribe: (() => void) | null = null

    const setupPresenceTracking = async () => {
      try {
        // Get conversation data to find other participant
        const conversationData = await MessagingService.getConversation(id)
        if (conversationData && conversationData.type === 'direct') {
          const otherParticipant = conversationData.participants.find(
            (participantId: string) => participantId !== user.uid
          )
          if (otherParticipant) {
            // Set up presence tracking
            presenceUnsubscribe = PresenceService.listenToUserPresence(
              otherParticipant,
              (presence) => {
                if (presence) {
                  console.log(
                    `[ChatScreen] Received presence update for ${otherParticipant}:`,
                    {
                      status: presence.status,
                      lastSeen: new Date(presence.lastSeen).toISOString(),
                      age: Math.round((Date.now() - presence.lastSeen) / 1000)
                    }
                  )

                  // Check if user should be considered offline based on time
                  const isActuallyOffline =
                    PresenceService.isUserOffline(presence)

                  console.log(
                    `[ChatScreen] Presence check for ${otherParticipant}:`,
                    {
                      isActuallyOffline,
                      willShowAs: isActuallyOffline
                        ? 'offline'
                        : presence.status
                    }
                  )

                  if (isActuallyOffline) {
                    // Show as offline even if status says "online"
                    setPresenceData({
                      status: 'offline',
                      lastSeen: presence.lastSeen
                    })
                  } else {
                    setPresenceData(presence)
                  }
                } else {
                  console.log(
                    `[ChatScreen] No presence data for ${otherParticipant}`
                  )
                }
              }
            )

            // Get other user's membership for read status
            const membership = await MessagingService.getUserMembership(
              id,
              otherParticipant
            )
            setOtherUserMembership(membership)
          }
        }
      } catch (error) {
        console.error('Error setting up presence tracking:', error)
      }
    }

    setupPresenceTracking()

    return () => {
      if (presenceUnsubscribe) {
        presenceUnsubscribe()
      }
    }
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

    // Create optimistic message for immediate UI feedback
    const optimisticMessage: Message = {
      id: `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: id,
      senderId: user.uid,
      senderName: userProfile.displayName,
      text,
      timestamp: new Date(),
      type: 'text',
      status: 'sending'
    }

    // Add optimistic message immediately
    setOptimisticMessages((prev) => [...prev, optimisticMessage])

    // Scroll to bottom to show new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      const messageId = await MessagingService.sendMessage(
        id,
        user.uid,
        userProfile.displayName,
        text
      )

      // Check if message was queued (offline)
      if (messageId.startsWith('queue_')) {
        // Update optimistic message to show as failed/queued
        setOptimisticMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? { ...msg, status: 'failed' as MessageStatus }
              : msg
          )
        )
      } else {
        // Successfully sent, remove optimistic message
        setOptimisticMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticMessage.id)
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setOptimisticMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      )
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

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.uid
    const messageTime = formatMessageTime(item.timestamp)
    const isQueued = queuedMessages.some((q) => q.id === item.id)
    const isOptimistic = item.id.startsWith('optimistic_')

    // For group messages, determine if we should show sender info
    const allMessages = getAllMessages()
    const showSenderInfo =
      conversation?.type === 'group' &&
      !isOwnMessage &&
      (index === 0 || allMessages[index - 1].senderId !== item.senderId)

    const senderProfile = participantProfiles.get(item.senderId)
    const senderName =
      senderProfile?.displayName || item.senderName || 'Unknown User'

    // Only show status on the most recent message sent by current user
    const userMessages = allMessages.filter((msg) => msg.senderId === user?.uid)
    const isMostRecentUserMessage =
      userMessages.length > 0 &&
      userMessages[userMessages.length - 1].id === item.id

    const getStatusIcon = (
      status: string,
      isQueued: boolean = false,
      isOptimistic: boolean = false
    ) => {
      if (isQueued) {
        return '⏳' // Spinner for queued messages
      }

      if (isOptimistic && status === 'failed') {
        return '✕' // Red X for failed optimistic messages
      }

      if (isOptimistic) {
        return '⏳' // Spinner for optimistic messages
      }

      switch (status) {
        case 'sending':
          return '⏳' // Spinner
        case 'sent':
        case 'delivered':
          return '✓' // Gray checkmark
        case 'read':
          return '✓' // Green checkmark (stays green forever)
        case 'failed':
          return '✕' // Red X for failed/queued messages
        default:
          return ''
      }
    }

    const getStatusColor = (
      status: string,
      isQueued: boolean = false,
      isOptimistic: boolean = false
    ) => {
      if (isQueued) {
        return '#FF9500' // Orange for queued messages
      }

      if (isOptimistic && status === 'failed') {
        return '#FF3B30' // Red for failed optimistic messages
      }

      if (isOptimistic) {
        return '#FF9500' // Orange for optimistic messages
      }

      switch (status) {
        case 'sending':
          return '#FF9500' // Orange
        case 'sent':
        case 'delivered':
          return '#8E8E93' // Gray
        case 'read':
          return '#34C759' // Green (stays green forever)
        case 'failed':
          return '#FF3B30' // Red for failed/queued messages
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
        {showSenderInfo && (
          <View style={styles.senderInfo}>
            <View style={styles.senderAvatar}>
              <Text style={styles.senderAvatarText}>
                {senderName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.senderName}>{senderName}</Text>
          </View>
        )}
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
                  { color: getStatusColor(item.status, isQueued, isOptimistic) }
                ]}
              >
                {getStatusIcon(item.status, isQueued, isOptimistic)}
              </Text>
            )}
          </View>
          {/* Show "Seen" indicator for read messages */}
          {isOwnMessage &&
            isMostRecentUserMessage &&
            item.status === 'read' &&
            otherUserMembership &&
            otherUserMembership.lastReadMessageId === item.id && (
              <Text style={styles.seenIndicator}>Seen</Text>
            )}
        </View>
      </View>
    )
  }

  const getConversationTitle = () => {
    if (!conversation) return 'Chat'

    if (conversation.type === 'group') {
      // Get all participants except current user
      const otherParticipants = conversation.participants.filter(
        (id) => id !== user?.uid
      )

      // Map to display names using participantProfiles
      const names = otherParticipants
        .map((id) => participantProfiles.get(id)?.displayName || 'Unknown')
        .filter((name) => name !== 'Unknown')

      if (names.length === 0) {
        return 'Group Chat'
      }

      return names.join(', ')
    }

    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (id) => id !== user?.uid
      )

      if (otherParticipant) {
        const userProfile = participantProfiles.get(otherParticipant)
        return userProfile?.displayName || 'Unknown User'
      }

      return 'Unknown User'
    }

    return 'Chat'
  }

  // Merge Firestore messages with queued and optimistic messages
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

    // Combine all messages - let the main deduplication handle everything
    const allMessages = [
      ...messages,
      ...queuedAsMessages,
      ...optimisticMessages
    ]

    // Deduplicate messages by checking for similar content
    const deduplicatedMessages = allMessages.reduce((acc, message) => {
      // Check if this message already exists (same text, sender, and timestamp within 5 seconds)
      const existingMessage = acc.find(
        (existing) =>
          existing.text === message.text &&
          existing.senderId === message.senderId &&
          Math.abs(existing.timestamp.getTime() - message.timestamp.getTime()) <
            5000
      )

      if (!existingMessage) {
        acc.push(message)
      } else {
        // If we have a Firestore message and a queued/optimistic message, prefer the Firestore one
        if (
          message.id.startsWith('queue_') ||
          message.id.startsWith('optimistic_')
        ) {
          // Keep the existing (likely Firestore) message
          return acc
        } else {
          // Replace with Firestore message
          const index = acc.findIndex((m) => m.id === existingMessage.id)
          if (index !== -1) {
            acc[index] = message
          }
        }
      }

      return acc
    }, [] as Message[])

    // Sort by timestamp
    return deduplicatedMessages.sort(
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled={Platform.OS === 'ios'}
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
            {presenceData && (
              <Text style={styles.presenceStatus}>
                {presenceData.status === 'online'
                  ? 'Online'
                  : `Last seen ${PresenceService.formatLastSeen(
                      presenceData.lastSeen
                    )}`}
              </Text>
            )}
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
        <View
          style={[
            styles.inputContainer,
            Platform.OS === 'ios' &&
              keyboardHeight > 0 &&
              styles.inputContainerKeyboardIOS,
            Platform.OS === 'android' && styles.inputContainerAndroid,
            Platform.OS === 'android' &&
              keyboardHeight > 0 &&
              styles.inputContainerAndroidKeyboard,
            Platform.OS === 'android' &&
              keyboardHeight > 0 && {
                marginBottom: keyboardHeight - 20
              }
          ]}
        >
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
  inputContainerKeyboardIOS: {
    paddingBottom: 8
  },
  inputContainerAndroid: {
    // Android baseline padding when keyboard is closed - makes input easier to reach
    paddingBottom: 16
  },
  inputContainerAndroidKeyboard: {
    // Android keyboard-active styling - reduced padding when keyboard is open
    paddingBottom: 8
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
  },
  presenceStatus: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 2,
    fontWeight: '500'
  },
  seenIndicator: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 2,
    textAlign: 'right',
    fontWeight: '500'
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 8
  },
  senderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  senderAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93'
  }
})
