import { useAuth } from '@/contexts/AuthContext'
import { MessagingService } from '@/services/messagingService'
import { NetworkService, NetworkState } from '@/services/networkService'
import { OfflineQueueService } from '@/services/offlineQueueService'
import { PresenceData, PresenceService } from '@/services/presenceService'
import { UserCacheService } from '@/services/userCacheService'
import { Conversation, UserProfile } from '@/types/messaging'
import { TestDataUtils } from '@/utils/testData'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

export default function ChatListScreen() {
  const { user, userProfile, logout } = useAuth()
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

  const handleCreateTestData = async () => {
    if (!user || !userProfile) {
      Alert.alert('Error', 'User not authenticated')
      return
    }

    try {
      // Create a test conversation with a dummy user
      const testUserId = 'test-user-' + Date.now()
      const testUserName = 'Test User'

      console.log('Creating test conversation...')
      const conversationId = await TestDataUtils.createTestConversation(
        user.uid,
        testUserId,
        userProfile.displayName,
        testUserName
      )

      console.log('Test conversation created:', conversationId)
      Alert.alert(
        'Test Data Created',
        `Test conversation created successfully!`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      console.error('Error creating test data:', error)
      Alert.alert(
        'Error',
        `Failed to create test data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        [{ text: 'OK' }]
      )
    }
  }

  const handleNewConversation = () => {
    router.push('/chat/new')
  }

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      `Are you sure you want to sign out, ${userProfile?.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout()
              // User will be redirected to login screen automatically
            } catch (error) {
              console.error('Logout error:', error)
              Alert.alert('Error', 'Failed to sign out. Please try again.')
            }
          }
        }
      ]
    )
  }

  const renderConversation = ({ item }: { item: Conversation }) => {
    const presenceStatus = getPresenceStatus(item)
    const isOnline = presenceStatus === 'Online'

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.type === 'group'
                ? item.participants
                    .filter((id) => id !== user?.uid)[0]
                    ?.charAt(0)
                    .toUpperCase() || 'G'
                : getConversationTitle(item).charAt(0).toUpperCase()}
            </Text>
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
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Messages</Text>
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
            style={styles.testDataButton}
            onPress={handleCreateTestData}
          >
            <Text style={styles.testDataButtonText}>Test</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={handleNewConversation}
          >
            <Text style={styles.newChatButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No conversations yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Tap the &quot;Test&quot; button to create a sample conversation, or
            use the &quot;+&quot; button for new conversations
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
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7'
  },
  headerLeft: {
    flex: 1
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  testDataButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  testDataButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000'
  },
  networkStatus: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500'
  },
  queueStatus: {
    fontSize: 12,
    marginTop: 2,
    color: '#FF9500',
    fontWeight: '500'
  },
  newChatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
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
    backgroundColor: '#FFFFFF'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93'
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
    color: '#000000',
    marginBottom: 8
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
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
    borderBottomColor: '#E5E5E7'
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold'
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
    color: '#000000',
    flex: 1
  },
  timestamp: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8
  },
  conversationSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#000000'
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  presenceStatus: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 2,
    fontWeight: '500'
  }
})
