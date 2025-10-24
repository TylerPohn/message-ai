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
import { t, Locale, isSupportedLocale } from '@/locales/translations'
import { LanguageStorageService } from '@/services/languageStorageService'

interface LanguageOption {
  code: LanguageCode
  name: string
}

// Language names in their native form (for display in dropdown)
const LANGUAGE_NAMES_NATIVE: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  uk: 'Українська',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ar: 'العربية',
  hi: 'हिन्दी',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  nl: 'Nederlands'
}

export default function LanguageSettingsScreen() {
  const { user, userProfile, updateUserProfile } = useAuth()
  const router = useRouter()
  // Use user's preferred language if available and supported, otherwise default to English
  const locale: Locale = (
    userProfile?.preferredLanguage && isSupportedLocale(userProfile.preferredLanguage)
      ? (userProfile.preferredLanguage as Locale)
      : 'en'
  )
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [autoTranslate, setAutoTranslate] = useState<boolean>(false)
  const [writeInLanguage, setWriteInLanguage] = useState<string>('en')
  const [defaultFormality, setDefaultFormality] = useState<'casual' | 'neutral' | 'formal'>('neutral')
  const [loading, setLoading] = useState(false)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const [showWriteInLanguagePicker, setShowWriteInLanguagePicker] = useState(false)
  const [showFormalityPicker, setShowFormalityPicker] = useState(false)

  // Load current preferences
  useEffect(() => {
    if (userProfile) {
      setSelectedLanguage(userProfile.preferredLanguage || 'en')
      setAutoTranslate(userProfile.autoTranslate || false)
      setWriteInLanguage(userProfile.writeInLanguage || userProfile.preferredLanguage || 'en')
      setDefaultFormality(userProfile.defaultFormality || 'neutral')
    }
  }, [userProfile])

  const languageOptions: LanguageOption[] = Object.entries(
    SUPPORTED_LANGUAGES
  ).map(([code]) => ({
    code: code as LanguageCode,
    name: LANGUAGE_NAMES_NATIVE[code as LanguageCode]
  }))

  const handleSavePreferences = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Update language preferences
      await UserService.updateLanguagePreferences(
        user.uid,
        selectedLanguage,
        autoTranslate
      )

      // Update writing preferences
      await UserService.updateWritingPreferences(
        user.uid,
        writeInLanguage,
        defaultFormality
      )

      // Update local profile
      await updateUserProfile({
        preferredLanguage: selectedLanguage,
        autoTranslate: autoTranslate,
        writeInLanguage: writeInLanguage,
        defaultFormality: defaultFormality
      })

      // Persist language preference to AsyncStorage for login/signup screens
      await LanguageStorageService.saveLanguage(selectedLanguage as Locale)

      Alert.alert(t(locale, 'common.ok'), t(locale, 'languageSettings.successMessage'))
      router.back()
    } catch (error) {
      console.error('Error saving language preferences:', error)
      Alert.alert(t(locale, 'common.error'), t(locale, 'languageSettings.errorMessage'))
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
    return LANGUAGE_NAMES_NATIVE[selectedLanguage as LanguageCode] || 'English'
  }

  const getWriteInLanguageName = () => {
    return LANGUAGE_NAMES_NATIVE[writeInLanguage as LanguageCode] || 'English'
  }

  const getFormalityLabel = (level: 'casual' | 'neutral' | 'formal') => {
    switch (level) {
      case 'casual':
        return t(locale, 'languageSettings.casualOption')
      case 'neutral':
        return t(locale, 'languageSettings.neutralOption')
      case 'formal':
        return t(locale, 'languageSettings.formalOption')
    }
  }

  const formalityOptions: Array<'casual' | 'neutral' | 'formal'> = ['casual', 'neutral', 'formal']

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name='arrow-back' size={24} color='#FFFFFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(locale, 'languageSettings.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* UI Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(locale, 'languageSettings.preferredLanguageSection')}</Text>
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

        {/* Write-In Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(locale, 'languageSettings.writingLanguageSection')}</Text>
          <Text style={styles.sectionDescription}>{t(locale, 'languageSettings.writingLanguageDescription')}</Text>
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setShowWriteInLanguagePicker(true)}
          >
            <Text style={styles.languageSelectorText}>
              {getWriteInLanguageName()}
            </Text>
            <Ionicons
              name='chevron-down'
              size={20}
              color={WhatsAppColors.lightText}
            />
          </TouchableOpacity>
        </View>

        {/* Default Formality Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(locale, 'languageSettings.defaultFormalitySection')}</Text>
          <Text style={styles.sectionDescription}>{t(locale, 'languageSettings.defaultFormalityDescription')}</Text>
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setShowFormalityPicker(true)}
          >
            <Text style={styles.languageSelectorText}>
              {getFormalityLabel(defaultFormality)}
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
              <Text style={styles.toggleTitle}>{t(locale, 'languageSettings.autoTranslateTitle')}</Text>
              <Text style={styles.toggleSubtitle}>
                {t(locale, 'languageSettings.autoTranslateSubtitle')}
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
            {loading ? t(locale, 'languageSettings.savingButton') : t(locale, 'languageSettings.saveButton')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* UI Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        animationType='slide'
        transparent={true}
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(locale, 'languageSettings.selectLanguageTitle')}</Text>
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

      {/* Write-In Language Picker Modal */}
      <Modal
        visible={showWriteInLanguagePicker}
        animationType='slide'
        transparent={true}
        onRequestClose={() => setShowWriteInLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(locale, 'languageSettings.selectWritingLanguageTitle')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowWriteInLanguagePicker(false)}
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    writeInLanguage === item.code && styles.selectedLanguageOption
                  ]}
                  onPress={() => {
                    setWriteInLanguage(item.code)
                    setShowWriteInLanguagePicker(false)
                  }}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      writeInLanguage === item.code && styles.selectedLanguageOptionText
                    ]}
                  >
                    {item.name}
                  </Text>
                  {writeInLanguage === item.code && (
                    <Ionicons name='checkmark' size={20} color={WhatsAppColors.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.languageList}
            />
          </View>
        </View>
      </Modal>

      {/* Formality Picker Modal */}
      <Modal
        visible={showFormalityPicker}
        animationType='slide'
        transparent={true}
        onRequestClose={() => setShowFormalityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(locale, 'languageSettings.selectDefaultFormalityTitle')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFormalityPicker(false)}
              >
                <Ionicons
                  name='close'
                  size={24}
                  color={WhatsAppColors.lightText}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={formalityOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    defaultFormality === item && styles.selectedLanguageOption
                  ]}
                  onPress={() => {
                    setDefaultFormality(item)
                    setShowFormalityPicker(false)
                  }}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      defaultFormality === item && styles.selectedLanguageOptionText
                    ]}
                  >
                    {getFormalityLabel(item)}
                  </Text>
                  {defaultFormality === item && (
                    <Ionicons name='checkmark' size={20} color={WhatsAppColors.primary} />
                  )}
                </TouchableOpacity>
              )}
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
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  sectionDescription: {
    fontSize: 13,
    color: WhatsAppColors.lightText,
    marginBottom: 12,
    paddingHorizontal: 16,
    fontStyle: 'italic'
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
    backgroundColor: WhatsAppColors.secondary + '20'
  },
  languageOptionText: {
    fontSize: 16,
    color: WhatsAppColors.text
  },
  selectedLanguageOptionText: {
    color: WhatsAppColors.secondary,
    fontWeight: '700'
  }
})
