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
import type { IdiomExplanation as IdiomExplanationType } from '@/types/messaging'

interface Props {
  idioms: IdiomExplanationType[] | undefined
}

export function IdiomExplanation({ idioms }: Props) {
  const [showModal, setShowModal] = useState(false)

  if (!idioms || idioms.length === 0) {
    return null
  }

  const getIcon = (type: string) => {
    return type === 'idiom' ? '🎭' : '💬'
  }

  return (
    <>
      <TouchableOpacity
        style={styles.idiomButton}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.idiomIcon}>🎓</Text>
        <Text style={styles.idiomText} numberOfLines={1}>
          {idioms.length} {idioms.length === 1 ? 'expression' : 'expressions'}
          found
        </Text>
        <Ionicons name='chevron-forward' size={14} color='#666' />
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType='fade'
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>
                {idioms.length} {idioms.length === 1 ? 'Expression' : 'Expressions'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name='close' size={24} color='#000' />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content}>
              {idioms.map((idiom, idx) => (
                <View key={idx} style={styles.idiomItem}>
                  <View style={styles.idiomHeader}>
                    <Text style={styles.typeIcon}>
                      {getIcon(idiom.type)}
                    </Text>
                    <View style={styles.typeInfo}>
                      <Text style={styles.phrase}>"{idiom.phrase}"</Text>
                      <Text style={styles.type}>
                        {idiom.type === 'idiom' ? 'Idiom' : 'Slang'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.meaning}>
                    <Text style={styles.meaningLabel}>Means:</Text>
                    <Text style={styles.meaningText}>{idiom.meaning}</Text>
                  </View>

                  {idiom.example && (
                    <View style={styles.example}>
                      <Text style={styles.exampleLabel}>Example:</Text>
                      <Text style={styles.exampleText}>{idiom.example}</Text>
                    </View>
                  )}

                  {idx < idioms.length - 1 && <View style={styles.divider} />}
                </View>
              ))}

              <View style={styles.tip}>
                <Text style={styles.tipIcon}>💡</Text>
                <Text style={styles.tipText}>
                  Learning idioms and slang helps you understand conversations
                  better and speak more naturally!
                </Text>
              </View>
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
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
  idiomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
    marginTop: 6
  },
  idiomIcon: {
    fontSize: 16,
    marginRight: 6
  },
  idiomText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    fontWeight: '500'
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
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  idiomItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  idiomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 8,
    marginTop: 2
  },
  typeInfo: {
    flex: 1
  },
  phrase: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2
  },
  type: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic'
  },
  meaning: {
    marginLeft: 28,
    marginBottom: 8
  },
  meaningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  meaningText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
  },
  example: {
    marginLeft: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    backgroundColor: '#f9f9f9',
    borderRadius: 4
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2
  },
  exampleText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
    fontStyle: 'italic'
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginTop: 8
  },
  tip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
    marginBottom: 20
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 8
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#2e7d32',
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
