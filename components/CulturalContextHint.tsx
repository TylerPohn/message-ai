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
import { CulturalContext } from '@/types/messaging'

interface Props {
  culturalContext: CulturalContext | undefined
}

export function CulturalContextHint({ culturalContext }: Props) {
  const [showDetails, setShowDetails] = useState(false)

  if (!culturalContext?.hasNuance) {
    return null
  }

  return (
    <>
      <TouchableOpacity
        style={styles.hintButton}
        onPress={() => setShowDetails(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.hintIcon}>💡</Text>
        <Text style={styles.hintText} numberOfLines={2}>
          {culturalContext.hint}
        </Text>
        <Ionicons name='chevron-forward' size={14} color='#666' />
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        transparent
        animationType='fade'
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>Cultural Context</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Ionicons name='close' size={24} color='#000' />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What's Different?</Text>
                <Text style={styles.sectionText}>{culturalContext.hint}</Text>
              </View>

              {culturalContext.whyDiffers && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Why the Difference?</Text>
                  <Text style={styles.sectionText}>
                    {culturalContext.whyDiffers}
                  </Text>
                </View>
              )}

              <View style={styles.tip}>
                <Text style={styles.tipIcon}>💬</Text>
                <Text style={styles.tipText}>
                  Understanding these differences helps you communicate more
                  naturally and avoid misunderstandings!
                </Text>
              </View>
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}
            >
              <Text style={styles.closeButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
    marginTop: 6
  },
  hintIcon: {
    fontSize: 16,
    marginRight: 6
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
    marginRight: 6
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
    maxHeight: '80%',
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
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8
  },
  sectionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20
  },
  tip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0084FF',
    marginBottom: 20
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 8
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#0066cc',
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
