import { useAuth } from '@/contexts/AuthContext'
import { MessagingService } from '@/services/messagingService'
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
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(
    new Map()
  )
  const [userMemberships, setUserMemberships] = useState<Map<string, any>>(
    new Map()
  )

  useEffect(() => {
    if (!user) return

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

    return () => unsubscribe()
  }, [user])

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
    if (conversation.type === 'group' && conversation.title) {
      return conversation.title
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

    return 'Group Chat'
  }

  const getConversationSubtitle = (conversation: Conversation) => {
    if (conversation.lastMessage) {
      return conversation.lastMessage.text
    }
    return 'No messages yet'
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

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getConversationTitle(item).charAt(0).toUpperCase()}
          </Text>
        </View>
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
      </View>
    </TouchableOpacity>
  )

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
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.testDataButton}
            onPress={handleCreateTestData}
          >
            <Text style={styles.testDataButtonText}>Test</Text>
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
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000'
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
    marginRight: 12
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
  }
})
