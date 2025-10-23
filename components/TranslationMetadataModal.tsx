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
import type {
  Translation,
  CulturalContext,
  Formality,
  IdiomExplanation
} from '@/types/messaging'
import { SUPPORTED_LANGUAGES } from '@/types/messaging'
import { t, Locale } from '@/locales/translations'

interface Props {
  visible: boolean
  translation: Translation | null
  onClose: () => void
  userLocale?: Locale
}

export function TranslationMetadataModal({ visible, translation, onClose, userLocale = 'en' }: Props) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    idioms: false,
    culturalContext: false,
    formality: false
  })

  if (!translation) {
    return null
  }

  const sourceLanguageCode =
    translation.detectedSourceLanguage as keyof typeof SUPPORTED_LANGUAGES
  const sourceLanguageName =
    SUPPORTED_LANGUAGES[sourceLanguageCode] ||
    translation.detectedSourceLanguage

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const renderIdiomSection = () => {
    if (!translation.idioms || translation.idioms.length === 0) {
      return null
    }

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('idioms')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>
            🎭 {t(userLocale, 'translationDetails.idiomsExpressionsTitle')} ({translation.idioms.length})
          </Text>
          <Ionicons
            name={expandedSections.idioms ? 'chevron-up' : 'chevron-down'}
            size={20}
            color='#00A884'
          />
        </TouchableOpacity>

        {expandedSections.idioms && (
          <View style={styles.sectionContent}>
            {translation.idioms.map((idiom, index) => (
              <View key={index} style={styles.idiomItem}>
                <Text style={styles.idiomPhrase}>"{idiom.phrase}"</Text>
                <Text style={styles.idiomType}>
                  {idiom.type === 'idiom' ? t(userLocale, 'translationDetails.idiomLabel') : t(userLocale, 'translationDetails.slangLabel')}
                </Text>
                <Text style={styles.idiomLabel}>{t(userLocale, 'translationDetails.meansLabel')}</Text>
                <Text style={styles.idiomText}>{idiom.meaning}</Text>
                {idiom.example && (
                  <>
                    <Text style={styles.idiomLabel}>{t(userLocale, 'translationDetails.exampleLabel')}</Text>
                    <Text style={styles.idiomExample}>{idiom.example}</Text>
                  </>
                )}
                {index < translation.idioms!.length - 1 && (
                  <View style={styles.itemDivider} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  const renderCulturalContextSection = () => {
    if (!translation.culturalContext?.hasNuance) {
      return null
    }

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('culturalContext')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>💡 Cultural Context</Text>
          <Ionicons
            name={expandedSections.culturalContext ? 'chevron-up' : 'chevron-down'}
            size={20}
            color='#FFD700'
          />
        </TouchableOpacity>

        {expandedSections.culturalContext && (
          <View style={styles.sectionContent}>
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Why It's Different:</Text>
              <Text style={styles.contextText}>
                {translation.culturalContext.hint}
              </Text>
            </View>

            {translation.culturalContext.whyDiffers && (
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>Explanation:</Text>
                <Text style={styles.contextText}>
                  {translation.culturalContext.whyDiffers}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    )
  }

  const renderFormalitySection = () => {
    if (!translation.formality) {
      return null
    }

    const getEmoji = (level: string) => {
      switch (level) {
        case 'casual':
          return '😊'
        case 'neutral':
          return '👋'
        case 'formal':
          return '🎩'
        default:
          return '👋'
      }
    }

    const getLabel = (level: string) => {
      switch (level) {
        case 'casual':
          return t(userLocale, 'translationDetails.casualLabel')
        case 'neutral':
          return t(userLocale, 'translationDetails.neutralLabel')
        case 'formal':
          return t(userLocale, 'translationDetails.formalLabel')
        default:
          return t(userLocale, 'translationDetails.neutralLabel')
      }
    }

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('formality')}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>
            {getEmoji(translation.formality.detected)} {t(userLocale, 'translationDetails.formalityLevelTitle')}
          </Text>
          <Ionicons
            name={expandedSections.formality ? 'chevron-up' : 'chevron-down'}
            size={20}
            color='#5AC8FA'
          />
        </TouchableOpacity>

        {expandedSections.formality && (
          <View style={styles.sectionContent}>
            <View style={styles.formalityCurrentBox}>
              <Text style={styles.formalityCurrentLabel}>{t(userLocale, 'translationDetails.detectedLabel')}</Text>
              <Text style={styles.formalityCurrentValue}>
                {getLabel(translation.formality.detected)}
              </Text>
            </View>

            <Text style={styles.alternativesLabel}>{t(userLocale, 'translationDetails.alternativeVersionsLabel')}</Text>
            {(['casual', 'neutral', 'formal'] as const).map((level) => (
              <View
                key={level}
                style={[
                  styles.alternativeBox,
                  level === translation.formality!.detected &&
                    styles.alternativeBoxSelected
                ]}
              >
                <View style={styles.alternativeHeader}>
                  <Text style={styles.alternativeEmoji}>{getEmoji(level)}</Text>
                  <Text style={styles.alternativeLabel_inline}>
                    {getLabel(level)}
                  </Text>
                  {level === translation.formality!.detected && (
                    <Text style={styles.detectedBadge}>{t(userLocale, 'translationDetails.detectedBadgeLabel')}</Text>
                  )}
                </View>
                <Text style={styles.alternativeText}>
                  {translation.formality!.alternatives[level]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Text style={styles.translatedFromLabel}>{t(userLocale, 'chat.translationInfo', { lang: '' }).replace(/\s*$/, '')}</Text>
              <Text style={styles.translatedFromLang}>{sourceLanguageName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name='close' size={24} color='#E9EDEF' />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={true}
          >
            {renderIdiomSection()}
            {renderCulturalContextSection()}
            {renderFormalitySection()}

            {!translation.idioms &&
              !translation.culturalContext?.hasNuance &&
              !translation.formality && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No additional context available for this translation.
                  </Text>
                </View>
              )}

            <View style={styles.footer} />
          </ScrollView>
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
    maxHeight: '90%',
    paddingTop: 0
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
  translatedFromLabel: {
    fontSize: 12,
    color: '#8696A0',
    fontWeight: '500'
  },
  translatedFromLang: {
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
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#2A3942',
    overflow: 'hidden'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1F2C34'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E9EDEF',
    flex: 1
  },
  sectionContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2C34'
  },

  // Idiom styles
  idiomItem: {
    marginBottom: 12
  },
  idiomPhrase: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00A884',
    marginBottom: 4
  },
  idiomType: {
    fontSize: 11,
    color: '#8696A0',
    fontStyle: 'italic',
    marginBottom: 6
  },
  idiomLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8696A0',
    marginTop: 6,
    marginBottom: 2
  },
  idiomText: {
    fontSize: 13,
    color: '#E9EDEF',
    lineHeight: 18
  },
  idiomExample: {
    fontSize: 12,
    color: '#8696A0',
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#00A884'
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#1F2C34',
    marginTop: 12,
    marginBottom: 12
  },

  // Cultural context styles
  contextItem: {
    marginBottom: 12
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 4
  },
  contextText: {
    fontSize: 13,
    color: '#E9EDEF',
    lineHeight: 18
  },

  // Formality styles
  formalityCurrentBox: {
    backgroundColor: '#0B141A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#5AC8FA'
  },
  formalityCurrentLabel: {
    fontSize: 11,
    color: '#8696A0',
    marginBottom: 4
  },
  formalityCurrentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5AC8FA'
  },
  alternativesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8696A0',
    marginBottom: 8
  },
  alternativeBox: {
    backgroundColor: '#0B141A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A3942'
  },
  alternativeBoxSelected: {
    borderColor: '#00A884',
    borderWidth: 2,
    backgroundColor: 'rgba(0, 168, 132, 0.05)'
  },
  alternativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  alternativeEmoji: {
    fontSize: 16,
    marginRight: 6
  },
  alternativeLabel_inline: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E9EDEF',
    flex: 1
  },
  detectedBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00A884',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    borderRadius: 4
  },
  alternativeText: {
    fontSize: 13,
    color: '#E9EDEF',
    lineHeight: 18,
    marginLeft: 22,
    fontStyle: 'italic'
  },

  // Empty state
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 13,
    color: '#8696A0',
    textAlign: 'center',
    fontStyle: 'italic'
  },

  // Footer spacing
  footer: {
    height: 20
  }
})
