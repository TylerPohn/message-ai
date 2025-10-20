import { useAuth } from '@/contexts/AuthContext'
import { MessagingService } from '@/services/messagingService'
import { UserService } from '@/services/userService'
import { UserProfile } from '@/types/messaging'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

export default function NewConversationScreen() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadUsers = async () => {
      try {
        setLoading(true)
        const allUsers = await UserService.getAllUsers(user.uid)
        setUsers(allUsers)
        setFilteredUsers(allUsers)
      } catch (error) {
        console.error('Error loading users:', error)
        Alert.alert('Error', 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [user])

  useEffect(() => {
    const searchUsers = async () => {
      if (!user) return

      try {
        const results = await UserService.searchUsers(user.uid, searchTerm)
        setFilteredUsers(results)
      } catch (error) {
        console.error('Error searching users:', error)
      }
    }

    const timeoutId = setTimeout(searchUsers, 300) // Debounce search
    return () => clearTimeout(timeoutId)
  }, [searchTerm, user])

  const handleUserSelect = async (selectedUser: UserProfile) => {
    if (!user || !userProfile) {
      Alert.alert('Error', 'User not authenticated')
      return
    }

    if (creating) {
      console.log('Already creating a conversation')
      return
    }

    try {
      setCreating(true)
      console.log('Creating conversation with:', selectedUser.displayName)

      // Check if conversation already exists
      const existingConversation =
        await MessagingService.checkExistingDirectConversation(
          user.uid,
          selectedUser.uid
        )

      if (existingConversation) {
        console.log('Found existing conversation, navigating...')
        router.replace(`/chat/${existingConversation.id}`)
        return
      }

      // Create new conversation
      console.log('Creating new conversation...')
      const conversationId = await MessagingService.createConversation(
        [user.uid, selectedUser.uid],
        'direct'
      )

      console.log('Conversation created, navigating to:', conversationId)
      router.replace(`/chat/${conversationId}`)
    } catch (error) {
      console.error('Error creating conversation:', error)
      Alert.alert(
        'Error',
        `Failed to create conversation: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    } finally {
      setCreating(false)
    }
  }

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date()
    const diff = now.getTime() - lastSeen.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Online'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return lastSeen.toLocaleDateString()
  }

  const renderUser = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserSelect(item)}
      disabled={creating}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.userContent}>
        <View style={styles.userHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Text style={styles.lastSeen}>{formatLastSeen(item.lastSeen)}</Text>
        </View>

        <Text style={styles.userEmail} numberOfLines={1}>
          {item.email}
        </Text>

        {item.status && (
          <Text style={styles.userStatus} numberOfLines={1}>
            {item.status}
          </Text>
        )}
      </View>

      {creating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size='small' color='#007AFF' />
        </View>
      )}
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder='Search users...'
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize='none'
          autoCorrect={false}
        />
      </View>

      {filteredUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>
            {searchTerm ? 'No users found' : 'No users available'}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchTerm
              ? 'Try a different search term'
              : 'Other users need to sign up to start conversations'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
          renderItem={renderUser}
          style={styles.usersList}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7'
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center'
  },
  headerSpacer: {
    width: 60 // Balance the back button
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7'
  },
  searchInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000'
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center'
  },
  usersList: {
    flex: 1
  },
  userItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    position: 'relative'
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
  userContent: {
    flex: 1,
    justifyContent: 'center'
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1
  },
  lastSeen: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2
  },
  userStatus: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  }
})
