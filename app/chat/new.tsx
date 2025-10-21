import { useAuth } from '@/contexts/AuthContext'
import { ContactsService } from '@/services/contactsService'
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
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [contacts, setContacts] = useState<UserProfile[]>([])
  const [filteredContacts, setFilteredContacts] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([])
  const [isGroupMode, setIsGroupMode] = useState(false)
  const [contactStatuses, setContactStatuses] = useState<Map<string, boolean>>(
    new Map()
  )

  // Handle logout redirect
  useEffect(() => {
    if (!user && !authLoading) {
      console.log('User logged out, redirecting to login...')
      router.replace('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return

    const loadUsersAndContacts = async () => {
      try {
        setLoading(true)
        const allUsers = await UserService.getAllUsers(user.uid)
        const userContacts = await ContactsService.getUserContacts(user.uid)

        setFilteredUsers(allUsers)
        setContacts(userContacts)

        // Check contact statuses for all users
        const statusMap = new Map<string, boolean>()
        for (const userProfile of allUsers) {
          const isContact = await ContactsService.isContact(
            user.uid,
            userProfile.uid
          )
          statusMap.set(userProfile.uid, isContact)
        }
        setContactStatuses(statusMap)
      } catch (error) {
        console.error('Error loading users and contacts:', error)
        Alert.alert('Error', 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    loadUsersAndContacts()
  }, [user])

  useEffect(() => {
    const searchUsersAndContacts = async () => {
      if (!user) return

      try {
        const results = await UserService.searchUsers(user.uid, searchTerm)
        setFilteredUsers(results)

        // Filter contacts based on search term
        if (!searchTerm.trim()) {
          setFilteredContacts(contacts)
        } else {
          const searchLower = searchTerm.toLowerCase()
          const filtered = contacts.filter(
            (contact) =>
              contact.displayName.toLowerCase().includes(searchLower) ||
              contact.email.toLowerCase().includes(searchLower) ||
              (contact.status &&
                contact.status.toLowerCase().includes(searchLower))
          )
          setFilteredContacts(filtered)
        }
      } catch (error) {
        console.error('Error searching users and contacts:', error)
      }
    }

    const timeoutId = setTimeout(searchUsersAndContacts, 300) // Debounce search
    return () => clearTimeout(timeoutId)
  }, [searchTerm, user, contacts])

  const handleUserSelect = async (selectedUser: UserProfile) => {
    if (!user || !userProfile) {
      Alert.alert('Error', 'User not authenticated')
      return
    }

    if (creating) {
      console.log('Already creating a conversation')
      return
    }

    if (isGroupMode) {
      // Toggle user selection in group mode
      const isSelected = selectedUsers.some((u) => u.uid === selectedUser.uid)
      if (isSelected) {
        setSelectedUsers((prev) =>
          prev.filter((u) => u.uid !== selectedUser.uid)
        )
      } else {
        setSelectedUsers((prev) => [...prev, selectedUser])
      }
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

  const handleAddContact = async (userProfile: UserProfile) => {
    if (!user) return

    try {
      await ContactsService.addContact(user.uid, userProfile.uid, 'manual')
      setContactStatuses((prev) => new Map(prev).set(userProfile.uid, true))
      Alert.alert('Success', `${userProfile.displayName} added to contacts`)
    } catch (error) {
      console.error('Error adding contact:', error)
      Alert.alert('Error', 'Failed to add contact')
    }
  }

  const handleRemoveContact = async (userProfile: UserProfile) => {
    if (!user) return

    try {
      await ContactsService.removeContact(user.uid, userProfile.uid)
      setContactStatuses((prev) => new Map(prev).set(userProfile.uid, false))
      Alert.alert('Success', `${userProfile.displayName} removed from contacts`)
    } catch (error) {
      console.error('Error removing contact:', error)
      Alert.alert('Error', 'Failed to remove contact')
    }
  }

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 2) {
      Alert.alert('Error', 'Please select at least 2 people to create a group')
      return
    }

    if (!user || !userProfile) {
      Alert.alert('Error', 'User not authenticated')
      return
    }

    if (creating) {
      console.log('Already creating a group')
      return
    }

    try {
      setCreating(true)

      console.log(
        'Creating group with:',
        selectedUsers.map((u) => u.displayName)
      )

      // Create group conversation without title
      const allParticipants = [user.uid, ...selectedUsers.map((u) => u.uid)]
      const conversationId = await MessagingService.createConversation(
        allParticipants,
        'group',
        undefined, // No title
        user.uid // Creator becomes admin
      )

      console.log('Group created, navigating to:', conversationId)
      router.replace(`/chat/${conversationId}`)
    } catch (error) {
      console.error('Error creating group:', error)
      Alert.alert(
        'Error',
        `Failed to create group: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    } finally {
      setCreating(false)
      setSelectedUsers([])
      setIsGroupMode(false)
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

  const renderUser = ({ item }: { item: UserProfile }) => {
    const isSelected = selectedUsers.some((u) => u.uid === item.uid)
    const isContact = contactStatuses.get(item.uid) || false

    return (
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
          {isContact && <View style={styles.contactBadge} />}
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

        {!isGroupMode && (
          <View style={styles.contactActionContainer}>
            {isContact ? (
              <TouchableOpacity
                style={styles.removeContactButton}
                onPress={() => handleRemoveContact(item)}
              >
                <Text style={styles.removeContactButtonText}>★</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addContactButton}
                onPress={() => handleAddContact(item)}
              >
                <Text style={styles.addContactButtonText}>☆</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isGroupMode && (
          <View style={styles.checkboxContainer}>
            <View
              style={[styles.checkbox, isSelected && styles.checkboxSelected]}
            >
              {isSelected && <Text style={styles.checkboxText}>✓</Text>}
            </View>
          </View>
        )}

        {creating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size='small' color='#007AFF' />
          </View>
        )}
      </TouchableOpacity>
    )
  }

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
        <Text style={styles.headerTitle}>
          {isGroupMode ? 'New Group' : 'New Message'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[styles.modeToggle, !isGroupMode && styles.modeToggleActive]}
          onPress={() => {
            setIsGroupMode(false)
            setSelectedUsers([])
          }}
        >
          <Text
            style={[
              styles.modeToggleText,
              !isGroupMode && styles.modeToggleTextActive
            ]}
          >
            Direct
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeToggle, isGroupMode && styles.modeToggleActive]}
          onPress={() => setIsGroupMode(true)}
        >
          <Text
            style={[
              styles.modeToggleText,
              isGroupMode && styles.modeToggleTextActive
            ]}
          >
            Group
          </Text>
        </TouchableOpacity>
      </View>

      {isGroupMode && selectedUsers.length > 0 && (
        <View style={styles.selectedUsersContainer}>
          <Text style={styles.selectedUsersText}>
            {selectedUsers.length} selected
          </Text>
          {selectedUsers.length >= 2 && (
            <TouchableOpacity
              style={styles.createGroupButton}
              onPress={handleCreateGroup}
            >
              <Text style={styles.createGroupButtonText}>Create Group</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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

      {filteredContacts.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>
            Contacts ({filteredContacts.length})
          </Text>
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.uid}
            renderItem={renderUser}
            style={styles.contactsList}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>
          All Users ({filteredUsers.length})
        </Text>
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
  sectionContainer: {
    flex: 1
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7'
  },
  contactsList: {
    maxHeight: 200
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
  },
  modeToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 4
  },
  modeToggle: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center'
  },
  modeToggleActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  modeToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93'
  },
  modeToggleTextActive: {
    color: '#000000'
  },
  selectedUsersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7'
  },
  selectedUsersText: {
    fontSize: 14,
    color: '#8E8E93'
  },
  createGroupButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  checkboxContainer: {
    marginLeft: 12,
    justifyContent: 'center'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  contactBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF9500',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  contactActionContainer: {
    marginLeft: 12,
    justifyContent: 'center'
  },
  addContactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8E8E93'
  },
  addContactButtonText: {
    fontSize: 16,
    color: '#8E8E93'
  },
  removeContactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeContactButtonText: {
    fontSize: 16,
    color: '#FFFFFF'
  }
})
