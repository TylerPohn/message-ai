import { WhatsAppColors } from '@/constants/theme'
import { useAuth } from '@/contexts/AuthContext'
import { UserService } from '@/services/userService'
import { LanguageCode, SUPPORTED_LANGUAGES } from '@/types/messaging'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface LanguageOption {
  code: LanguageCode
  name: string
}

export default function LanguageSettingsScreen() {
  const { user, userProfile, updateUserProfile } = useAuth()
  const router = useRouter()
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [autoTranslate, setAutoTranslate] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)

  // Load current preferences
  useEffect(() => {
    if (userProfile) {
      setSelectedLanguage(userProfile.preferredLanguage || 'en')
      setAutoTranslate(userProfile.autoTranslate || false)
    }
  }, [userProfile])

  const languageOptions: LanguageOption[] = Object.entries(
    SUPPORTED_LANGUAGES
  ).map(([code, name]) => ({
    code: code as LanguageCode,
    name
  }))

  const handleSavePreferences = async () => {
    if (!user) return

    setLoading(true)
    try {
      await UserService.updateLanguagePreferences(
        user.uid,
        selectedLanguage,
        autoTranslate
      )

      // Update local profile
      await updateUserProfile({
        preferredLanguage: selectedLanguage,
        autoTranslate: autoTranslate
      })

      Alert.alert('Success', 'Language preferences saved successfully!')
      router.back()
    } catch (error) {
      console.error('Error saving language preferences:', error)
      Alert.alert('Error', 'Failed to save preferences. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderLanguageOption = ({ item }: { item: LanguageOption }) => (
    <TouchableOpacity
      style={[
        styles.languageOption,
        selectedLanguage === item.code && styles.selectedLanguageOption
      ]}
      onPress={() => {
        setSelectedLanguage(item.code)
        setShowLanguagePicker(false)
      }}
    >
      <Text
        style={[
          styles.languageOptionText,
          selectedLanguage === item.code && styles.selectedLanguageOptionText
        ]}
      >
        {item.name}
      </Text>
      {selectedLanguage === item.code && (
        <Ionicons name='checkmark' size={20} color={WhatsAppColors.primary} />
      )}
    </TouchableOpacity>
  )

  const getCurrentLanguageName = () => {
    return SUPPORTED_LANGUAGES[selectedLanguage as LanguageCode] || 'English'
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name='arrow-back' size={24} color='#FFFFFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Language</Text>
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setShowLanguagePicker(true)}
          >
            <Text style={styles.languageSelectorText}>
              {getCurrentLanguageName()}
            </Text>
            <Ionicons
              name='chevron-down'
              size={20}
              color={WhatsAppColors.lightText}
            />
          </TouchableOpacity>
        </View>

        {/* Auto-Translate Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Auto-Translate Messages</Text>
              <Text style={styles.toggleSubtitle}>
                Automatically translate incoming messages to your preferred
                language
              </Text>
            </View>
            <Switch
              value={autoTranslate}
              onValueChange={setAutoTranslate}
              trackColor={{ false: '#374955', true: 'rgba(0, 168, 132, 0.3)' }}
              thumbColor={autoTranslate ? '#FFFFFF' : '#8696A0'}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSavePreferences}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        animationType='slide'
        transparent={true}
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLanguagePicker(false)}
              >
                <Ionicons
                  name='close'
                  size={24}
                  color={WhatsAppColors.lightText}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={languageOptions}
              keyExtractor={(item) => item.code}
              renderItem={renderLanguageOption}
              style={styles.languageList}
            />
          </View>
        </View>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WhatsAppColors.primary,
    paddingTop: 50
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  content: {
    flex: 1,
    padding: 16
  },
  section: {
    backgroundColor: WhatsAppColors.darkBackground,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WhatsAppColors.text,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WhatsAppColors.border
  },
  languageSelectorText: {
    fontSize: 16,
    color: WhatsAppColors.text
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WhatsAppColors.text,
    marginBottom: 4
  },
  toggleSubtitle: {
    fontSize: 14,
    color: WhatsAppColors.lightText,
    lineHeight: 20
  },
  saveButton: {
    backgroundColor: WhatsAppColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16
  },
  saveButtonDisabled: {
    backgroundColor: WhatsAppColors.lightText
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
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
  languageList: {
    maxHeight: 400
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WhatsAppColors.border
  },
  selectedLanguageOption: {
    backgroundColor: WhatsAppColors.primary + '20'
  },
  languageOptionText: {
    fontSize: 16,
    color: WhatsAppColors.text
  },
  selectedLanguageOptionText: {
    color: WhatsAppColors.primary,
    fontWeight: '600'
  }
})
