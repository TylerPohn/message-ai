import { WhatsAppColors } from '@/constants/theme'
import { useAuth } from '@/contexts/AuthContext'
import { ImageService } from '@/services/imageService'
import { UserService } from '@/services/userService'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { t, Locale, isSupportedLocale } from '@/locales/translations'

interface SettingsItem {
  id: string
  title: string
  subtitle: string
  iconName: string
  onPress: () => void
}

export default function SettingsScreen() {
  const { user, userProfile, logout, updateUserProfile } = useAuth()
  const router = useRouter()
  // Use user's preferred language if available and supported, otherwise default to English
  const locale: Locale = (
    userProfile?.preferredLanguage && isSupportedLocale(userProfile.preferredLanguage)
      ? (userProfile.preferredLanguage as Locale)
      : 'en'
  )
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '')
  const [status, setStatus] = useState(userProfile?.status || '')
  const [loading, setLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    Alert.alert(
      t(locale, 'settings.signOutTitle'),
      t(locale, 'settings.signOutConfirmation', { name: userProfile?.displayName || 'User' }),
      [
        { text: t(locale, 'settings.cancelButton'), style: 'cancel' },
        {
          text: t(locale, 'settings.signOutButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout()
            } catch (error) {
              console.error('Logout error:', error)
              Alert.alert(t(locale, 'common.error'), t(locale, 'settings.signOutErrorMessage'))
            }
          }
        }
      ]
    )
  }

  const handleEditProfile = () => {
    setDisplayName(userProfile?.displayName || '')
    setStatus(userProfile?.status || '')
    setEditModalVisible(true)
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert(t(locale, 'common.error'), t(locale, 'settings.displayNameRequiredError'))
      return
    }

    setLoading(true)
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        status: status.trim()
      })
      setEditModalVisible(false)
      Alert.alert(t(locale, 'common.ok'), t(locale, 'settings.profileUpdateSuccessMessage'))
    } catch (error) {
      console.error('Error updating profile:', error)
      Alert.alert(t(locale, 'common.error'), t(locale, 'settings.profileUpdateErrorMessage'))
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async () => {
    if (!user) return

    const showActionSheet = () => {
      const options = [
        t(locale, 'settings.takePhotoOption'),
        t(locale, 'settings.chooseFromLibraryOption'),
        t(locale, 'common.cancel')
      ]
      const cancelButtonIndex = 2

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
            title: t(locale, 'settings.selectAvatarTitle')
          },
          (buttonIndex) => {
            if (buttonIndex === 0) {
              handleTakePhoto()
            } else if (buttonIndex === 1) {
              handleChooseFromLibrary()
            }
          }
        )
      } else {
        Alert.alert(t(locale, 'settings.selectAvatarAlertTitle'), t(locale, 'settings.selectAvatarAlertMessage'), [
          { text: t(locale, 'settings.takePhotoOption'), onPress: handleTakePhoto },
          { text: t(locale, 'settings.chooseFromLibraryOption'), onPress: handleChooseFromLibrary },
          { text: t(locale, 'common.cancel'), style: 'cancel' }
        ])
      }
    }

    showActionSheet()
  }

  const handleTakePhoto = async () => {
    if (!user) return

    try {
      const result = await ImageService.pickImageFromCamera()
      if (result && !result.canceled) {
        await uploadAvatar(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert(t(locale, 'common.error'), t(locale, 'settings.avatarPhotoError'))
    }
  }

  const handleChooseFromLibrary = async () => {
    if (!user) return

    try {
      const result = await ImageService.pickImageFromGallery()
      if (result && !result.canceled) {
        await uploadAvatar(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error choosing from library:', error)
      Alert.alert(t(locale, 'common.error'), t(locale, 'settings.avatarImageSelectionError'))
    }
  }

  const uploadAvatar = async (imageUri: string) => {
    if (!user) return

    setAvatarLoading(true)
    setAvatarProgress(0)

    try {
      // Upload avatar to Firebase Storage
      const photoURL = await ImageService.uploadAvatar(
        imageUri,
        user.uid,
        (progress) => {
          setAvatarProgress(progress)
        }
      )

      // Update user profile in Firestore
      await UserService.updateUserAvatar(user.uid, photoURL)

      // Update local state
      await updateUserProfile({ photoURL })

      Alert.alert(t(locale, 'common.ok'), t(locale, 'settings.avatarSuccessMessage'))
    } catch (error) {
      console.error('Error uploading avatar:', error)
      Alert.alert(t(locale, 'common.error'), t(locale, 'settings.avatarUploadError'))
    } finally {
      setAvatarLoading(false)
      setAvatarProgress(0)
    }
  }

  const settingsItems: SettingsItem[] = [
    {
      id: 'account',
      title: t(locale, 'settings.accountTitle'),
      subtitle: t(locale, 'settings.accountSubtitle'),
      iconName: 'key-outline',
      onPress: () => Alert.alert(t(locale, 'settings.accountAlertTitle'), t(locale, 'settings.accountAlertMessage'))
    },
    {
      id: 'privacy',
      title: t(locale, 'settings.privacyTitle'),
      subtitle: t(locale, 'settings.privacySubtitle'),
      iconName: 'lock-closed-outline',
      onPress: () => Alert.alert(t(locale, 'settings.privacyAlertTitle'), t(locale, 'settings.privacyAlertMessage'))
    },
    {
      id: 'avatar',
      title: t(locale, 'settings.avatarTitle'),
      subtitle: t(locale, 'settings.avatarSubtitle'),
      iconName: 'person-outline',
      onPress: handleAvatarUpload
    },
    {
      id: 'language',
      title: t(locale, 'settings.languageTitle'),
      subtitle: userProfile?.preferredLanguage
        ? t(locale, 'settings.languageSubtitle', { code: userProfile.preferredLanguage.toUpperCase() })
        : t(locale, 'settings.languageDefaultSubtitle'),
      iconName: 'language-outline',
      onPress: () => router.push('/settings/language')
    },
    {
      id: 'notifications',
      title: t(locale, 'settings.notificationsTitle'),
      subtitle: t(locale, 'settings.notificationsSubtitle'),
      iconName: 'notifications-outline',
      onPress: () =>
        Alert.alert(t(locale, 'settings.notificationsAlertTitle'), t(locale, 'settings.notificationsAlertMessage'))
    }
  ]

  const renderSettingsItem = ({ item }: { item: SettingsItem }) => (
    <TouchableOpacity style={styles.settingsItem} onPress={item.onPress}>
      <View style={styles.settingsItemLeft}>
        <Ionicons
          name={item.iconName as any}
          size={20}
          color={WhatsAppColors.lightText}
        />
        <View style={styles.settingsText}>
          <Text style={styles.settingsTitle}>{item.title}</Text>
          <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Text style={styles.settingsArrow}>›</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t(locale, 'settings.headerTitle')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => Alert.alert(t(locale, 'settings.searchAlertTitle'), t(locale, 'settings.searchAlertMessage'))}
          >
            <Ionicons name='search-outline' size={20} color='#FFFFFF' />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileItem}
            onPress={handleEditProfile}
          >
            <View style={styles.profileLeft}>
              <View style={styles.profileAvatar}>
                {userProfile?.photoURL ? (
                  <Image
                    source={{ uri: userProfile.photoURL }}
                    style={styles.profileAvatarImage}
                    resizeMode='cover'
                  />
                ) : (
                  <Text style={styles.profileAvatarText}>
                    {getInitials(userProfile?.displayName || 'User')}
                  </Text>
                )}
                {avatarLoading && (
                  <View style={styles.avatarLoadingOverlay}>
                    <Text style={styles.avatarLoadingText}>
                      {Math.round(avatarProgress)}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userProfile?.displayName || t(locale, 'settings.profileNameFallback')}
                </Text>
                <Text style={styles.profileStatus}>
                  {userProfile?.status || t(locale, 'settings.defaultStatus')}
                </Text>
              </View>
            </View>
            <View style={styles.profileActions}>
              <TouchableOpacity style={styles.profileActionButton}>
                <Ionicons name='qr-code-outline' size={16} color='#FFFFFF' />
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileActionButton}>
                <Ionicons name='add-circle-outline' size={16} color='#FFFFFF' />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings List */}
        <FlatList
          data={settingsItems}
          keyExtractor={(item) => item.id}
          renderItem={renderSettingsItem}
          style={styles.settingsList}
        />

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{t(locale, 'settings.signOutTitle')}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType='slide'
        transparent={false}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(locale, 'settings.editProfileTitle')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons
                  name='close'
                  size={20}
                  color={WhatsAppColors.lightText}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t(locale, 'settings.displayNameLabel')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={t(locale, 'settings.displayNameInputPlaceholder')}
                    placeholderTextColor={WhatsAppColors.lightText}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t(locale, 'settings.statusLabel')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={status}
                    onChangeText={setStatus}
                    placeholder={t(locale, 'settings.statusPlaceholder')}
                    placeholderTextColor={WhatsAppColors.lightText}
                    multiline
                    maxLength={140}
                  />
                  <Text style={styles.characterCount}>{t(locale, 'settings.profileCharacterCounter', { count: status.length })}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  loading && styles.saveButtonDisabled
                ]}
                onPress={handleSaveProfile}
                disabled={loading || !displayName.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? t(locale, 'settings.profileSavingButton') : t(locale, 'settings.profileSaveButton')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>{t(locale, 'settings.cancelButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  searchButtonText: {
    fontSize: 16,
    color: '#FFFFFF'
  },
  content: {
    flex: 1,
    padding: 16
  },
  profileSection: {
    backgroundColor: WhatsAppColors.darkBackground,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: WhatsAppColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold'
  },
  profileAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarLoadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: WhatsAppColors.text,
    marginBottom: 4
  },
  profileStatus: {
    fontSize: 14,
    color: WhatsAppColors.lightText,
    fontStyle: 'italic'
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8
  },
  profileActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WhatsAppColors.secondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileActionText: {
    color: '#FFFFFF',
    fontSize: 16
  },
  settingsList: {
    flex: 1
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
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
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  settingsIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center'
  },
  settingsText: {
    flex: 1
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WhatsAppColors.text,
    marginBottom: 2
  },
  settingsSubtitle: {
    fontSize: 14,
    color: WhatsAppColors.lightText
  },
  settingsArrow: {
    fontSize: 18,
    color: WhatsAppColors.lightText,
    marginLeft: 8
  },
  logoutButton: {
    backgroundColor: WhatsAppColors.error,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: WhatsAppColors.darkBackground
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: WhatsAppColors.darkBackground,
    justifyContent: 'flex-start'
  },
  modalScrollContent: {
    flex: 1
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
  modalCloseButtonText: {
    fontSize: 18,
    color: WhatsAppColors.lightText
  },
  modalBody: {
    padding: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: WhatsAppColors.text,
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: WhatsAppColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: WhatsAppColors.text,
    backgroundColor: WhatsAppColors.background
  },
  characterCount: {
    fontSize: 12,
    color: WhatsAppColors.lightText,
    textAlign: 'right',
    marginTop: 4
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
