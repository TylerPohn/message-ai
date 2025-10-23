import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Locale } from '@/locales/translations'

interface Props {
  currentLocale: Locale
  onSelectLocale: (locale: Locale) => void
  lightMode?: boolean
}

const LANGUAGE_LIST: { code: Locale; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' }
]

export function LanguageSelector({ currentLocale, onSelectLocale, lightMode = false }: Props) {
  const [modalVisible, setModalVisible] = useState(false)

  const currentLanguage = LANGUAGE_LIST.find(lang => lang.code === currentLocale)

  const handleSelect = (locale: Locale) => {
    onSelectLocale(locale)
    setModalVisible(false)
  }

  const colors = lightMode ? {
    background: '#FFFFFF',
    text: '#000000',
    secondaryText: '#666666',
    border: '#CCCCCC',
    selected: '#00A884',
    selectedBg: '#E8F5F0'
  } : {
    background: '#1F2C34',
    text: '#E9EDEF',
    secondaryText: '#8696A0',
    border: '#2A3942',
    selected: '#00A884',
    selectedBg: '#0A3A2E'
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.button, lightMode && styles.buttonLight]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="language"
          size={20}
          color={lightMode ? '#666' : '#8696A0'}
        />
        <Text style={[styles.buttonText, lightMode && styles.buttonTextLight]}>
          {currentLanguage?.nativeName || 'English'}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={lightMode ? '#666' : '#8696A0'}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Language
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.languageList}>
              {LANGUAGE_LIST.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    { borderBottomColor: colors.border },
                    language.code === currentLocale && { backgroundColor: colors.selectedBg }
                  ]}
                  onPress={() => handleSelect(language.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.languageInfo}>
                    <Text style={[styles.languageName, { color: colors.text }]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[styles.languageEnglish, { color: colors.secondaryText }]}>
                      {language.name}
                    </Text>
                  </View>
                  {language.code === currentLocale && (
                    <Ionicons name="checkmark" size={24} color={colors.selected} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonLight: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 14,
    color: '#E9EDEF',
    flex: 1,
  },
  buttonTextLight: {
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  languageList: {
    paddingHorizontal: 16,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  languageEnglish: {
    fontSize: 13,
  },
})
