import { useState } from 'react'
import { RAGService } from '@/services/ragService'
import type { RAGQueryResult, RAGEvent } from '@/types/messaging'

interface UseRAGQueryResult {
  query: string
  setQuery: (query: string) => void
  result: RAGQueryResult | null
  loading: boolean
  error: string | null
  search: () => Promise<void>
  reset: () => void
}

/**
 * Deduplicates RAG events by grouping similar results and keeping the highest-scoring one
 */
function deduplicateEvents(events: RAGEvent[]): RAGEvent[] {
  if (!events || events.length === 0) return events

  // Filter out low-quality "unknown" events
  const filtered = events.filter(event => {
    const hasUnknownPerson = event.person === 'unknown' || !event.person
    const hasUnknownType = event.event_type === 'unknown' || !event.event_type
    const hasNoDetails = event.details === 'No details' || !event.details

    // Keep event only if it has meaningful data
    return !(hasUnknownPerson && hasUnknownType) && !hasNoDetails
  })

  // Group by unique key: person + event_type + details (normalized)
  const groups = new Map<string, RAGEvent[]>()

  filtered.forEach(event => {
    // Create a normalized key for grouping
    const key = `${event.person?.toLowerCase()}|${event.event_type?.toLowerCase()}|${event.details?.toLowerCase()}`

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(event)
  })

  // Keep the highest-scoring event from each group
  const deduplicated = Array.from(groups.values()).map(group => {
    // Sort by score descending and take the first (highest score)
    return group.sort((a, b) => b.score - a.score)[0]
  })

  // Sort final results by score descending
  return deduplicated.sort((a, b) => b.score - a.score)
}

export function useRAGQuery(
  conversationId: string,
  targetLang: string,
  userId?: string
): UseRAGQueryResult {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<RAGQueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    if (!query.trim()) {
      console.log('🔍 [useRAGQuery] Empty query, skipping search')
      return
    }

    console.log('🔍 [useRAGQuery] Starting search:', {
      query: query.trim(),
      conversationId,
      targetLang,
      userId
    })

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await RAGService.query(
        query.trim(),
        conversationId,
        targetLang,
        userId
      )

      console.log('🔍 [useRAGQuery] Search completed:', {
        success: response?.success,
        count: response?.count,
        hasAnswer: !!response?.answer,
        answerType: typeof response?.answer
      })

      // Deduplicate results if they exist
      if (response?.results && response.results.length > 0) {
        const originalCount = response.results.length
        const deduplicated = deduplicateEvents(response.results)

        console.log('🔍 [useRAGQuery] Deduplication:', {
          originalCount,
          deduplicatedCount: deduplicated.length,
          removed: originalCount - deduplicated.length
        })

        // Update response with deduplicated results
        response.results = deduplicated
        response.count = deduplicated.length
      }

      setResult(response)
    } catch (err) {
      console.error('🔍 [useRAGQuery] Search failed:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
      console.log('🔍 [useRAGQuery] Search state updated')
    }
  }

  const reset = () => {
    setQuery('')
    setResult(null)
    setError(null)
    setLoading(false)
  }

  return {
    query,
    setQuery,
    result,
    loading,
    error,
    search,
    reset,
  }
}
