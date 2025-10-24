import React from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRAGQuery } from '@/hooks/useRAGQuery'
import type { RAGEvent } from '@/types/messaging'
import { t, Locale } from '@/locales/translations'

interface Props {
  visible: boolean
  conversationId: string
  targetLang: string
  onClose: () => void
  userLocale?: Locale
}

export function RAGQueryModal({
  visible,
  conversationId,
  targetLang,
  onClose,
  userLocale = 'en'
}: Props) {
  const { query, setQuery, result, loading, error, search, reset } = useRAGQuery(
    conversationId,
    targetLang
  )

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 [RAGQueryModal] State changed:', {
      visible,
      query,
      loading,
      hasResult: !!result,
      hasError: !!error,
      resultCount: result?.count,
      hasAnswer: !!result?.answer,
      hasResults: !!result?.results,
      resultsLength: result?.results?.length
    })

    if (result) {
      console.log('🔍 [RAGQueryModal] Full result object:', JSON.stringify(result, null, 2))
    }
  }, [visible, query, loading, result, error])

  const handleClose = () => {
    console.log('🔍 [RAGQueryModal] Closing modal')
    reset()
    onClose()
  }

  const handleSearch = () => {
    console.log('🔍 [RAGQueryModal] Search button pressed')
    Keyboard.dismiss() // Hide keyboard to reveal results
    search()
  }

  const getEventTypeLabel = (eventType: string): string => {
    const typeMap: Record<string, string> = {
      milestone: t(userLocale, 'rag.eventTypeMilestone'),
      job_change: t(userLocale, 'rag.eventTypeJobChange'),
      health_update: t(userLocale, 'rag.eventTypeHealthUpdate'),
      relocation: t(userLocale, 'rag.eventTypeRelocation'),
      relationship_change: t(userLocale, 'rag.eventTypeRelationshipChange'),
      achievement: t(userLocale, 'rag.eventTypeAchievement'),
    }
    return typeMap[eventType] || t(userLocale, 'rag.eventTypeGeneralUpdate')
  }

  const getEventTypeColor = (eventType: string): string => {
    const colorMap: Record<string, string> = {
      milestone: '#9B59B6',
      job_change: '#3498DB',
      health_update: '#E74C3C',
      relocation: '#F39C12',
      relationship_change: '#E91E63',
      achievement: '#2ECC71',
    }
    return colorMap[eventType] || '#95A5A6'
  }

  const formatRelevance = (score: number): string => {
    return `${(score * 100).toFixed(0)}%`
  }

  const getAnswerText = (answer: any): string => {
    // Handle nested answer format: { response: "text" }
    if (typeof answer === 'object' && answer !== null) {
      if ('response' in answer && typeof answer.response === 'string') {
        return answer.response
      }
      if ('answer' in answer && typeof answer.answer === 'string') {
        return answer.answer
      }
    }
    // Handle direct string format: "text"
    if (typeof answer === 'string') {
      return answer
    }
    // Fallback for unexpected formats
    return String(answer || '')
  }

  const renderEvent = (event: RAGEvent, index: number) => {
    return (
      <View key={index} style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: getEventTypeColor(event.event_type) }]}>
            <Text style={styles.eventTypeBadgeText}>{getEventTypeLabel(event.event_type)}</Text>
          </View>
          <Text style={styles.relevanceText}>
            {t(userLocale, 'rag.relevanceLabel')} {formatRelevance(event.score)}
          </Text>
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.eventRow}>
            <Text style={styles.eventLabel}>{t(userLocale, 'rag.personLabel')}</Text>
            <Text style={styles.eventValue}>{event.person}</Text>
          </View>

          <View style={styles.eventRow}>
            <Text style={styles.eventLabel}>{t(userLocale, 'rag.dateLabel')}</Text>
            <Text style={styles.eventValue}>{event.date}</Text>
          </View>

          <View style={styles.eventRow}>
            <Text style={styles.eventLabel}>{t(userLocale, 'rag.detailsLabel')}</Text>
            <Text style={styles.eventValue}>{event.details}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Ionicons name='sparkles' size={24} color='#00A884' />
              <Text style={styles.title}>{t(userLocale, 'rag.modalTitle')}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name='close' size={24} color='#E9EDEF' />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t(userLocale, 'rag.inputPlaceholder')}
              placeholderTextColor='#8696A0'
              value={query}
              onChangeText={setQuery}
              autoFocus
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.searchButton, (!query.trim() || loading) && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={!query.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size='small' color='#FFFFFF' />
              ) : (
                <Ionicons name='search' size={20} color='#FFFFFF' />
              )}
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps='handled'
          >
            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size='large' color='#00A884' />
                <Text style={styles.loadingText}>{t(userLocale, 'rag.searching')}</Text>
              </View>
            )}

            {/* Error State */}
            {error && !loading && (
              <View style={styles.errorContainer}>
                <Ionicons name='alert-circle' size={48} color='#E74C3C' />
                <Text style={styles.errorTitle}>{t(userLocale, 'rag.errorTitle')}</Text>
                <Text style={styles.errorMessage}>{t(userLocale, 'rag.errorMessage')}</Text>
              </View>
            )}

            {/* Results */}
            {result && !loading && !error && (
              <>
                {console.log('🔍 [RAGQueryModal] Rendering results section')}
                {/* LLM Answer */}
                {result.answer && (
                  <>
                    {console.log('🔍 [RAGQueryModal] Rendering answer:', typeof result.answer)}
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerTitle}>{t(userLocale, 'rag.answerTitle')}</Text>
                      <View style={styles.answerBox}>
                        <Text style={styles.answerText}>{getAnswerText(result.answer)}</Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Structured Results */}
                {result.results && result.results.length > 0 && (
                  <>
                    {console.log('🔍 [RAGQueryModal] Rendering', result.results.length, 'event cards')}
                    <View style={styles.resultsContainer}>
                      <Text style={styles.resultsTitle}>
                        {t(userLocale, 'rag.resultsTitle')} ({result.count})
                      </Text>
                      {result.results.map((event, index) => renderEvent(event, index))}
                    </View>
                  </>
                )}

                {/* No Results */}
                {result.count === 0 && (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name='information-circle' size={48} color='#8696A0' />
                    <Text style={styles.noResultsTitle}>{t(userLocale, 'rag.noResults')}</Text>
                    <Text style={styles.noResultsDescription}>
                      {t(userLocale, 'rag.noResultsDescription')}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0B141A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2C34',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#E9EDEF',
    maxHeight: 100,
  },
  searchButton: {
    backgroundColor: '#00A884',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#2A3942',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 40,
    paddingTop: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8696A0',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E74C3C',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8696A0',
    marginTop: 8,
    textAlign: 'center',
  },
  answerContainer: {
    marginBottom: 8,
  },
  answerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E9EDEF',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  answerBox: {
    backgroundColor: '#1F2C34',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#00A884',
    borderWidth: 1,
    borderColor: '#2A3942',
  },
  answerText: {
    fontSize: 16,
    color: '#E9EDEF',
    lineHeight: 24,
  },
  resultsContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E9EDEF',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  eventCard: {
    backgroundColor: '#1F2C34',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A3942',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  relevanceText: {
    fontSize: 12,
    color: '#8696A0',
  },
  eventDetails: {
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 8,
  },
  eventLabel: {
    fontSize: 14,
    color: '#8696A0',
    fontWeight: '500',
    minWidth: 60,
  },
  eventValue: {
    flex: 1,
    fontSize: 14,
    color: '#E9EDEF',
  },
  noResultsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8696A0',
    marginTop: 16,
  },
  noResultsDescription: {
    fontSize: 14,
    color: '#8696A0',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
})
