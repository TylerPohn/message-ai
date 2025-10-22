import { WhatsAppColors } from '@/constants/theme'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { db } from '@/firebaseConfig'
import { MessagingService } from '@/services/messagingService'
import { NetworkService, NetworkState } from '@/services/networkService'
import { OfflineQueueService } from '@/services/offlineQueueService'
import { PresenceData, PresenceService } from '@/services/presenceService'
import { UserCacheService } from '@/services/userCacheService'
import { Conversation, UserProfile } from '@/types/messaging'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { doc, onSnapshot } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

export default function ChatsScreen() {
  const { user, userProfile, logout } = useAuth()
  const { showBanner } = useNotifications()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(
    new Map()
  )
  const [userMemberships, setUserMemberships] = useState<Map<string, any>>(
    new Map()
  )
  const [networkState, setNetworkState] = useState<NetworkState>(
    NetworkService.getCurrentState()
  )
  const [queueStats, setQueueStats] = useState({ totalMessages: 0, pending: 0 })
  const [presenceData, setPresenceData] = useState<Map<string, PresenceData>>(
    new Map()
  )

  // Handle logout redirect
  useEffect(() => {
    if (!user && !loading) {
      console.log('User logged out, redirecting to login...')
      router.replace('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    // Initialize services
    NetworkService.initialize()
    OfflineQueueService.initialize()

    // Set up network state listener
    const unsubscribeNetwork = NetworkService.subscribe((state) => {
      setNetworkState(state)
    })

    // Set up queue stats listener
    const updateQueueStats = () => {
      const stats = OfflineQueueService.getQueueStats()
      setQueueStats({
        totalMessages: stats.totalMessages,
        pending: stats.retryStats.pending
      })
    }
    updateQueueStats()

    // Set up real-time listener for conversations
    const unsubscribe = MessagingService.listenToUserConversations(
      user.uid,
      async (updatedConversations) => {
        setConversations(updatedConversations)

        // Fetch user profiles for all participants
        const allParticipantIds = new Set<string>()
        updatedConversations.forEach((conv) => {
          conv.participants.forEach((pid) => {
            if (pid !== user.uid) {
              allParticipantIds.add(pid)
            }
          })
        })

        if (allParticipantIds.size > 0) {
          const profiles = await UserCacheService.getUserProfiles(
            Array.from(allParticipantIds)
          )
          setUserProfiles(profiles)

          // Clean up existing presence listeners before setting up new ones
          if ((window as any).presenceUnsubscribers) {
            console.log('[ChatList] Cleaning up existing presence listeners...')
            ;(window as any).presenceUnsubscribers.forEach(
              (unsub: () => void) => unsub()
            )
            ;(window as any).presenceUnsubscribers = []
          }

          // Set up presence listeners for all participants
          console.log(
            `[ChatList] Setting up presence listeners for ${allParticipantIds.size} participants`
          )
          const presenceUnsubscribers: (() => void)[] = []

          for (const participantId of allParticipantIds) {
            const unsubscribe = PresenceService.listenToUserPresence(
              participantId,
              (presence) => {
                if (presence) {
                  console.log(
                    `[ChatList] Received presence update for ${participantId}:`,
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
                    `[ChatList] Presence check for ${participantId}:`,
                    {
                      isActuallyOffline,
                      willShowAs: isActuallyOffline
                        ? 'offline'
                        : presence.status
                    }
                  )

                  setPresenceData((prev) => {
                    const newMap = new Map(prev)
                    if (isActuallyOffline) {
                      // Show as offline even if status says "online"
                      newMap.set(participantId, {
                        status: 'offline',
                        lastSeen: presence.lastSeen
                      })
                    } else {
                      newMap.set(participantId, presence)
                    }
                    return newMap
                  })
                } else {
                  console.log(
                    `[ChatList] No presence data for ${participantId}`
                  )
                }
              }
            )
            presenceUnsubscribers.push(unsubscribe)
          }

          // Store unsubscribers for cleanup
          ;(window as any).presenceUnsubscribers = presenceUnsubscribers

          // Set up real-time status listeners for all participants
          console.log(
            `[ChatList] Setting up status listeners for ${allParticipantIds.size} participants`
          )
          const statusUnsubscribers: (() => void)[] = []

          for (const participantId of allParticipantIds) {
            const userRef = doc(db, 'users', participantId)
            const unsubscribe = onSnapshot(
              userRef,
              (doc) => {
                if (doc.exists()) {
                  const userData = doc.data() as UserProfile
                  console.log(
                    `[ChatList] Received status update for ${participantId}:`,
                    {
                      displayName: userData.displayName,
                      status: userData.status,
                      statusUpdatedAt: userData.statusUpdatedAt
                    }
                  )

                  // Update local cache with real-time data
                  UserCacheService.handleRealtimeUpdate(userData)

                  // Update local state to trigger re-render
                  setUserProfiles((prev) => {
                    const newMap = new Map(prev)
                    newMap.set(participantId, userData)
                    return newMap
                  })
                }
              },
              (error) => {
                console.error(
                  `[ChatList] Error listening to status for ${participantId}:`,
                  error
                )
              }
            )
            statusUnsubscribers.push(unsubscribe)
          }

          // Store status unsubscribers for cleanup
          ;(window as any).statusUnsubscribers = statusUnsubscribers
        }

        // Fetch user memberships for read status
        const membershipPromises = updatedConversations.map(async (conv) => {
          const membership = await MessagingService.getUserMembership(
            conv.id,
            user.uid
          )
          return { conversationId: conv.id, membership }
        })

        const memberships = await Promise.all(membershipPromises)
        const membershipMap = new Map()
        memberships.forEach(({ conversationId, membership }) => {
          membershipMap.set(conversationId, membership)
        })
        setUserMemberships(membershipMap)

        setLoading(false)
      }
    )

    return () => {
      unsubscribe()
      unsubscribeNetwork()
      // Clean up presence listeners
      if ((window as any).presenceUnsubscribers) {
        ;(window as any).presenceUnsubscribers.forEach((unsub: () => void) =>
          unsub()
        )
        ;(window as any).presenceUnsubscribers = []
      }
      // Clean up status listeners
      if ((window as any).statusUnsubscribers) {
        ;(window as any).statusUnsubscribers.forEach((unsub: () => void) =>
          unsub()
        )
        ;(window as any).statusUnsubscribers = []
      }
    }
  }, [user])

  // Periodic presence data refresh to update stale status
  useEffect(() => {
    const refreshPresenceData = () => {
      setPresenceData((prev) => {
        const newMap = new Map()
        let hasChanges = false

        prev.forEach((presence, userId) => {
          // Re-check if user should be considered offline
          const isActuallyOffline = PresenceService.isUserOffline(presence)

          if (isActuallyOffline && presence.status === 'online') {
            // User should be shown as offline
            newMap.set(userId, {
              status: 'offline',
              lastSeen: presence.lastSeen
            })
            hasChanges = true
          } else {
            newMap.set(userId, presence)
          }
        })

        return hasChanges ? newMap : prev
      })
    }

    // Refresh every 5 seconds to catch stale presence
    const interval = setInterval(() => {
      console.log('[ChatList] Refreshing presence data...')
      refreshPresenceData()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Clear cache and refetch profiles when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user && conversations.length > 0) {
        // Clear cache for all participants to force fresh data
        const allParticipantIds = new Set<string>()
        conversations.forEach((conv) => {
          conv.participants.forEach((pid) => {
            if (pid !== user.uid) {
              allParticipantIds.add(pid)
              UserCacheService.clearUserCache(pid)
            }
          })
        })

        console.log(
          '[ChatList] Cleared cache for participants on focus:',
          Array.from(allParticipantIds)
        )
        // Refetch will happen automatically when userProfiles state updates
      }
    }, [conversations, user])
  )

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return timestamp.toLocaleDateString()
  }

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      // Get all participants except current user
      const otherParticipants = conversation.participants.filter(
        (id) => id !== user?.uid
      )

      // Map to display names
      const names = otherParticipants
        .map((id) => userProfiles.get(id)?.displayName || 'Unknown')
        .filter((name) => name !== 'Unknown')

      if (names.length === 0) {
        return 'Group Chat'
      }

      // Return comma-separated list
      return names.join(', ')
    }

    // For direct messages, show the other participant's display name
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (id) => id !== user?.uid
      )

      if (otherParticipant) {
        const userProfile = userProfiles.get(otherParticipant)
        return userProfile?.displayName || 'Unknown User'
      }

      return 'Unknown User'
    }

    return 'Chat'
  }

  const getConversationSubtitle = (conversation: Conversation) => {
    if (conversation.lastMessage) {
      // Handle image messages
      if (conversation.lastMessage.type === 'image') {
        if (conversation.type === 'group') {
          return `${conversation.lastMessage.senderName}: 📷 Photo`
        }
        return '📷 Photo'
      }

      // For group messages, show sender name
      if (conversation.type === 'group') {
        return `${conversation.lastMessage.senderName}: ${conversation.lastMessage.text}`
      }
      // For direct messages, just show the message text
      return conversation.lastMessage.text
    }
    return 'No messages yet'
  }

  const getPresenceStatus = (conversation: Conversation) => {
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (id) => id !== user?.uid
      )
      if (otherParticipant) {
        const presence = presenceData.get(otherParticipant)
        if (presence) {
          if (presence.status === 'online') {
            return 'Online'
          } else {
            return `Last seen ${PresenceService.formatLastSeen(
              presence.lastSeen
            )}`
          }
        }
      }
    }
    return null
  }

  const isMessageUnread = (conversation: Conversation) => {
    if (!conversation.lastMessage) return false

    // If the current user sent the last message, it's not unread for them
    if (conversation.lastMessage.senderId === user?.uid) return false

    const membership = userMemberships.get(conversation.id)
    if (!membership || !membership.lastReadMessageId) return true

    return conversation.lastMessage.id !== membership.lastReadMessageId
  }

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chat/${conversation.id}`)
  }

  const handleNewConversation = () => {
    router.push('/chat/new')
  }

  const testNotification = () => {
    const testBanner = {
      id: 'test-' + Date.now(),
      conversationId: 'test-conversation',
      senderId: 'test-sender',
      senderName: 'Test User',
      senderAvatar: undefined,
      messageText: 'This is a test notification banner!',
      messageType: 'text' as const,
      timestamp: Date.now()
    }
    showBanner(testBanner)
  }

  const renderConversation = ({ item }: { item: Conversation }) => {
    const presenceStatus = getPresenceStatus(item)
    const isOnline = presenceStatus === 'Online'

    // Get avatar for direct messages
    const getAvatarForConversation = () => {
      if (item.type === 'group') {
        return null // Groups use initials for now
      }

      // For direct messages, find the other participant
      const otherParticipantId = item.participants.find(
        (id) => id !== user?.uid
      )
      if (otherParticipantId) {
        const otherUserProfile = userProfiles.get(otherParticipantId)
        return otherUserProfile?.photoURL
      }
      return null
    }

    const avatarURL = getAvatarForConversation()

    // Get other user's profile for status display (direct messages only)
    const otherUserProfile =
      item.type === 'direct'
        ? userProfiles.get(
            item.participants.find((id) => id !== user?.uid) || ''
          )
        : null

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {avatarURL ? (
              <Image
                source={{ uri: avatarURL }}
                style={styles.avatarImage}
                resizeMode='cover'
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.type === 'group'
                  ? item.participants
                      .filter((id) => id !== user?.uid)[0]
                      ?.charAt(0)
                      .toUpperCase() || 'G'
                  : getConversationTitle(item).charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle} numberOfLines={1}>
              {getConversationTitle(item)}
            </Text>
            <Text style={styles.timestamp}>
              {item.lastMessage
                ? formatTimestamp(item.lastMessage.timestamp)
                : ''}
            </Text>
          </View>

          <Text
            style={[
              styles.conversationSubtitle,
              isMessageUnread(item) && styles.unreadMessage
            ]}
            numberOfLines={2}
          >
            {getConversationSubtitle(item)}
          </Text>

          {presenceStatus && (
            <Text style={styles.presenceStatus}>{presenceStatus}</Text>
          )}

          {otherUserProfile?.status && (
            <Text style={styles.statusMessage} numberOfLines={1}>
              {otherUserProfile.status}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={WhatsAppColors.secondary} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>MessageAI</Text>
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
          {queueStats.pending > 0 && (
            <Text style={styles.queueStatus}>
              {queueStats.pending} message{queueStats.pending !== 1 ? 's' : ''}{' '}
              queued
            </Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => {
              // Camera functionality placeholder
              Alert.alert('Camera', 'Camera feature coming soon!')
            }}
          >
            <Ionicons name='camera-outline' size={20} color='#FFFFFF' />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotification}
          >
            <Ionicons name='notifications-outline' size={20} color='#FFFFFF' />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={handleNewConversation}
          >
            <Ionicons name='add' size={20} color='#FFFFFF' />
          </TouchableOpacity>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No conversations yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Use the &quot;+&quot; button to start new conversations
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          style={styles.conversationsList}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WhatsAppColors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WhatsAppColors.primary,
    paddingTop: 50 // Account for status bar
  },
  headerLeft: {
    flex: 1
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  networkStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500'
  },
  queueStatus: {
    fontSize: 12,
    marginTop: 2,
    color: WhatsAppColors.warning,
    fontWeight: '500'
  },
  cameraButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cameraButtonText: {
    fontSize: 16,
    color: '#FFFFFF'
  },
  testButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  newChatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WhatsAppColors.background
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: WhatsAppColors.lightText
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: WhatsAppColors.text,
    marginBottom: 8
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: WhatsAppColors.lightText,
    textAlign: 'center'
  },
  conversationsList: {
    flex: 1
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: WhatsAppColors.border,
    backgroundColor: WhatsAppColors.background
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: WhatsAppColors.secondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold'
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center'
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WhatsAppColors.text,
    flex: 1
  },
  timestamp: {
    fontSize: 14,
    color: WhatsAppColors.lightText,
    marginLeft: 8
  },
  conversationSubtitle: {
    fontSize: 14,
    color: WhatsAppColors.lightText,
    lineHeight: 18
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: WhatsAppColors.text
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: WhatsAppColors.online,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  presenceStatus: {
    fontSize: 12,
    color: WhatsAppColors.online,
    marginTop: 2,
    fontWeight: '500'
  },
  statusMessage: {
    fontSize: 12,
    color: WhatsAppColors.lightText,
    marginTop: 2,
    fontStyle: 'italic'
  }
})
