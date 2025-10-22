import ImageViewer from '@/components/ImageViewer'
import { useAuth } from '@/contexts/AuthContext'
import { ImageService } from '@/services/imageService'
import { MessagingService } from '@/services/messagingService'
import { NetworkService, NetworkState } from '@/services/networkService'
import { OfflineQueueService } from '@/services/offlineQueueService'
import { PresenceData, PresenceService } from '@/services/presenceService'
import { TranslateService } from '@/services/translateService'
import { TypingService, TypingUser } from '@/services/typingService'
import {
  Conversation,
  Message,
  MessageStatus,
  UserProfile
} from '@/types/messaging'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageViewerVisible, setImageViewerVisible] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  )
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [lastMessageDoc, setLastMessageDoc] = useState<any>(null)
  const [showOriginalText, setShowOriginalText] = useState<
    Map<string, boolean>
  >(new Map())
  const [translationQueue, setTranslationQueue] = useState<Message[]>([])
  const [isTranslatingBulk, setIsTranslatingBulk] = useState(false)
  const [translationProgress, setTranslationProgress] = useState({
    current: 0,
    total: 0
  })
  const flashListRef = useRef<any>(null)

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
          flashListRef.current?.scrollToEnd({ animated: true })
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
          flashListRef.current?.scrollToEnd({ animated: true })
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

    console.log('🔄 [ChatScreen] Initializing chat screen...')
    console.log('🔄 [ChatScreen] User:', user?.uid)
    console.log('🔄 [ChatScreen] User profile:', {
      autoTranslate: userProfile?.autoTranslate,
      preferredLanguage: userProfile?.preferredLanguage,
      displayName: userProfile?.displayName
    })

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

    // Load initial messages with pagination
    const loadInitialMessages = async () => {
      try {
        const result = await MessagingService.getConversationMessages(id, 50)
        const loadedMessages = result.messages.reverse() // Reverse to show oldest first
        setMessages(loadedMessages)
        setLastMessageDoc(result.lastDoc)
        setHasMoreMessages(result.messages.length === 50)
        setLoading(false)
      } catch (error) {
        console.error('Error loading initial messages:', error)
        setLoading(false)
      }
    }

    loadInitialMessages()

    // Set up real-time listener for new messages (only the latest 50)
    const unsubscribe = MessagingService.listenToConversationMessages(
      id,
      async (updatedMessages) => {
        // Only process new messages (not paginated ones)
        const newMessages = updatedMessages.filter(
          (msg) => !messages.some((existing) => existing.id === msg.id)
        )

        if (newMessages.length > 0) {
          // Mark new messages as delivered (if not sent by current user)
          const messagesToMark = newMessages.filter(
            (msg) => msg.senderId !== user.uid && msg.status === 'sent'
          )

          for (const message of messagesToMark) {
            await MessagingService.markMessageAsDelivered(message.id)
          }

          // Auto-translate new messages if user has auto-translate enabled
          console.log('🔄 [ChatScreen] Checking auto-translation conditions...')
          console.log(
            '🔄 [ChatScreen] userProfile?.autoTranslate:',
            userProfile?.autoTranslate
          )
          console.log(
            '🔄 [ChatScreen] userProfile?.preferredLanguage:',
            userProfile?.preferredLanguage
          )
          console.log('🔄 [ChatScreen] newMessages count:', newMessages.length)

          if (userProfile?.autoTranslate && userProfile?.preferredLanguage) {
            console.log(
              '✅ [ChatScreen] Auto-translate is enabled, filtering messages...'
            )

            // Filter and get only the most recent message that needs translation
            const messagesToTranslate = newMessages
              .filter(
                (msg) =>
                  msg.type === 'text' &&
                  msg.senderId !== user.uid &&
                  !msg.translatedText &&
                  !msg.isTranslating
              )
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Most recent first
              .slice(0, 1) // Take only the most recent

            console.log(
              '🔄 [ChatScreen] Messages to translate:',
              messagesToTranslate.length
            )
            console.log(
              '🔄 [ChatScreen] Message details:',
              messagesToTranslate.map((msg) => ({
                id: msg.id,
                text: msg.text?.substring(0, 30) + '...',
                senderId: msg.senderId,
                hasTranslatedText: !!msg.translatedText,
                isTranslating: !!msg.isTranslating
              }))
            )

            // Translate only the most recent message
            for (const message of messagesToTranslate) {
              console.log(
                '🔄 [ChatScreen] Starting translation for message:',
                message.id
              )
              await handleAutoTranslation(message)
            }
          } else {
            console.log(
              '❌ [ChatScreen] Auto-translate disabled or missing settings:',
              {
                autoTranslate: userProfile?.autoTranslate,
                preferredLanguage: userProfile?.preferredLanguage
              }
            )
          }

          // Clean up optimistic messages that now have Firestore equivalents
          setOptimisticMessages((prev) => {
            return prev.filter((optimistic) => {
              // Check if there's a Firestore message with similar content
              const hasFirestoreEquivalent = newMessages.some(
                (firestore) =>
                  firestore.text === optimistic.text &&
                  firestore.senderId === optimistic.senderId &&
                  Math.abs(
                    firestore.timestamp.getTime() -
                      optimistic.timestamp.getTime()
                  ) < 5000
              )
              return !hasFirestoreEquivalent
            })
          })

          // Add new messages to existing messages
          setMessages((prev) => {
            const combined = [...prev, ...newMessages]
            return combined.sort(
              (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
            )
          })
        }
      },
      50 // Only listen to latest 50 messages for real-time updates
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

      // Clear typing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }

      // Cancel pending translations when leaving chat
      setIsTranslatingBulk(false)
      setTranslationQueue([])
      setTranslationProgress({ current: 0, total: 0 })
    }
  }, [user, id, typingTimeout, messages])

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

  // Set up typing indicators for all conversations (direct and group)
  useEffect(() => {
    if (!user || !id) return

    let typingUnsubscribe: (() => void) | null = null

    const setupTypingIndicators = async () => {
      try {
        // Set up typing indicator listener for this conversation
        typingUnsubscribe = TypingService.listenToTypingIndicators(
          id,
          (typingUsers) => {
            console.log(`[ChatScreen] Typing users update:`, typingUsers)
            setTypingUsers(typingUsers)
          }
        )
      } catch (error) {
        console.error('Error setting up typing indicators:', error)
      }
    }

    setupTypingIndicators()

    return () => {
      if (typingUnsubscribe) {
        typingUnsubscribe()
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

  // Handle image picker
  const handleImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Camera', 'Photo Library'],
          cancelButtonIndex: 0
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto()
          } else if (buttonIndex === 2) {
            handleSelectFromGallery()
          }
        }
      )
    } else {
      Alert.alert('Select Image', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: handleTakePhoto },
        { text: 'Photo Library', onPress: handleSelectFromGallery }
      ])
    }
  }

  const handleTakePhoto = async () => {
    try {
      const result = await ImageService.pickImageFromCamera()
      if (result && !result.canceled) {
        setSelectedImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    }
  }

  const handleSelectFromGallery = async () => {
    try {
      const result = await ImageService.pickImageFromGallery()
      if (result && !result.canceled) {
        setSelectedImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error selecting image:', error)
      Alert.alert('Error', 'Failed to select image. Please try again.')
    }
  }

  const handleSendImage = async () => {
    if (!selectedImage || !user || !userProfile || uploadingImage) return

    setUploadingImage(true)
    setUploadProgress(0)

    try {
      // Process and upload image
      const uploadResult = await ImageService.processAndUploadImage(
        selectedImage,
        id,
        user.uid,
        (progress) => setUploadProgress(progress)
      )

      // Send message with image
      await MessagingService.sendMessage(
        id,
        user.uid,
        userProfile.displayName,
        '📷 Photo',
        'image',
        uploadResult.imageURL,
        uploadResult.thumbnailURL,
        uploadResult.metadata
      )

      // Clean up
      setSelectedImage(null)
      setUploadProgress(0)
    } catch (error) {
      console.error('Error sending image:', error)
      Alert.alert('Error', 'Failed to send image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  // Handle text input changes with typing indicators
  // Load more messages for pagination
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages || !lastMessageDoc) return

    setLoadingMore(true)
    try {
      const result = await MessagingService.getConversationMessages(
        id,
        50,
        lastMessageDoc
      )

      if (result.messages.length > 0) {
        // Prepend older messages to the beginning of the list
        setMessages((prev) => {
          const combined = [...result.messages.reverse(), ...prev]
          return combined.sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          )
        })
        setLastMessageDoc(result.lastDoc)
        setHasMoreMessages(result.messages.length === 50)
      } else {
        setHasMoreMessages(false)
      }
    } catch (error) {
      console.error('Error loading more messages:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleTextChange = async (text: string) => {
    setMessageText(text)

    if (!user || !id) return

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    if (text.length > 0) {
      // User is typing
      await TypingService.setUserTyping(id, user.uid, true)

      // Set timeout to clear typing after 5 seconds of inactivity
      const timeout = setTimeout(async () => {
        await TypingService.setUserTyping(id, user.uid, false)
        setTypingTimeout(null)
      }, 5000) as unknown as NodeJS.Timeout

      setTypingTimeout(timeout)
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !userProfile || sending) return

    const text = messageText.trim()
    setMessageText('')
    setSending(true)

    // Clear typing indicator when sending message
    if (user && id) {
      await TypingService.setUserTyping(id, user.uid, false)
    }

    // Clear typing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    }

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
      flashListRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      const messageId = await MessagingService.sendMessage(
        id,
        user.uid,
        userProfile.displayName,
        text,
        'text'
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

  // Handle auto-translation of messages
  const handleAutoTranslation = async (message: Message) => {
    console.log(
      '🔄 [handleAutoTranslation] Starting translation for message:',
      message.id
    )
    console.log(
      '🔄 [handleAutoTranslation] Message text:',
      message.text?.substring(0, 50) + '...'
    )
    console.log(
      '🔄 [handleAutoTranslation] User preferred language:',
      userProfile?.preferredLanguage
    )

    if (!userProfile?.preferredLanguage) {
      console.log(
        '❌ [handleAutoTranslation] No preferred language set, skipping translation'
      )
      return
    }

    try {
      console.log(
        '🔄 [handleAutoTranslation] Marking message as translating...'
      )
      // Set translating flag
      await MessagingService.setMessageTranslating(message.id, true)

      console.log('🔄 [handleAutoTranslation] Detecting language...')
      // Detect language first
      const detectedLanguage = await TranslateService.detectLanguage(
        message.text
      )
      console.log(
        '✅ [handleAutoTranslation] Detected language:',
        detectedLanguage
      )

      // Only translate if the detected language is different from user's preferred language
      if (detectedLanguage !== userProfile.preferredLanguage) {
        console.log(
          '🔄 [handleAutoTranslation] Languages differ, translating...'
        )
        const translationResult = await TranslateService.translateMessage(
          message.text,
          userProfile.preferredLanguage
        )
        console.log(
          '✅ [handleAutoTranslation] Translation result:',
          translationResult
        )

        console.log(
          '🔄 [handleAutoTranslation] Updating message with translation...'
        )
        // Update message with translation
        await MessagingService.updateMessageTranslation(
          message.id,
          translationResult.translatedText || translationResult.message,
          detectedLanguage,
          userProfile.preferredLanguage
        )
        console.log(
          '✅ [handleAutoTranslation] Translation completed successfully'
        )
      } else {
        console.log(
          '✅ [handleAutoTranslation] Same language detected, clearing translating flag'
        )
        // If same language, just clear the translating flag
        await MessagingService.setMessageTranslating(message.id, false)
      }
    } catch (error) {
      console.error(
        '❌ [handleAutoTranslation] Error auto-translating message:',
        error
      )
      console.error('❌ [handleAutoTranslation] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      // Clear translating flag on error
      try {
        await MessagingService.setMessageTranslating(message.id, false)
      } catch (clearError) {
        console.error('Error clearing translating flag:', clearError)
      }
    }
  }

  // Process translation queue with rate limiting
  const processTranslationQueue = async () => {
    if (isTranslatingBulk || translationQueue.length === 0) return

    setIsTranslatingBulk(true)
    setTranslationProgress({ current: 0, total: translationQueue.length })

    const queue = [...translationQueue]
    setTranslationQueue([])

    for (let i = 0; i < queue.length; i++) {
      const message = queue[i]
      setTranslationProgress({ current: i + 1, total: queue.length })

      try {
        await handleAutoTranslation(message)
      } catch (error) {
        console.error('Error translating message in queue:', error)
      }

      // Rate limiting: 500ms delay between translations
      if (i < queue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    setIsTranslatingBulk(false)
    setTranslationProgress({ current: 0, total: 0 })
  }

  // Add messages to translation queue (for bulk translation)
  const addToTranslationQueue = (messages: Message[]) => {
    const untranslatedMessages = messages.filter(
      (msg) =>
        msg.type === 'text' &&
        msg.senderId !== user?.uid &&
        !msg.translatedText &&
        !msg.isTranslating
    )

    if (untranslatedMessages.length > 0) {
      setTranslationQueue((prev) => [...prev, ...untranslatedMessages])
    }
  }

  // Toggle between original and translated text
  const toggleMessageText = (messageId: string) => {
    setShowOriginalText((prev) => {
      const newMap = new Map(prev)
      newMap.set(messageId, !newMap.get(messageId))
      return newMap
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
              {(() => {
                const senderProfile = participantProfiles.get(item.senderId)
                return senderProfile?.photoURL ? (
                  <Image
                    source={{ uri: senderProfile.photoURL }}
                    style={styles.senderAvatarImage}
                    resizeMode='cover'
                  />
                ) : (
                  <Text style={styles.senderAvatarText}>
                    {senderName.charAt(0).toUpperCase()}
                  </Text>
                )
              })()}
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
          {item.type === 'image' && item.thumbnailURL ? (
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(item.imageURL || '')
                setImageViewerVisible(true)
              }}
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: item.thumbnailURL }}
                style={styles.messageImage}
                resizeMode='cover'
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (item.translatedText && !isOwnMessage) {
                  toggleMessageText(item.id)
                }
              }}
              disabled={!item.translatedText || isOwnMessage}
            >
              <Text
                style={[
                  styles.messageText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                ]}
              >
                {(() => {
                  // Show translated text if available and user preference is to show translations
                  if (
                    item.translatedText &&
                    !isOwnMessage &&
                    userProfile?.autoTranslate &&
                    !showOriginalText.get(item.id)
                  ) {
                    return item.translatedText
                  }
                  return item.text
                })()}
              </Text>

              {/* Translation indicators */}
              {item.translatedText && !isOwnMessage && (
                <View style={styles.translationIndicator}>
                  <Text style={styles.translationText}>
                    {showOriginalText.get(item.id)
                      ? `Translated from ${item.detectedLanguage?.toUpperCase()}`
                      : 'Tap to show original'}
                  </Text>
                </View>
              )}

              {/* Translation loading indicator */}
              {item.isTranslating && !isOwnMessage && (
                <View style={styles.translationLoading}>
                  <ActivityIndicator size='small' color='#00A884' />
                  <Text style={styles.translationLoadingText}>
                    Translating...
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
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

  const getOtherUserStatus = () => {
    if (!conversation || conversation.type !== 'direct') return null

    const otherParticipant = conversation.participants.find(
      (id) => id !== user?.uid
    )

    if (otherParticipant) {
      const userProfile = participantProfiles.get(otherParticipant)
      return userProfile?.status || null
    }

    return null
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
        <ActivityIndicator size='large' color='#00A884' />
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
            {getOtherUserStatus() && (
              <Text style={styles.userStatus} numberOfLines={1}>
                {getOtherUserStatus()}
              </Text>
            )}
            {typingUsers.length > 0 && user && (
              <Text style={styles.typingIndicator}>
                {TypingService.formatTypingText(typingUsers, user.uid)}
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

        {/* Translation Progress Indicator */}
        {isTranslatingBulk && (
          <View style={styles.translationProgressBanner}>
            <ActivityIndicator size='small' color='#00A884' />
            <Text style={styles.translationProgressText}>
              Translating messages... ({translationProgress.current}/
              {translationProgress.total})
            </Text>
            <TouchableOpacity
              style={styles.translationProgressClose}
              onPress={() => {
                setIsTranslatingBulk(false)
                setTranslationQueue([])
                setTranslationProgress({ current: 0, total: 0 })
              }}
            >
              <Text style={styles.translationProgressCloseText}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Messages */}
        <FlashList
          ref={flashListRef}
          data={getAllMessages()}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.5}
          onContentSizeChange={() =>
            flashListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flashListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size='small' color='#00A884' />
                <Text style={styles.loadingMoreText}>
                  Loading more messages...
                </Text>
              </View>
            ) : null
          }
        />

        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.imagePreview}
            />
            <View style={styles.imagePreviewActions}>
              <TouchableOpacity
                style={styles.cancelImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.cancelImageText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendImageButton,
                  uploadingImage && styles.sendImageButtonDisabled
                ]}
                onPress={handleSendImage}
                disabled={uploadingImage}
              >
                <Text style={styles.sendImageText}>
                  {uploadingImage
                    ? `Uploading ${Math.round(uploadProgress)}%`
                    : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
            {uploadingImage && (
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                />
              </View>
            )}
          </View>
        )}

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
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleImagePicker}
            disabled={uploadingImage}
          >
            <Ionicons name='camera-outline' size={20} color='#FFFFFF' />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={handleTextChange}
            placeholder='Type a message...'
            placeholderTextColor='#8696A0'
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

      {/* Image Viewer Modal */}
      <ImageViewer
        visible={imageViewerVisible}
        imageURL={selectedImage || ''}
        senderName={
          conversation?.type === 'group' ? 'Unknown' : getConversationTitle()
        }
        timestamp={new Date()}
        onClose={() => {
          setImageViewerVisible(false)
          setSelectedImage(null)
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B141A'
  },
  container: {
    flex: 1,
    backgroundColor: '#0B141A'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B141A'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8696A0'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
    backgroundColor: '#1F2C34'
  },
  backButton: {
    padding: 8
  },
  backButtonText: {
    fontSize: 20,
    color: '#00A884'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E9EDEF',
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
    backgroundColor: '#0B141A'
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
    backgroundColor: '#005C4B',
    borderBottomRightRadius: 4
  },
  otherMessageBubble: {
    backgroundColor: '#1F2C34',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A3942'
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20
  },
  ownMessageText: {
    color: '#FFFFFF'
  },
  otherMessageText: {
    color: '#E9EDEF'
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
    color: '#8696A0'
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
    backgroundColor: '#1F2C34',
    borderTopWidth: 1,
    borderTopColor: '#2A3942',
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
    borderColor: '#2A3942',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    minHeight: 40,
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: '#2A3942',
    color: '#E9EDEF'
  },
  sendButton: {
    backgroundColor: '#00A884',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  sendButtonDisabled: {
    backgroundColor: '#374955'
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  presenceStatus: {
    fontSize: 12,
    color: '#00A884',
    marginTop: 2,
    fontWeight: '500'
  },
  userStatus: {
    fontSize: 12,
    color: '#8696A0',
    marginTop: 2,
    fontStyle: 'italic'
  },
  typingIndicator: {
    fontSize: 12,
    color: '#00A884',
    marginTop: 2,
    fontWeight: '500',
    fontStyle: 'italic'
  },
  seenIndicator: {
    fontSize: 11,
    color: '#00A884',
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
  senderAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8696A0'
  },
  // Image-related styles
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 200,
    maxHeight: 200
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A3942',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  imagePreviewContainer: {
    backgroundColor: '#1F2C34',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A3942'
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 12
  },
  imagePreviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cancelImageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FF3B30'
  },
  cancelImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  sendImageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#00A884'
  },
  sendImageButtonDisabled: {
    backgroundColor: '#374955'
  },
  sendImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E7',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00A884',
    borderRadius: 2
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8696A0'
  },
  translationIndicator: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  translationText: {
    fontSize: 10,
    color: '#00A884',
    fontStyle: 'italic'
  },
  translationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  translationLoadingText: {
    fontSize: 10,
    color: '#00A884',
    marginLeft: 4,
    fontStyle: 'italic'
  },
  translationProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942'
  },
  translationProgressText: {
    fontSize: 14,
    color: '#00A884',
    marginLeft: 8,
    flex: 1
  },
  translationProgressClose: {
    padding: 4
  },
  translationProgressCloseText: {
    fontSize: 18,
    color: '#00A884',
    fontWeight: 'bold'
  }
})
