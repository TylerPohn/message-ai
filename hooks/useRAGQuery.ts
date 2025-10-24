import { useState } from 'react'
import { RAGService } from '@/services/ragService'
import type { RAGQueryResult } from '@/types/messaging'

interface UseRAGQueryResult {
  query: string
  setQuery: (query: string) => void
  result: RAGQueryResult | null
  loading: boolean
  error: string | null
  search: () => Promise<void>
  reset: () => void
}

export function useRAGQuery(
  conversationId: string,
  targetLang: string
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
      targetLang
    })

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await RAGService.query(
        query.trim(),
        conversationId,
        targetLang
      )

      console.log('🔍 [useRAGQuery] Search completed:', {
        success: response?.success,
        count: response?.count,
        hasAnswer: !!response?.answer,
        answerType: typeof response?.answer
      })

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
