/**
 * Translation Service
 *
 * Provides translation functionality by sending requests to the translation webhook endpoint.
 * Requires EXPO_PUBLIC_TRANSLATION_ENDPOINT environment variable to be set.
 * Handles network errors, JSON parsing, and provides descriptive error messages.
 */

export class TranslateService {
  private static readonly TRANSLATION_ENDPOINT = (() => {
    const endpoint = process.env.EXPO_PUBLIC_TRANSLATION_ENDPOINT
    if (!endpoint) {
      throw new Error(
        'EXPO_PUBLIC_TRANSLATION_ENDPOINT environment variable is required but not set. ' +
          'Please set this variable in your .env file or environment configuration.'
      )
    }
    return endpoint
  })()

  // In-memory cache to avoid duplicate requests
  private static cache = new Map<string, { result: any; timestamp: number }>()
  private static readonly CACHE_TTL = 5000 // 5 seconds cache TTL

  /**
   * Translates a message to the target language
   *
   * @param message - The message text to translate
   * @param targetLang - The target language code (e.g., 'es', 'fr', 'de')
   * @returns Promise<any> - The translated message response from the API
   * @throws Error - If network request fails, response is not ok, or JSON parsing fails
   */
  static async translateMessage(
    message: string,
    targetLang: string
  ): Promise<any> {
    try {
      // Validate input parameters
      if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string')
      }

      if (!targetLang || typeof targetLang !== 'string') {
        throw new Error('Target language must be a non-empty string')
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
        message: message.trim(),
        targetLang: targetLang.trim()
      }

      // Make the HTTP request
      const response = await fetch(this.TRANSLATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Translation request failed with status ${response.status}: ${errorText}`
        )
      }

      // Parse JSON response
      try {
        const translatedData = await response.json()

        // Cache the successful result
        this.cache.set(cacheKey, {
          result: translatedData,
          timestamp: now
        })

        return translatedData
      } catch (jsonError) {
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
