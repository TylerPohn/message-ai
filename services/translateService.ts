/**
 * Translation Service
 *
 * Provides translation functionality by sending requests to the translation webhook endpoint.
 * Uses EXPO_PUBLIC_TRANSLATION_ENDPOINT from process.env or Constants.expoConfig.extra.
 * Handles network errors, JSON parsing, and provides descriptive error messages.
 *
 * Integrates with TranslationStorageService for Firestore caching.
 */

import Constants from 'expo-constants'
import { TranslationStorageService } from './translationStorageService'
import { RateLimitService } from './rateLimitService'
import {
  CulturalContext,
  Formality,
  FormalityAlternatives,
  IdiomExplanation
} from '@/types/messaging'

export class TranslateService {
  // Language code to full name mapping
  private static readonly LANGUAGE_NAMES: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'sv': 'Swedish',
    'da': 'Danish',
    'fi': 'Finnish',
    'no': 'Norwegian',
    'cs': 'Czech',
    'el': 'Greek',
    'he': 'Hebrew',
    'id': 'Indonesian',
    'ms': 'Malay',
    'uk': 'Ukrainian',
    'ro': 'Romanian',
    'hu': 'Hungarian',
    'sk': 'Slovak'
  }

  /**
   * Convert ISO language code to full language name
   */
  private static getLanguageName(code: string): string {
    const lowerCode = code.toLowerCase().trim()
    return this.LANGUAGE_NAMES[lowerCode] || code
  }

  private static readonly TRANSLATION_ENDPOINT = (() => {
    console.log('🔧 [TranslateService] Initializing translation service...')
    console.log(
      '🔧 [TranslateService] Environment variables available:',
      Object.keys(process.env).filter((key) => key.includes('N8N') || key.includes('WEBHOOK'))
    )

    // Try process.env first (for .env files)
    let endpoint = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL
    console.log(
      '🔧 [TranslateService] process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL:',
      endpoint
    )

    // Fallback to Constants.expoConfig.extra (for app.json configuration)
    if (!endpoint) {
      endpoint = Constants.expoConfig?.extra?.EXPO_PUBLIC_N8N_WEBHOOK_URL
      console.log(
        '🔧 [TranslateService] Constants.expoConfig.extra.EXPO_PUBLIC_N8N_WEBHOOK_URL:',
        endpoint
      )
    }

    if (!endpoint) {
      console.error(
        '❌ [TranslateService] EXPO_PUBLIC_N8N_WEBHOOK_URL is not set in either process.env or app.json!'
      )
      console.error(
        '❌ [TranslateService] Available process.env vars:',
        Object.keys(process.env)
      )
      console.error(
        '❌ [TranslateService] Available Constants.expoConfig.extra:',
        Constants.expoConfig?.extra
      )
      throw new Error(
        'EXPO_PUBLIC_N8N_WEBHOOK_URL environment variable is required but not set. ' +
          'Please set this variable in your .env file or app.json extra configuration.'
      )
    }

    console.log(
      '✅ [TranslateService] N8N webhook endpoint configured:',
      endpoint
    )
    return endpoint
  })()

  // In-memory cache to avoid duplicate requests
  private static cache = new Map<string, { result: any; timestamp: number }>()
  private static readonly CACHE_TTL = 5000 // 5 seconds cache TTL

  /**
   * Detects the language of a message
   *
   * @param message - The message text to detect language for
   * @returns Promise<string> - The detected language code
   * @throws Error - If network request fails, response is not ok, or JSON parsing fails
   */
  static async detectLanguage(message: string): Promise<string> {
    console.log(
      '🌍 [TranslateService] detectLanguage called with message:',
      message?.substring(0, 50) + '...'
    )
    console.log(
      '🌍 [TranslateService] Endpoint being used:',
      this.TRANSLATION_ENDPOINT
    )

    try {
      // Validate input parameters
      if (!message || typeof message !== 'string') {
        console.error('❌ [TranslateService] Invalid message parameter:', {
          message,
          type: typeof message
        })
        throw new Error('Message must be a non-empty string')
      }

      // Create cache key for language detection
      const cacheKey = `detect_${message.trim()}`
      const now = Date.now()

      // Check if we have a cached result that's still valid
      const cached = this.cache.get(cacheKey)
      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        return cached.result.detectedLanguage || 'en'
      }

      // Clean up expired cache entries
      this.cleanupExpiredCache(now)

      // Prepare request body for language detection
      const requestBody = {
        type: 'translate',
        message: message.trim(),
        action: 'detect'
      }

      // Make the HTTP request
      console.log(
        '🌍 [TranslateService] Making language detection request to:',
        this.TRANSLATION_ENDPOINT
      )
      console.log(
        '🌍 [TranslateService] Request body:',
        JSON.stringify(requestBody, null, 2)
      )

      const response = await fetch(this.TRANSLATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('🌍 [TranslateService] Response status:', response.status)
      console.log(
        '🌍 [TranslateService] Response headers:',
        Object.fromEntries(response.headers.entries())
      )

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error(
          '❌ [TranslateService] Language detection request failed:',
          {
            status: response.status,
            statusText: response.statusText,
            errorText
          }
        )
        throw new Error(
          `Language detection request failed with status ${response.status}: ${errorText}`
        )
      }

      // Parse JSON response
      try {
        const detectionData = await response.json()
        console.log(
          '✅ [TranslateService] Language detection successful:',
          detectionData
        )

        // Cache the successful result
        this.cache.set(cacheKey, {
          result: detectionData,
          timestamp: now
        })

        const detectedLanguage = detectionData.detectedLanguage || 'en'
        console.log(
          '🌍 [TranslateService] Detected language:',
          detectedLanguage
        )
        return detectedLanguage
      } catch (jsonError) {
        throw new Error(
          `Failed to parse language detection response as JSON: ${
            jsonError instanceof Error
              ? jsonError.message
              : 'Unknown JSON error'
          }`
        )
      }
    } catch (error) {
      console.error('❌ [TranslateService] Language detection error:', error)

      // Handle network errors and other exceptions
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(
          '❌ [TranslateService] Network fetch error:',
          error.message
        )
        throw new Error(
          `Network error: Unable to connect to translation service. Please check your internet connection.`
        )
      }

      if (error instanceof Error) {
        console.error(
          '❌ [TranslateService] Language detection failed:',
          error.message
        )
        throw new Error(`Language detection failed: ${error.message}`)
      }

      console.error('❌ [TranslateService] Unknown error occurred')
      throw new Error(`Language detection failed: Unknown error occurred`)
    }
  }

  /**
   * Translates a message to the target language
   *
   * @param message - The message text to translate
   * @param targetLang - The target language code (e.g., 'es', 'fr', 'de')
   * @param userId - Optional user ID for rate limiting (if not provided, rate limiting is skipped)
   * @returns Promise<any> - The translated message response from the API
   * @throws Error - If network request fails, response is not ok, or JSON parsing fails
   */
  static async translateMessage(
    message: string,
    targetLang: string,
    userId?: string
  ): Promise<any> {
    try {
      // Validate input parameters
      if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string')
      }

      if (!targetLang || typeof targetLang !== 'string') {
        throw new Error('Target language must be a non-empty string')
      }

      // Check rate limit if userId is provided
      if (userId) {
        const rateLimitResult = await RateLimitService.checkRateLimit(userId, 'translation')
        if (!rateLimitResult.allowed) {
          throw new Error(rateLimitResult.message || 'Translation rate limit exceeded')
        }
        console.log(`[TranslateService] Rate limit check passed. ${rateLimitResult.remainingTokens} translations remaining`)
      }

      // Create cache key from message and target language
      const cacheKey = `${message.trim()}|${targetLang.trim()}`
      const now = Date.now()

      // Check if we have a cached result that's still valid
      const cached = this.cache.get(cacheKey)
      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        return cached.result
      }

      // Clean up expired cache entries
      this.cleanupExpiredCache(now)

      // Prepare request body
      const requestBody = {
        type: 'translate',
        message: message.trim(),
        target_lang: targetLang.trim(),
        target_lang_name: this.getLanguageName(targetLang)
      }

      console.log('📤 [TranslateService] Sending request:', {
        endpoint: this.TRANSLATION_ENDPOINT,
        body: requestBody
      })

      // Make the HTTP request
      const response = await fetch(this.TRANSLATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 [TranslateService] Response status:', response.status)

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('❌ [TranslateService] Error response:', errorText)
        throw new Error(
          `Translation request failed with status ${response.status}: ${errorText}`
        )
      }

      // Get raw response text first for debugging
      const responseText = await response.text()
      console.log('📥 [TranslateService] Raw response:', responseText.substring(0, 500))

      // Parse JSON response
      try {
        const translatedData = JSON.parse(responseText)

        // Cache the successful result
        this.cache.set(cacheKey, {
          result: translatedData,
          timestamp: now
        })

        return translatedData
      } catch (jsonError) {
        console.error('❌ [TranslateService] Failed to parse JSON. Raw response:', responseText)
        throw new Error(
          `Failed to parse translation response as JSON: ${
            jsonError instanceof Error
              ? jsonError.message
              : 'Unknown JSON error'
          }`
        )
      }
    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Network error: Unable to connect to translation service. Please check your internet connection.`
        )
      }

      if (error instanceof Error) {
        throw new Error(`Translation failed: ${error.message}`)
      }

      throw new Error(`Translation failed: Unknown error occurred`)
    }
  }

  /**
   * Cleans up expired cache entries to prevent memory leaks
   *
   * @param currentTime - Current timestamp in milliseconds
   */
  private static cleanupExpiredCache(currentTime: number): void {
    for (const [key, value] of this.cache.entries()) {
      if (currentTime - value.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Transform API's snake_case cultural context to camelCase interface
   * API returns: has_nuance, why_differs
   * Interface expects: hasNuance, whyDiffers
   */
  private static transformCulturalContext(apiContext: any): CulturalContext | undefined {
    if (!apiContext) return undefined

    return {
      hasNuance: apiContext.has_nuance ?? apiContext.hasNuance ?? false,
      hint: apiContext.hint || '',
      whyDiffers: apiContext.why_differs ?? apiContext.whyDiffers
    }
  }

  /**
   * Translate a message and store result in Firestore
   * Enhanced version that stores in translations subcollection
   *
   * @param messageId - The message ID to store translation under
   * @param text - The text to translate
   * @param targetLanguage - Target language code
   * @param userId - User ID requesting translation
   * @param sourceLanguage - Source language (or 'auto' for detection)
   * @returns Complete translation object with AI features
   */
  static async translateAndStore(
    messageId: string,
    text: string,
    targetLanguage: string,
    userId: string,
    sourceLanguage: string = 'auto'
  ): Promise<{
    translatedText: string
    detectedSourceLanguage: string
    culturalContext?: CulturalContext
    formality?: Formality
    idioms?: IdiomExplanation[]
  }> {
    try {
      // Check if translation already exists in Firestore
      const existingTranslation =
        await TranslationStorageService.getTranslation(messageId, targetLanguage)

      if (existingTranslation) {
        console.log(
          `✅ [TranslateService] Found cached translation for message ${messageId} in ${targetLanguage}`
        )

        // 🔍 LOG: What did we get from cache?
        console.log('📖 [TranslateService.translateAndStore] Cached translation:', {
          messageId,
          translatedTextType: typeof existingTranslation.translatedText,
          translatedTextValue: existingTranslation.translatedText,
          translatedTextKeys: typeof existingTranslation.translatedText === 'object'
            ? Object.keys(existingTranslation.translatedText)
            : 'N/A'
        })

        // 🚨 RUNTIME VALIDATION: Ensure cached data is valid
        if (typeof existingTranslation.translatedText !== 'string') {
          console.error('🚨 [TranslateService] INVALID CACHED DATA!', {
            messageId,
            type: typeof existingTranslation.translatedText,
            value: existingTranslation.translatedText,
            problem: 'Cached translatedText should be a string but is an object'
          })
          // Don't return bad data - this will fall through to re-translate
          // (setting existingTranslation to null would work, but falling through is cleaner)
        } else {
          // ✅ Valid cached data
          console.log('✅ [TranslateService] Returning valid cached translation')

          // Add current user to list of requesters
          await TranslationStorageService.addTranslationRequester(
            messageId,
            targetLanguage,
            userId
          )

          return {
            translatedText: existingTranslation.translatedText,
            detectedSourceLanguage: existingTranslation.detectedSourceLanguage,
            culturalContext: existingTranslation.culturalContext,
            formality: existingTranslation.formality,
            idioms: existingTranslation.idioms
          }
        }
      }

      // Call N8N webhook for translation with AI features (pass userId for rate limiting)
      const translationResult = await this.translateMessage(text, targetLanguage, userId)

      // 🔍 LOG: What did N8N return?
      console.log('📡 [TranslateService] N8N Response:', {
        hasTranslatedText: !!translationResult.translatedText,
        translatedTextType: typeof translationResult.translatedText,
        hasContent: !!translationResult.translatedText?.content,
        contentKeys: translationResult.translatedText?.content ? Object.keys(translationResult.translatedText.content) : 'N/A',
        hasTranslatedTextString: !!translationResult.translatedText?.content?.translated_text,
        fullResponse: JSON.stringify(translationResult, null, 2)
      })

      // Handle nested structure from N8N (message.content.* or translatedText.content.*) or flat structure
      let translatedTextString: string
      let detectedSourceLang: string
      let culturalContext: CulturalContext | undefined
      let formality: Formality | undefined
      let idioms: IdiomExplanation[] | undefined

      // Check NEW N8N format: message.content.* (current live N8N response)
      if (translationResult.message?.content) {
        const content = translationResult.message.content

        // Extract from content object (where the actual translation data is)
        translatedTextString = content.translated_text
        detectedSourceLang = content.source_lang_detected || sourceLanguage
        culturalContext = this.transformCulturalContext(content.cultural_context)
        formality = content.formality || undefined
        idioms = content.idioms || undefined

        console.log('✅ [TranslateService] Parsed NEW N8N format (message.content.*)')
      }
      // Check OLD format: translatedText.content.* (old Firestore data or different N8N version)
      else if (translationResult.translatedText?.content) {
        const content = translationResult.translatedText.content

        // Extract from content object (where the actual translation data is)
        translatedTextString = content.translated_text
        detectedSourceLang = content.source_lang_detected || sourceLanguage
        culturalContext = this.transformCulturalContext(content.cultural_context)
        formality = content.formality || undefined
        idioms = content.idioms || undefined

        console.log('✅ [TranslateService] Parsed OLD format (translatedText.content.*)')
      } else if (typeof translationResult.translatedText === 'string') {
        // Direct string value (simplest case)
        translatedTextString = translationResult.translatedText
        detectedSourceLang = translationResult.source_lang_detected || translationResult.sourceLangDetected || sourceLanguage
        culturalContext = this.transformCulturalContext(translationResult.cultural_context)
        formality = translationResult.formality || undefined
        idioms = translationResult.idioms || undefined

        console.log('✅ [TranslateService] Parsed direct string response')
      } else {
        // Fallback to flat structure for backwards compatibility
        translatedTextString =
          translationResult.translated_text ||
          translationResult.message ||
          'Translation unavailable'

        detectedSourceLang =
          translationResult.source_lang_detected ||
          translationResult.sourceLangDetected ||
          sourceLanguage

        culturalContext = this.transformCulturalContext(translationResult.cultural_context)
        formality = translationResult.formality || undefined
        idioms = translationResult.idioms || undefined

        console.log('✅ [TranslateService] Parsed flat response structure')
      }

      // Debug log for cultural context
      console.log('[TranslateService] Extracted metadata:', {
        hasCulturalContext: !!culturalContext,
        culturalContextDetails: culturalContext,
        hasFormality: !!formality,
        formalityDetails: formality,
        hasIdioms: !!idioms,
        idiomsCount: idioms?.length || 0
      })

      // CRITICAL: Verify we extracted a string, not an object
      if (typeof translatedTextString !== 'string') {
        console.error('❌ [TranslateService] translatedTextString is not a string!', {
          type: typeof translatedTextString,
          value: translatedTextString,
          originalResponse: translationResult
        })
        throw new Error(
          `Translation parsing error: Expected string but got ${typeof translatedTextString}. ` +
          `This would cause "Objects are not valid as a React child" error.`
        )
      }

      // Store in Firestore
      await TranslationStorageService.saveTranslation(
        messageId,
        targetLanguage,
        translatedTextString,
        detectedSourceLang,
        userId,
        culturalContext,
        formality,
        idioms
      )

      return {
        translatedText: translatedTextString,
        detectedSourceLanguage: detectedSourceLang,
        culturalContext,
        formality,
        idioms
      }
    } catch (error) {
      console.error('[TranslateService] Error in translateAndStore:', error)
      throw error
    }
  }

  /**
   * Translate an outgoing message and get all formality alternatives
   * Used when user wants to translate before sending
   *
   * @param message - The message text to translate
   * @param sourceLanguage - Source language code (e.g., 'en')
   * @param targetLanguage - Target language code (e.g., 'es')
   * @param userId - Optional user ID for rate limiting (if not provided, rate limiting is skipped)
   * @returns Promise with all three formality alternatives
   */
  static async translateOutgoingMessage(
    message: string,
    sourceLanguage: string,
    targetLanguage: string,
    userId?: string
  ): Promise<{
    formalityAlternatives: FormalityAlternatives
    detectedSourceLanguage: string
  }> {
    try {
      // Validate input parameters
      if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string')
      }

      if (!sourceLanguage || typeof sourceLanguage !== 'string') {
        throw new Error('Source language must be a non-empty string')
      }

      if (!targetLanguage || typeof targetLanguage !== 'string') {
        throw new Error('Target language must be a non-empty string')
      }

      // Check rate limit if userId is provided
      if (userId) {
        const rateLimitResult = await RateLimitService.checkRateLimit(userId, 'translation')
        if (!rateLimitResult.allowed) {
          throw new Error(rateLimitResult.message || 'Translation rate limit exceeded')
        }
        console.log(`[TranslateService] Outgoing translation rate limit check passed. ${rateLimitResult.remainingTokens} remaining`)
      }

      // Create cache key for outgoing translation
      const cacheKey = `outgoing_${message.trim()}|${sourceLanguage}|${targetLanguage}`
      const now = Date.now()

      // Check if we have a cached result that's still valid
      const cached = this.cache.get(cacheKey)
      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        console.log('✅ [TranslateService] Using cached outgoing translation')
        return cached.result
      }

      // Clean up expired cache entries
      this.cleanupExpiredCache(now)

      // Call N8N webhook for translation - it should return all formality alternatives
      // Note: We already checked rate limit above, so pass undefined to avoid double-checking
      console.log('📡 [TranslateService] Requesting outgoing translation with all formality levels')
      const translationResult = await this.translateMessage(message, targetLanguage, undefined)

      // Parse the response to extract formality alternatives
      let formalityAlternatives: FormalityAlternatives
      let detectedSourceLang: string

      // Check for nested structure from N8N
      if (translationResult.message?.content) {
        const content = translationResult.message.content
        formalityAlternatives = content.formality?.alternatives || {
          casual: content.translated_text || message,
          neutral: content.translated_text || message,
          formal: content.translated_text || message
        }
        detectedSourceLang = content.source_lang_detected || sourceLanguage
      } else if (translationResult.translatedText?.content) {
        const content = translationResult.translatedText.content
        formalityAlternatives = content.formality?.alternatives || {
          casual: content.translated_text || message,
          neutral: content.translated_text || message,
          formal: content.translated_text || message
        }
        detectedSourceLang = content.source_lang_detected || sourceLanguage
      } else {
        // Flat structure or backwards compatibility
        formalityAlternatives = translationResult.formality?.alternatives || {
          casual: translationResult.translated_text || translationResult.translatedText || message,
          neutral: translationResult.translated_text || translationResult.translatedText || message,
          formal: translationResult.translated_text || translationResult.translatedText || message
        }
        detectedSourceLang = translationResult.source_lang_detected || sourceLanguage
      }

      const result = {
        formalityAlternatives,
        detectedSourceLanguage: detectedSourceLang
      }

      // Cache the result
      this.cache.set(cacheKey, {
        result,
        timestamp: now
      })

      console.log('✅ [TranslateService] Outgoing translation successful')
      return result
    } catch (error) {
      console.error('[TranslateService] Error in translateOutgoingMessage:', error)
      throw error
    }
  }

  /**
   * Clears the translation cache
   * Useful for testing or when you want to force fresh translations
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Gets the current cache size
   * Useful for monitoring cache usage
   */
  static getCacheSize(): number {
    return this.cache.size
  }

  /**
   * Gets the current translation endpoint
   * Useful for debugging and configuration verification
   */
  static getEndpoint(): string {
    return this.TRANSLATION_ENDPOINT
  }
}

// Example usage (commented out):
/*
// Basic translation (with automatic caching)
try {
  const result = await TranslateService.translateMessage('Hello world', 'es');
  console.log('Translated:', result);
} catch (error) {
  console.error('Translation error:', error.message);
}

// Translation with error handling
const translateText = async (text: string, language: string) => {
  try {
    const translation = await TranslateService.translateMessage(text, language);
    return translation;
  } catch (error) {
    console.error('Failed to translate message:', error);
    return null; // or handle gracefully
  }
};

// Usage in a React component
const handleTranslate = async () => {
  try {
    const translated = await TranslateService.translateMessage(
      'How are you?', 
      'fr'
    );
    setTranslatedText(translated.translatedText || translated.message);
  } catch (error) {
    setError(error.message);
  }
};

// Cache management examples
console.log('Cache size:', TranslateService.getCacheSize()); // Check cache size
TranslateService.clearCache(); // Clear cache if needed

// Environment variable configuration
console.log('Translation endpoint:', TranslateService.getEndpoint()); // Check current endpoint

// Multiple rapid calls (only first one hits the API, others use cache)
const promises = [
  TranslateService.translateMessage('Hello', 'es'),
  TranslateService.translateMessage('Hello', 'es'), // Uses cache
  TranslateService.translateMessage('Hello', 'es')  // Uses cache
];
const results = await Promise.all(promises); // All return same cached result

// Environment variable setup (REQUIRED - in .env file):
// EXPO_PUBLIC_TRANSLATION_ENDPOINT=https://your-translation-api.com/translate
// Note: This variable is required - the service will throw an error if not set
*/
