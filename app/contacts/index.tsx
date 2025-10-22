import { useAuth } from '@/contexts/AuthContext'
import { ContactsService } from '@/services/contactsService'
import { PresenceData, PresenceService } from '@/services/presenceService'
import { UserProfile } from '@/types/messaging'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

export default function ContactsScreen() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [contacts, setContacts] = useState<UserProfile[]>([])
  const [filteredContacts, setFilteredContacts] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [presenceData, setPresenceData] = useState<Map<string, PresenceData>>(
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

    // Set up real-time listener for contacts
    const unsubscribe = ContactsService.listenToUserContacts(
      user.uid,
      (updatedContacts) => {
        setContacts(updatedContacts)
        setLoading(false)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [user])

  // Filter contacts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts)
      return
    }

    const searchLower = searchTerm.toLowerCase()
    const filtered = contacts.filter(
      (contact) =>
        contact.displayName.toLowerCase().includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower)
    )
    setFilteredContacts(filtered)
  }, [contacts, searchTerm])

  // Set up presence listeners for contacts
  useEffect(() => {
    if (contacts.length === 0) return

    // Clean up existing presence listeners
    if ((window as any).contactsPresenceUnsubscribers) {
      ;(window as any).contactsPresenceUnsubscribers.forEach(
        (unsub: () => void) => unsub()
      )
      ;(window as any).contactsPresenceUnsubscribers = []
    }

    // Set up presence listeners for all contacts
    const presenceUnsubscribers: (() => void)[] = []

    contacts.forEach((contact) => {
      const unsubscribe = PresenceService.listenToUserPresence(
        contact.uid,
        (presence) => {
          if (presence) {
            // Check if user should be considered offline based on time
            const isActuallyOffline = PresenceService.isUserOffline(presence)

            setPresenceData((prev) => {
              const newMap = new Map(prev)
              if (isActuallyOffline) {
                // Show as offline even if status says "online"
                newMap.set(contact.uid, {
                  status: 'offline',
                  lastSeen: presence.lastSeen
                })
              } else {
                newMap.set(contact.uid, presence)
              }
              return newMap
            })
          }
        }
      )
      presenceUnsubscribers.push(unsubscribe)
    })

    // Store unsubscribers for cleanup
    ;(window as any).contactsPresenceUnsubscribers = presenceUnsubscribers

    return () => {
      presenceUnsubscribers.forEach((unsub) => unsub())
    }
  }, [contacts])

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

  const getPresenceStatus = (contact: UserProfile) => {
    const presence = presenceData.get(contact.uid)
    if (presence) {
      if (presence.status === 'online') {
        return 'Online'
      } else {
        return `Last seen ${PresenceService.formatLastSeen(presence.lastSeen)}`
      }
    }
    return formatLastSeen(contact.lastSeen)
  }

  const handleContactPress = async (contact: UserProfile) => {
    if (!user) return

    try {
      // Check if conversation already exists
      const { MessagingService } = await import('@/services/messagingService')
      const existingConversation =
        await MessagingService.checkExistingDirectConversation(
          user.uid,
          contact.uid
        )

      if (existingConversation) {
        router.push(`/chat/${existingConversation.id}`)
        return
      }

      // Create new conversation
      const conversationId = await MessagingService.createConversation(
        [user.uid, contact.uid],
        'direct'
      )

      router.push(`/chat/${conversationId}`)
    } catch (error) {
      console.error('Error creating conversation:', error)
      Alert.alert('Error', 'Failed to start conversation')
    }
  }

  const handleRemoveContact = (contact: UserProfile) => {
    if (!user) return

    Alert.alert(
      'Remove Contact',
      `Remove ${contact.displayName} from your contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await ContactsService.removeContact(user.uid, contact.uid)
              Alert.alert('Success', 'Contact removed')
            } catch (error) {
              console.error('Error removing contact:', error)
              Alert.alert('Error', 'Failed to remove contact')
            }
          }
        }
      ]
    )
  }

  const renderContact = ({ item }: { item: UserProfile }) => {
    const presence = presenceData.get(item.uid)
    const isOnline =
      presence?.status === 'online' && !PresenceService.isUserOffline(presence)

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleContactPress(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {item.photoURL ? (
              <Image
                source={{ uri: item.photoURL }}
                style={styles.avatarImage}
                resizeMode='cover'
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.contactContent}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.displayName}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveContact(item)}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.contactEmail} numberOfLines={1}>
            {item.email}
          </Text>

          {item.status && (
            <Text style={styles.contactStatus} numberOfLines={1}>
              {item.status}
            </Text>
          )}

          <Text style={styles.presenceStatus}>{getPresenceStatus(item)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text style={styles.loadingText}>Loading contacts...</Text>
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
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contacts</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder='Search contacts...'
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize='none'
          autoCorrect={false}
        />
      </View>

      {filteredContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>
            {searchTerm ? 'No contacts found' : 'No contacts yet'}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchTerm
              ? 'Try a different search term'
              : 'Add contacts from the new conversation screen'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.uid}
          renderItem={renderContact}
          style={styles.contactsList}
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
  contactsList: {
    flex: 1
  },
  contactItem: {
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
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25
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
  contactContent: {
    flex: 1,
    justifyContent: 'center'
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 12
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  contactEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2
  },
  contactStatus: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginBottom: 2
  },
  presenceStatus: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500'
  }
})
