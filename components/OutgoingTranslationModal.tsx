import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { FormalityAlternatives } from '@/types/messaging'
import { SUPPORTED_LANGUAGES } from '@/types/messaging'
import { t, Locale } from '@/locales/translations'

interface Props {
  visible: boolean
  originalText: string
  sourceLanguage: string
  targetLanguage: string
  formalityAlternatives: FormalityAlternatives | null
  defaultFormality: 'casual' | 'neutral' | 'formal'
  onSend: (selectedText: string, selectedFormality: 'casual' | 'neutral' | 'formal') => void
  onCancel: () => void
  userLocale?: Locale
  loading?: boolean
}

export function OutgoingTranslationModal({
  visible,
  originalText,
  sourceLanguage,
  targetLanguage,
  formalityAlternatives,
  defaultFormality,
  onSend,
  onCancel,
  userLocale = 'en',
  loading = false
}: Props) {
  const [selectedFormality, setSelectedFormality] = useState<'casual' | 'neutral' | 'formal'>(defaultFormality)

  const sourceLanguageName = SUPPORTED_LANGUAGES[sourceLanguage as keyof typeof SUPPORTED_LANGUAGES] || sourceLanguage
  const targetLanguageName = SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES] || targetLanguage

  const getEmoji = (level: 'casual' | 'neutral' | 'formal') => {
    switch (level) {
      case 'casual':
        return '😊'
      case 'neutral':
        return '👋'
      case 'formal':
        return '🎩'
    }
  }

  const getLabel = (level: 'casual' | 'neutral' | 'formal') => {
    switch (level) {
      case 'casual':
        return t(userLocale, 'translationDetails.casualLabel')
      case 'neutral':
        return t(userLocale, 'translationDetails.neutralLabel')
      case 'formal':
        return t(userLocale, 'translationDetails.formalLabel')
    }
  }

  const handleSend = () => {
    if (formalityAlternatives) {
      onSend(formalityAlternatives[selectedFormality], selectedFormality)
    }
  }

  // Reset selected formality when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedFormality(defaultFormality)
    }
  }, [visible, defaultFormality])

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Text style={styles.translatingLabel}>Translating</Text>
              <Text style={styles.languagePair}>
                {sourceLanguageName} → {targetLanguageName}
              </Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name='close' size={24} color='#E9EDEF' />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={true}
          >
            {/* Original Message */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Original Message</Text>
              <View style={styles.originalMessageBox}>
                <Text style={styles.originalMessageText}>{originalText}</Text>
              </View>
            </View>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size='large' color='#00A884' />
                <Text style={styles.loadingText}>Translating your message...</Text>
              </View>
            )}

            {/* Formality Options */}
            {!loading && formalityAlternatives && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Choose Formality Level</Text>
                <Text style={styles.sectionHint}>
                  Tap to select how formal you want your message to be
                </Text>

                {(['casual', 'neutral', 'formal'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.formalityOption,
                      selectedFormality === level && styles.formalityOptionSelected
                    ]}
                    onPress={() => setSelectedFormality(level)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.formalityHeader}>
                      <Text style={styles.formalityEmoji}>{getEmoji(level)}</Text>
                      <Text style={styles.formalityLabel}>{getLabel(level)}</Text>
                      {level === defaultFormality && (
                        <Text style={styles.defaultBadge}>Default</Text>
                      )}
                      {selectedFormality === level && (
                        <Ionicons name='checkmark-circle' size={20} color='#00A884' style={styles.checkIcon} />
                      )}
                    </View>
                    <Text style={styles.formalityText}>
                      {formalityAlternatives[level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.footer} />
          </ScrollView>

          {/* Action Buttons */}
          {!loading && formalityAlternatives && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.sendButton]}
                onPress={handleSend}
                activeOpacity={0.7}
              >
                <Ionicons name='send' size={18} color='#FFFFFF' style={styles.sendIcon} />
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: '#1F2C34',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
    backgroundColor: '#0B141A'
  },
  headerTitle: {
    flex: 1
  },
  translatingLabel: {
    fontSize: 12,
    color: '#8696A0',
    fontWeight: '500'
  },
  languagePair: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E9EDEF',
    marginTop: 2
  },
  closeButton: {
    padding: 8
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  section: {
    marginBottom: 20
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8696A0',
    marginBottom: 8
  },
  sectionHint: {
    fontSize: 12,
    color: '#667781',
    marginBottom: 12,
    fontStyle: 'italic'
  },
  originalMessageBox: {
    backgroundColor: '#2A3942',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#667781'
  },
  originalMessageText: {
    fontSize: 14,
    color: '#E9EDEF',
    lineHeight: 20
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    fontSize: 14,
    color: '#8696A0',
    marginTop: 16,
    fontStyle: 'italic'
  },
  formalityOption: {
    backgroundColor: '#2A3942',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#2A3942'
  },
  formalityOptionSelected: {
    borderColor: '#00A884',
    backgroundColor: 'rgba(0, 168, 132, 0.08)'
  },
  formalityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  formalityEmoji: {
    fontSize: 18,
    marginRight: 8
  },
  formalityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E9EDEF',
    flex: 1
  },
  defaultBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5AC8FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(90, 200, 250, 0.15)',
    borderRadius: 4,
    marginRight: 8
  },
  checkIcon: {
    marginLeft: 4
  },
  formalityText: {
    fontSize: 14,
    color: '#E9EDEF',
    lineHeight: 20,
    marginLeft: 26
  },
  footer: {
    height: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A3942',
    gap: 12,
    backgroundColor: '#1F2C34'
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10
  },
  cancelButton: {
    backgroundColor: '#2A3942'
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E9EDEF'
  },
  sendButton: {
    backgroundColor: '#00A884',
    flexDirection: 'row',
    gap: 6
  },
  sendIcon: {
    marginRight: 4
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF'
  }
})
