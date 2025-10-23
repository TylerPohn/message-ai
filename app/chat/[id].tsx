import ImageViewer from '@/components/ImageViewer'
import { ReadReceiptIndicator } from '@/components/ReadReceiptIndicator'
import { GroupMembersModal } from '@/components/GroupMembersModal'
import { TranslationMetadataModal } from '@/components/TranslationMetadataModal'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebaseConfig'
import { ImageService } from '@/services/imageService'
import { MessagingService } from '@/services/messagingService'
import { NetworkService, NetworkState } from '@/services/networkService'
import { notificationService } from '@/services/notificationService'
import { OfflineQueueService } from '@/services/offlineQueueService'
import { PresenceData, PresenceService } from '@/services/presenceService'
import { TranslateService } from '@/services/translateService'
import { TypingService, TypingUser } from '@/services/typingService'
import { Conversation, Message, UserProfile, Translation } from '@/types/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { t, Locale, isSupportedLocale } from '@/locales/translations'

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  // Use user's preferred language if available and supported, otherwise default to English
  const locale: Locale = (
    userProfile?.preferredLanguage && isSupportedLocale(userProfile.preferredLanguage)
      ? (userProfile.preferredLanguage as Locale)
      : 'en'
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [messageReadReceipts, setMessageReadReceipts] = useState<
    Map<string, any[]>
  >(new Map())
  const [sending, setSending] = useState(false)
  const [networkState, setNetworkState] = useState<NetworkState>(
    NetworkService.getCurrentState()
  )
  const [queuedMessages, setQueuedMessages] = useState<any[]>([])
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [presenceData, setPresenceData] = useState<PresenceData | null>(null)
  const [otherUserMembership, setOtherUserMembership] = useState<any>(null)
  const [participantProfiles, setParticipantProfiles] = useState<
    Map<string, UserProfile>
  >(new Map())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageViewerVisible, setImageViewerVisible] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [groupMembersModalVisible, setGroupMembersModalVisible] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [translations, setTranslations] = useState<Map<string, any>>(new Map())
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [translationMetadataModalVisible, setTranslationMetadataModalVisible] = useState(false)
  const [selectedTranslationMetadata, setSelectedTranslationMetadata] = useState<Translation | null>(null)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  )
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [lastMessageDoc, setLastMessageDoc] = useState<any>(null)
  const [showOriginalText, setShowOriginalText] = useState<
    Map<string, boolean>
  >(new Map())
  const flashListRef = useRef<any>(null)
  const translatingMessages = useRef<Set<string>>(new Set())
  const translatedMessages = useRef<Set<string>>(new Set()) // Track translated messages to prevent re-translation
  const transatingMessagesLocal = useRef<Set<string>>(new Set()) // Track which messages are currently translating (for UI spinner)
  const loadedTranslations = useRef<Set<string>>(new Set()) // Track translations already loaded to parent
  const textInputRef = useRef<TextInput>(null)
  const shouldAutoScrollRef = useRef(true)
  const isUserScrollingRef = useRef(false)

  // Handle logout redirect
  useEffect(() => {
    if (!user && !authLoading) {
      console.log('User logged out, redirecting to login...')
      router.replace('/auth/login')
    }
  }, [user, authLoading, router])

  // Handle auto-translation of messages
  const handleAutoTranslation = useCallback(
    async (message: Message) => {
      if (!userProfile?.preferredLanguage || !user?.uid) {
        return
      }

      // Mark as translated IMMEDIATELY to prevent race conditions with Firestore listener
      translatedMessages.current.add(message.id)
      // Add to translating set to prevent duplicate attempts
      translatingMessages.current.add(message.id)

      try {
        // Set translating flag in LOCAL ref only (don't write to Firestore to avoid broadcasting to all users)
        // Use ref instead of state to avoid re-renders during translation
        transatingMessagesLocal.current.add(message.id)

        // Use new translateAndStore method that:
        // 1. Checks Firestore for existing translation
        // 2. Calls N8N if not found
        // 3. Stores translation in subcollection with AI features
        const translationResult = await TranslateService.translateAndStore(
          message.id,
          message.text,
          userProfile.preferredLanguage,
          user.uid
        )

        // 🔍 LOG: What did translateAndStore return?
        console.log('📖 [ChatScreen.handleAutoTranslation] Translation result from service:', {
          messageId: message.id,
          translatedTextType: typeof translationResult.translatedText,
          translatedTextValue: translationResult.translatedText,
          translatedTextKeys: typeof translationResult.translatedText === 'object'
            ? Object.keys(translationResult.translatedText)
            : 'N/A',
          fullResult: translationResult
        })

        // 🚨 RUNTIME VALIDATION: Ensure we don't save bad data to state
        if (typeof translationResult.translatedText !== 'string') {
          console.error('🚨 [ChatScreen] INVALID TRANSLATION RESULT!', {
            messageId: message.id,
            type: typeof translationResult.translatedText,
            value: translationResult.translatedText,
            problem: 'translateAndStore returned translatedText as object instead of string'
          })
          throw new Error('Invalid translation result - translatedText must be a string')
        }

        console.log('✅ [ChatScreen] Translation result is valid, saving to state')

        // Update message with detected source language (stored once, shared across users)
        if (!message.detectedLanguage) {
          await updateDoc(doc(db, 'messages', message.id), {
            detectedLanguage: translationResult.detectedSourceLanguage
          })
        }

        // Update translations state to prevent re-translating the same message
        setTranslations((prev) => {
          const newMap = new Map(prev)
          newMap.set(message.id, translationResult)
          return newMap
        })

        // Remove from translating set when complete
        translatingMessages.current.delete(message.id)

        // Clear translating flag from LOCAL ref when translation completes
        transatingMessagesLocal.current.delete(message.id)
      } catch (error) {
        console.error('Error translating message:', error)

        // Clear translating flag from LOCAL ref on error
        transatingMessagesLocal.current.delete(message.id)

        // On error, remove from translated set so it can be retried
        translatedMessages.current.delete(message.id)

        // Remove from translating set on error
        translatingMessages.current.delete(message.id)
      }
    },
    [userProfile?.preferredLanguage, user?.uid]
  )

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

    // Clear translated messages set when conversation changes
    translatedMessages.current.clear()
    translatingMessages.current.clear()
    transatingMessagesLocal.current.clear()
    loadedTranslations.current.clear()

    // Initialize network service
    NetworkService.initialize()

    // Load conversation details and participant profiles
    const loadConversationData = async () => {
      try {
        const conversationData = await MessagingService.getConversation(id)
        if (conversationData) {
          setConversation(conversationData)

          // Set current conversation in notification service to prevent notifications
          notificationService.setCurrentConversation(id)

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

    // Set up real-time listener for all messages (only the latest 50)
    const unsubscribe = MessagingService.listenToConversationMessages(
      id,
      async (updatedMessages) => {
        // Process ALL messages from Firestore to handle status updates
        if (updatedMessages.length > 0) {
          // Mark OTHER users' messages as delivered (receiver logic)
          const messagesToMark = updatedMessages.filter(
            (msg) => msg.senderId !== user.uid && msg.status === 'sent'
          )

          for (const message of messagesToMark) {
            await MessagingService.markMessageAsDelivered(message.id)
          }

          // Update messages state with latest Firestore data
          setMessages(updatedMessages.reverse()) // Reverse to show oldest first

          // Auto-translate new messages if user has auto-translate enabled
          if (userProfile?.autoTranslate && userProfile?.preferredLanguage) {
            // Filter and get only the most recent message that needs translation
            // Use translatedMessages ref instead of state to avoid race conditions
            const messagesToTranslate = updatedMessages
              .filter(
                (msg) =>
                  msg.type === 'text' &&
                  msg.senderId !== user.uid &&
                  !translatedMessages.current.has(msg.id) && // Use ref for immediate check
                  !translatingMessages.current.has(msg.id)
              )
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Most recent first
              .slice(0, 1) // Take only the most recent

            // Translate only the most recent message
            for (const message of messagesToTranslate) {
              await handleAutoTranslation(message)
            }
          }
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

    // Copy refs to variables for use in cleanup function
    const translatingSet = translatingMessages.current
    const translatedSet = translatedMessages.current

    return () => {
      unsubscribe()
      unsubscribeNetwork()

      // Clear current conversation in notification service
      notificationService.setCurrentConversation(null)

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

      // Clear translation tracking sets
      translatingSet.clear()
      translatedSet.clear()
      transatingMessagesLocal.current.clear()
    }
  }, [user, id, userProfile?.autoTranslate, userProfile?.preferredLanguage, handleAutoTranslation])

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
                  // Check if user should be considered offline based on time
                  const isActuallyOffline =
                    PresenceService.isUserOffline(presence)

                  if (isActuallyOffline) {
                    // Show as offline even if status says "online"
                    setPresenceData({
                      status: 'offline',
                      lastSeen: presence.lastSeen
                    })
                  } else {
                    setPresenceData(presence)
                  }
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

          // Update each unread message with read receipt (for group chats)
          const updatePromises = unreadMessages.map((message) =>
            MessagingService.markMessageAsReadByUser(
              message.id,
              id,
              user.uid,
              userProfile?.displayName || user.displayName || 'Unknown User',
              userProfile?.photoURL
            )
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
  }, [user, id, messages, userProfile?.displayName, userProfile?.photoURL])

  // Listen to read receipts for all messages sent by current user
  useEffect(() => {
    if (!user || !id || messages.length === 0 || conversation?.type !== 'group') return

    // Get all messages sent by current user
    const myMessages = messages.filter((msg) => msg.senderId === user.uid)

    if (myMessages.length === 0) return

    // Set up listeners for read receipts on all my messages
    const unsubscribers: Array<() => void> = []

    myMessages.forEach((message) => {
      const unsubscriber = MessagingService.listenToMessageReadReceipts(
        message.id,
        (readReceipts) => {
          setMessageReadReceipts((prev) => {
            const updated = new Map(prev)
            updated.set(message.id, readReceipts)
            return updated
          })
        }
      )
      unsubscribers.push(unsubscriber)
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [user, id, messages, conversation?.type])

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
        t(locale, 'chat.photoIndicator'),
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

    // Message will appear when Firestore write completes

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
        // Message is now queued for offline processing

        // Refresh queued messages to show the newly queued message
        const queued = OfflineQueueService.getQueuedMessagesForConversation(id)
        setQueuedMessages(queued)
      } else {
        // Message successfully sent to Firestore

        // Message status is already correctly set by messagingService.ts
        // No need for artificial delays - status updates happen in real-time
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Error occurred while sending message
      // Restore message text on error
      setMessageText(text)
    } finally {
      setSending(false)
      // Keep keyboard open by refocusing the input after sending
      setTimeout(() => {
        textInputRef.current?.focus()
      }, 0)
    }
  }

  const formatMessageTime = (timestamp: Date) => {
    const hours = String(timestamp.getHours()).padStart(2, '0')
    const minutes = String(timestamp.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Toggle between original and translated text when message text is tapped
  const toggleMessageText = (messageId: string) => {
    setShowOriginalText((prev) => {
      const newMap = new Map(prev)
      // Toggle the current state for this message
      newMap.set(messageId, !newMap.get(messageId))
      return newMap
    })
  }

  // Handle badge tap to show translation metadata modal
  const handleTranslationBadgeTap = (messageId: string) => {
    const translation = translations.get(messageId)
    if (translation) {
      setSelectedTranslationMetadata(translation)
      setTranslationMetadataModalVisible(true)
    }
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.uid
    const messageTime = formatMessageTime(item.timestamp)

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
                if (translations.has(item.id) && !isOwnMessage) {
                  toggleMessageText(item.id)
                }
              }}
              disabled={!translations.has(item.id) || isOwnMessage}
            >
              <Text
                style={[
                  styles.messageText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                ]}
              >
                {(() => {
                  // Show translated text if available and user preference is to show translations
                  const translation = translations.get(item.id)
                  if (
                    translation &&
                    !isOwnMessage &&
                    userProfile?.autoTranslate &&
                    showOriginalText.get(item.id) !== true
                  ) {
                    // 🔍 LOG: What are we about to render?
                    console.log('🎨 [ChatScreen.renderMessage] About to render translation:', {
                      messageId: item.id,
                      translatedTextType: typeof translation.translatedText,
                      translatedTextValue: translation.translatedText,
                      translatedTextKeys: typeof translation.translatedText === 'object'
                        ? Object.keys(translation.translatedText)
                        : 'N/A'
                    })

                    // 🚨 LAST RESORT GUARD: Prevent rendering objects
                    if (typeof translation.translatedText !== 'string') {
                      console.error('🚨🚨🚨 [ChatScreen.renderMessage] PREVENTING REACT ERROR!', {
                        messageId: item.id,
                        type: typeof translation.translatedText,
                        value: translation.translatedText,
                        problem: 'About to render an object in <Text> which will crash React',
                        action: 'Falling back to original text to prevent crash'
                      })
                      // Fall back to original text to prevent crash
                      return item.text
                    }

                    console.log('✅ [ChatScreen.renderMessage] Rendering valid translated text')
                    // translatedText is guaranteed to be a string
                    return translation.translatedText
                  }
                  return item.text
                })()}
              </Text>

              {/* Translation loading indicator */}
              {transatingMessagesLocal.current.has(item.id) && !isOwnMessage && (
                <View style={styles.translationLoading}>
                  <ActivityIndicator size='small' color='#00A884' />
                  <Text style={styles.translationLoadingText}>
                    {t(locale, 'chat.translatingText')}
                  </Text>
                </View>
              )}

              {/* Translation metadata badge */}
              {translations.has(item.id) && !isOwnMessage && (
                <TouchableOpacity
                  style={styles.translationMetadataBadge}
                  onPress={() => handleTranslationBadgeTap(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.translationMetadataBadgeText}>
                    🔍 See details
                  </Text>
                </TouchableOpacity>
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
              <ReadReceiptIndicator
                readBy={messageReadReceipts.get(item.id) || []}
                isGroupChat={conversation?.type === 'group'}
                status={item.status}
              />
            )}
          </View>
          {/* Show "Seen" indicator for direct chats only */}
          {isOwnMessage &&
            isMostRecentUserMessage &&
            item.status === 'read' &&
            conversation?.type === 'direct' &&
            otherUserMembership &&
            otherUserMembership.lastReadMessageId === item.id && (
              <Text style={styles.seenIndicator}>{t(locale, 'chat.seenStatus')}</Text>
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

    // Combine Firestore messages with queued messages
    const allMessages = [...messages, ...queuedAsMessages]

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
        // Priority order: Firestore > Queued
        const messagePriority = message.id.startsWith('queue_') ? 2 : 3
        const existingPriority = existingMessage.id.startsWith('queue_') ? 2 : 3

        // Keep the message with higher priority (Firestore = 3, Queued = 2)
        if (messagePriority > existingPriority) {
          const index = acc.findIndex((m) => m.id === existingMessage.id)
          if (index !== -1) {
            acc[index] = message
          }
        }
        // If same priority, keep the existing one to avoid duplicates
      }

      return acc
    }, [] as Message[])

    // Sort by timestamp
    const finalMessages = deduplicatedMessages.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )

    return finalMessages
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#00A884' />
        <Text style={styles.loadingText}>{t(locale, 'chat.loadingText')}</Text>
      </View>
    )
  }

  // Calculate typing indicator text once to avoid double rendering
  const typingText = user ? TypingService.formatTypingText(typingUsers, user.uid) : ''

  return (
    <View style={styles.safeArea}>
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
          <TouchableOpacity
            style={styles.headerCenter}
            onPress={() => {
              if (conversation?.type === 'group') {
                setGroupMembersModalVisible(true)
              }
            }}
            activeOpacity={conversation?.type === 'group' ? 0.7 : 1}
          >
            <Text style={styles.headerTitle}>{getConversationTitle()}</Text>
            {presenceData && (
              <Text style={styles.presenceStatus}>
                {presenceData.status === 'online'
                  ? t(locale, 'chat.onlineStatus')
                  : (() => {
                      const timeData = PresenceService.formatLastSeen(presenceData.lastSeen)
                      if (timeData === 'now') {
                        return t(locale, 'chat.onlineStatus')
                      }
                      const keyMap = {
                        minutes: 'chat.minutesAgoFormat',
                        hours: 'chat.hoursAgoFormat',
                        days: 'chat.daysAgoFormat'
                      }
                      return t(locale, keyMap[timeData.unit], { time: timeData.value })
                    })()}
              </Text>
            )}
            {getOtherUserStatus() && (
              <Text style={styles.userStatus} numberOfLines={1}>
                {getOtherUserStatus()}
              </Text>
            )}
            {typingText && (
              <Text style={styles.typingIndicator}>
                {typingText}
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
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

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
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
            const isAtBottom = contentOffset.y >= contentSize.height - layoutMeasurement.height - 50

            // User is scrolling if they're not near the bottom
            isUserScrollingRef.current = !isAtBottom
            shouldAutoScrollRef.current = isAtBottom
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            // Only auto-scroll if user isn't scrolling and we should auto-scroll
            if (shouldAutoScrollRef.current && !isUserScrollingRef.current) {
              setTimeout(() => {
                flashListRef.current?.scrollToEnd({ animated: false })
              }, 0)
            }
          }}
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
            ref={textInputRef}
            style={styles.textInput}
            value={messageText}
            onChangeText={handleTextChange}
            placeholder={t(locale, 'chat.messageInputPlaceholder')}
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
              {sending ? t(locale, 'chat.sendingIndicator') : t(locale, 'chat.sendButton')}
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

      {/* Group Members Modal */}
      <GroupMembersModal
        visible={groupMembersModalVisible}
        onClose={() => setGroupMembersModalVisible(false)}
        members={Array.from(participantProfiles.values())}
        title={conversation?.title || 'Group Members'}
      />

      {/* Translation Metadata Modal */}
      <TranslationMetadataModal
        visible={translationMetadataModalVisible}
        translation={selectedTranslationMetadata}
        onClose={() => {
          setTranslationMetadataModalVisible(false)
          setSelectedTranslationMetadata(null)
        }}
      />
    </View>
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
  translationMetadataBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 132, 0.3)'
  },
  translationMetadataBadgeText: {
    fontSize: 11,
    color: '#00A884',
    fontWeight: '500'
  }
})
