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
import { Formality } from '@/types/messaging'
import { t, Locale } from '@/locales/translations'

interface Props {
  formality: Formality | undefined
  userLocale?: Locale
}

export function FormalityBadge({ formality, userLocale = 'en' }: Props) {
  const [showOptions, setShowOptions] = useState(false)

  if (!formality) {
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

  const getColor = (level: string) => {
    switch (level) {
      case 'casual':
        return '#FF9500' // Orange
      case 'neutral':
        return '#5AC8FA' // Light blue
      case 'formal':
        return '#2196F3' // Blue
      default:
        return '#5AC8FA'
    }
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.badge,
          { borderColor: getColor(formality.detected) }
        ]}
        onPress={() => setShowOptions(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>{getEmoji(formality.detected)}</Text>
        <Text style={styles.label}>{getLabel(formality.detected)}</Text>
        <Ionicons name='chevron-down' size={12} color='#666' />
      </TouchableOpacity>

      {/* Alternatives Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType='fade'
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>{t(userLocale, 'translationDetails.formalityLevelTitle')}</Text>
              <TouchableOpacity onPress={() => setShowOptions(false)}>
                <Ionicons name='close' size={24} color='#000' />
              </TouchableOpacity>
            </View>

            {/* Explanation */}
            <View style={styles.explanation}>
              <Text style={styles.explanationText}>
                This message has a {formality.detected} tone. You can view
                alternative versions below:
              </Text>
            </View>

            {/* Alternatives */}
            <ScrollView style={styles.content}>
              {(['casual', 'neutral', 'formal'] as const).map((level) => (
                <View
                  key={level}
                  style={[
                    styles.alternative,
                    level === formality.detected &&
                      styles.alternativeSelected
                  ]}
                >
                  <View style={styles.alternativeHeader}>
                    <Text style={styles.alternativeEmoji}>
                      {getEmoji(level)}
                    </Text>
                    <Text style={styles.alternativeLabel}>
                      {getLabel(level)}
                    </Text>
                    {level === formality.detected && (
                      <Text style={styles.badge_selected}>{t(userLocale, 'translationDetails.detectedBadgeLabel')}</Text>
                    )}
                  </View>
                  <Text style={styles.alternativeText}>
                    {formality.alternatives[level]}
                  </Text>
                </View>
              ))}

              <View style={styles.tip}>
                <Text style={styles.tipIcon}>💡</Text>
                <Text style={styles.tipText}>
                  Choose the version that best matches the relationship and
                  context of your conversation!
                </Text>
              </View>
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.closeButtonText}>Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#f5f5f5',
    marginTop: 6,
    alignSelf: 'flex-start'
  },
  emoji: {
    fontSize: 14,
    marginRight: 4
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginRight: 4
  },

  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000'
  },
  explanation: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  explanationText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  alternative: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  alternativeSelected: {
    borderColor: '#0084FF',
    backgroundColor: '#f0f7ff'
  },
  alternativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  alternativeEmoji: {
    fontSize: 18,
    marginRight: 8
  },
  alternativeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    flex: 1
  },
  badge_selected: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0084FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#e3f2fd'
  },
  alternativeText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    fontStyle: 'italic'
  },
  tip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
    marginBottom: 20
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 8
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
    lineHeight: 18
  },
  closeButton: {
    backgroundColor: '#0084FF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
})
