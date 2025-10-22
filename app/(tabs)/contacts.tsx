import { WhatsAppColors } from '@/constants/theme'
import { useAuth } from '@/contexts/AuthContext'
import { ContactsService } from '@/services/contactsService'
import { PresenceData, PresenceService } from '@/services/presenceService'
import { UserProfile } from '@/types/messaging'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import { t, Locale, isSupportedLocale } from '@/locales/translations'

export default function ContactsScreen() {
  const {
    user,
    userProfile,
    loading: authLoading,
    updateUserProfile
  } = useAuth()
  const router = useRouter()
  // Use user's preferred language if available and supported, otherwise default to English
  const locale: Locale = (
    userProfile?.preferredLanguage && isSupportedLocale(userProfile.preferredLanguage)
      ? (userProfile.preferredLanguage as Locale)
      : 'en'
  )
  const [contacts, setContacts] = useState<UserProfile[]>([])
  const [filteredContacts, setFilteredContacts] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [presenceData, setPresenceData] = useState<Map<string, PresenceData>>(
    new Map()
  )
  const [activeTab, setActiveTab] = useState<'contacts' | 'status'>('contacts')

  // Handle logout redirect
  useEffect(() => {
    if (!user && !authLoading) {
      console.log('User logged out, redirecting to login...')
      router.replace('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return

    let unsubscribeContacts: (() => void) | undefined

    // Load contacts
    unsubscribeContacts = ContactsService.listenToUserContacts(
      user.uid,
      (updatedContacts) => {
        setContacts(updatedContacts)
        setLoading(false)
      }
    )

    return () => {
      if (unsubscribeContacts) unsubscribeContacts()
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

  const handleAddStatus = () => {
    setStatusText('')
    setStatusModalVisible(true)
  }

  const handleSaveStatus = async () => {
    if (!user || !statusText.trim()) return

    setStatusLoading(true)
    try {
      await updateUserProfile({
        status: statusText.trim(),
        statusUpdatedAt: new Date()
      })
      setStatusModalVisible(false)
      setStatusText('')
      Alert.alert(t(locale, 'common.ok'), t(locale, 'contacts.statusUpdateSuccessMessage'))
    } catch (error) {
      console.error('Error updating status:', error)
      Alert.alert(t(locale, 'common.error'), t(locale, 'contacts.statusUpdateErrorMessage'))
    } finally {
      setStatusLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return timestamp.toLocaleDateString()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date()
    const diff = now.getTime() - lastSeen.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t(locale, 'contacts.onlineIndicator')
    if (minutes < 60) return t(locale, 'contacts.minutesAgoFormat', { time: minutes })
    if (hours < 24) return t(locale, 'contacts.hoursAgoFormat', { time: hours })
    if (days < 7) return t(locale, 'contacts.daysAgoFormat', { time: days })
    return lastSeen.toLocaleDateString()
  }

  const getPresenceStatus = (contact: UserProfile) => {
    const presence = presenceData.get(contact.uid)
    if (presence) {
      if (presence.status === 'online') {
        return t(locale, 'contacts.onlineIndicator')
      } else {
        const timeData = PresenceService.formatLastSeen(presence.lastSeen)
        if (timeData === 'now') {
          return t(locale, 'contacts.onlineIndicator')
        }
        const keyMap = {
          minutes: 'contacts.minutesAgoFormat',
          hours: 'contacts.hoursAgoFormat',
          days: 'contacts.daysAgoFormat'
        }
        return t(locale, keyMap[timeData.unit], { time: timeData.value })
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
      Alert.alert(t(locale, 'common.error'), t(locale, 'contacts.conversationError'))
    }
  }

  const handleRemoveContact = (contact: UserProfile) => {
    if (!user) return

    Alert.alert(
      t(locale, 'contacts.removeContactTitle'),
      t(locale, 'contacts.removeContactConfirmation', { name: contact.displayName }),
      [
        { text: t(locale, 'contacts.cancelButton'), style: 'cancel' },
        {
          text: t(locale, 'contacts.removeButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ContactsService.removeContact(user.uid, contact.uid)
              Alert.alert(t(locale, 'common.ok'), t(locale, 'contacts.contactRemovedMessage'))
            } catch (error) {
              console.error('Error removing contact:', error)
              Alert.alert(t(locale, 'common.error'), t(locale, 'contacts.removeContactError'))
            }
          }
        }
      ]
    )
  }

  const renderMyStatus = () => {
    const hasStatus = userProfile?.status && userProfile.status.trim() !== ''

    return (
      <TouchableOpacity style={styles.statusItem} onPress={handleAddStatus}>
        <View style={styles.statusAvatar}>
          <Text style={styles.statusAvatarText}>
            {getInitials(userProfile?.displayName || 'User')}
          </Text>
          <View style={styles.addStatusIcon}>
            <Text style={styles.addStatusIconText}>+</Text>
          </View>
        </View>
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>
            {hasStatus ? userProfile.status : t(locale, 'contacts.addStatusDisplay')}
          </Text>
          <Text style={styles.statusSubtitle}>
            {hasStatus ? t(locale, 'contacts.tapToEdit') : t(locale, 'contacts.tapToAddStatus')}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderContactStatus = ({ item }: { item: UserProfile }) => {
    if (!item.status || item.status.trim() === '') return null

    return (
      <TouchableOpacity
        style={styles.statusItem}
        onPress={() => {
          Alert.alert('Status', `${item.displayName}: ${item.status}`)
        }}
      >
        <View style={styles.statusAvatar}>
          <Text style={styles.statusAvatarText}>
            {getInitials(item.displayName)}
          </Text>
        </View>
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>{item.displayName}</Text>
          <Text style={styles.statusSubtitle}>{item.status}</Text>
        </View>
      </TouchableOpacity>
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
              <Text style={styles.removeButtonText}>{t(locale, 'contacts.removeButton')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.contactEmail} numberOfLines={1}>
            {item.email}
          </Text>

          <Text style={styles.presenceStatus}>{getPresenceStatus(item)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={WhatsAppColors.secondary} />
        <Text style={styles.loadingText}>{t(locale, 'contacts.loadingText')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t(locale, 'contacts.headerTitle')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => Alert.alert(t(locale, 'contacts.searchAlertTitle'), t(locale, 'contacts.searchAlertMessage'))}
          >
            <Ionicons name='search-outline' size={20} color='#FFFFFF' />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => Alert.alert(t(locale, 'contacts.menuAlertTitle'), t(locale, 'contacts.menuAlertMessage'))}
          >
            <Ionicons name='ellipsis-vertical' size={20} color='#FFFFFF' />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'contacts' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('contacts')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'contacts' && styles.tabButtonTextActive
            ]}
          >
            {t(locale, 'contacts.contactsTabLabel')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'status' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('status')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'status' && styles.tabButtonTextActive
            ]}
          >
            {t(locale, 'contacts.statusTabLabel')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'contacts' ? (
          <>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={t(locale, 'contacts.searchPlaceholder')}
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize='none'
                autoCorrect={false}
                placeholderTextColor={WhatsAppColors.lightText}
              />
            </View>

            {filteredContacts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>
                  {searchTerm ? t(locale, 'contacts.noContactsFoundTitle') : t(locale, 'contacts.emptyStateTitle')}
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {searchTerm
                    ? t(locale, 'contacts.noContactsFoundSubtitle')
                    : t(locale, 'contacts.emptyStateSubtitle')}
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
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t(locale, 'contacts.statusSectionTitle')}</Text>
              {renderMyStatus()}
            </View>

            {(() => {
              const contactsWithStatus = contacts
                .filter(
                  (contact) => contact.status && contact.status.trim() !== ''
                )
                .sort((a, b) => {
                  const aTime = a.statusUpdatedAt?.getTime() || 0
                  const bTime = b.statusUpdatedAt?.getTime() || 0
                  return bTime - aTime // Descending order
                })

              return contactsWithStatus.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t(locale, 'contacts.recentUpdatesTitle')}</Text>
                  <FlatList
                    data={contactsWithStatus}
                    keyExtractor={(item) => item.uid}
                    renderItem={renderContactStatus}
                    style={styles.statusList}
                  />
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>{t(locale, 'contacts.noRecentUpdates')}</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {t(locale, 'contacts.statusEmptyStateSubtitle')}
                  </Text>
                </View>
              )
            })()}
          </>
        )}
      </View>

      {/* Status Creation Modal */}
      <Modal
        visible={statusModalVisible}
        animationType='slide'
        transparent={true}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t(locale, 'contacts.addStatusTitle')}</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setStatusModalVisible(false)}
                    >
                      <Ionicons
                        name='close'
                        size={20}
                        color={WhatsAppColors.lightText}
                      />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalBody}
                    keyboardShouldPersistTaps='handled'
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.modalDescription}>
                      {t(locale, 'contacts.addStatusDescription')}
                    </Text>

                    <View style={styles.statusInputContainer}>
                      <TextInput
                        style={styles.statusInput}
                        value={statusText}
                        onChangeText={setStatusText}
                        placeholder={t(locale, 'contacts.statusInputPlaceholder')}
                        placeholderTextColor={WhatsAppColors.lightText}
                        multiline
                        maxLength={140}
                        textAlignVertical='top'
                        returnKeyType='done'
                        blurOnSubmit={false}
                      />
                      <View style={styles.statusFooter}>
                        <Text style={styles.characterCount}>
                          {t(locale, 'contacts.characterCounter', { count: statusText.length })}
                        </Text>
                      </View>
                    </View>
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        statusLoading && styles.saveButtonDisabled
                      ]}
                      onPress={handleSaveStatus}
                      disabled={statusLoading || !statusText.trim()}
                    >
                      {statusLoading ? (
                        <ActivityIndicator size='small' color='#FFFFFF' />
                      ) : (
                        <Text style={styles.saveButtonText}>{t(locale, 'contacts.postButton')}</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setStatusModalVisible(false)}
                      disabled={statusLoading}
                    >
                      <Text style={styles.cancelButtonText}>{t(locale, 'contacts.cancelButton')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: 50
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  searchButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: WhatsAppColors.darkBackground,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 4
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center'
  },
  tabButtonActive: {
    backgroundColor: WhatsAppColors.secondary
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: WhatsAppColors.lightText
  },
  tabButtonTextActive: {
    color: '#FFFFFF'
  },
  content: {
    flex: 1,
    padding: 16
  },
  searchContainer: {
    marginBottom: 16
  },
  searchInput: {
    backgroundColor: WhatsAppColors.darkBackground,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: WhatsAppColors.text
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WhatsAppColors.text,
    marginBottom: 12
  },
  statusList: {
    flex: 1
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: WhatsAppColors.darkBackground,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  statusAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: WhatsAppColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative'
  },
  statusAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  addStatusIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: WhatsAppColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  addStatusIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  statusContent: {
    flex: 1
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WhatsAppColors.text,
    marginBottom: 2
  },
  statusSubtitle: {
    fontSize: 14,
    color: WhatsAppColors.lightText
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
    fontSize: 20,
    fontWeight: '600',
    color: WhatsAppColors.text,
    marginBottom: 8
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: WhatsAppColors.lightText,
    textAlign: 'center'
  },
  contactsList: {
    flex: 1
  },
  contactItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WhatsAppColors.darkBackground,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
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
    color: WhatsAppColors.text,
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
    color: WhatsAppColors.lightText,
    marginBottom: 2
  },
  contactStatus: {
    fontSize: 14,
    color: WhatsAppColors.lightText,
    fontStyle: 'italic',
    marginBottom: 2
  },
  presenceStatus: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: WhatsAppColors.darkBackground,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: WhatsAppColors.border
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WhatsAppColors.text
  },
  modalCloseButton: {
    padding: 4
  },
  modalBody: {
    padding: 20
  },
  modalDescription: {
    fontSize: 14,
    color: WhatsAppColors.lightText,
    marginBottom: 16
  },
  statusInputContainer: {
    borderWidth: 1,
    borderColor: WhatsAppColors.border,
    borderRadius: 12,
    backgroundColor: WhatsAppColors.background
  },
  statusInput: {
    padding: 16,
    fontSize: 16,
    color: WhatsAppColors.text,
    minHeight: 100,
    maxHeight: 120
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: WhatsAppColors.border
  },
  characterCount: {
    fontSize: 12,
    color: WhatsAppColors.lightText
  },
  statusActions: {
    marginTop: 16
  },
  imageButton: {
    backgroundColor: WhatsAppColors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: WhatsAppColors.border
  },
  saveButton: {
    flex: 1,
    backgroundColor: WhatsAppColors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: WhatsAppColors.lightText
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: WhatsAppColors.border,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: WhatsAppColors.lightText,
    fontSize: 16,
    fontWeight: '500'
  }
})
