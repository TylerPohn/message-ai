import { db } from '@/firebaseConfig'
import {
  COLLECTIONS,
  Translation,
  CulturalContext,
  Formality,
  IdiomExplanation
} from '@/types/messaging'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore'

export class TranslationStorageService {
  /**
   * Transform API's snake_case cultural context to camelCase interface
   * API/Firestore may return: has_nuance, why_differs
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
   * Get a translation for a specific message and target language
   * Returns null if translation doesn't exist
   */
  static async getTranslation(
    messageId: string,
    targetLanguage: string
  ): Promise<Translation | null> {
    try {
      const translationRef = doc(
        db,
        COLLECTIONS.MESSAGES,
        messageId,
        COLLECTIONS.TRANSLATIONS,
        targetLanguage
      )

      const translationSnap = await getDoc(translationRef)

      if (!translationSnap.exists()) {
        return null
      }

      const data = translationSnap.data()

      // 🔍 LOG: What did we read from Firestore?
      console.log('📖 [TranslationStorageService.getTranslation] Read from Firestore:', {
        messageId,
        targetLanguage,
        translatedTextType: typeof data.translatedText,
        translatedTextValue: data.translatedText,
        translatedTextKeys: typeof data.translatedText === 'object' ? Object.keys(data.translatedText) : 'N/A'
      })

      // 🚨 RUNTIME VALIDATION: Detect corrupted data from old format
      if (typeof data.translatedText !== 'string') {
        console.error('🚨 [TranslationStorageService] CORRUPTED DATA DETECTED in Firestore!', {
          messageId,
          targetLanguage,
          type: typeof data.translatedText,
          value: data.translatedText,
          problem: 'translatedText should be a string but is an object',
          possibleCause: 'Old data saved before fix was applied'
        })

        // Attempt to extract the string if it's the nested structure
        let extractedString: string | undefined
        if (data.translatedText?.content?.translated_text) {
          extractedString = data.translatedText.content.translated_text
          console.log('✅ [TranslationStorageService] Extracted string from nested structure:', extractedString)
        }

        if (extractedString) {
          // Return with extracted string
          return {
            messageId,
            targetLanguage,
            translatedText: extractedString,
            detectedSourceLanguage: data.detectedSourceLanguage || data.translatedText?.content?.source_lang_detected || 'unknown',
            culturalContext: this.transformCulturalContext(data.culturalContext || data.translatedText?.content?.cultural_context),
            formality: data.formality || data.translatedText?.content?.formality,
            idioms: data.idioms || data.translatedText?.content?.idioms,
            translatedAt: data.translatedAt?.toDate() || new Date(),
            translatedBy: data.translatedBy || []
          } as Translation
        } else {
          console.error('❌ [TranslationStorageService] Could not extract string - returning null')
          return null
        }
      }

      // ✅ Data is valid (translatedText is a string)
      console.log('✅ [TranslationStorageService.getTranslation] Valid translation data')

      return {
        messageId,
        targetLanguage,
        translatedText: data.translatedText,
        detectedSourceLanguage: data.detectedSourceLanguage,
        culturalContext: this.transformCulturalContext(data.culturalContext),
        formality: data.formality,
        idioms: data.idioms,
        translatedAt: data.translatedAt?.toDate() || new Date(),
        translatedBy: data.translatedBy || []
      } as Translation
    } catch (error) {
      console.error('Error fetching translation:', error)
      return null
    }
  }

  /**
   * Check if a translation exists without fetching full data (faster)
   */
  static async hasTranslation(
    messageId: string,
    targetLanguage: string
  ): Promise<boolean> {
    try {
      const translationRef = doc(
        db,
        COLLECTIONS.MESSAGES,
        messageId,
        COLLECTIONS.TRANSLATIONS,
        targetLanguage
      )

      const translationSnap = await getDoc(translationRef)
      return translationSnap.exists()
    } catch (error) {
      console.error('Error checking translation existence:', error)
      return false
    }
  }

  /**
   * Save a new translation or overwrite existing one
   */
  static async saveTranslation(
    messageId: string,
    targetLanguage: string,
    translatedText: string,
    detectedSourceLanguage: string,
    userId: string,
    culturalContext?: CulturalContext,
    formality?: Formality,
    idioms?: IdiomExplanation[]
  ): Promise<void> {
    try {
      const translationRef = doc(
        db,
        COLLECTIONS.MESSAGES,
        messageId,
        COLLECTIONS.TRANSLATIONS,
        targetLanguage
      )

      const translationData: any = {
        translatedText,
        detectedSourceLanguage,
        translatedAt: serverTimestamp(),
        translatedBy: [userId] // Start with first user
      }

      // Add optional AI features if provided
      if (culturalContext) {
        translationData.culturalContext = culturalContext
      }
      if (formality) {
        translationData.formality = formality
      }
      if (idioms && idioms.length > 0) {
        translationData.idioms = idioms
      }

      // Use setDoc to create/overwrite
      await setDoc(translationRef, translationData)

      console.log(
        `✅ Saved translation for message ${messageId} in language ${targetLanguage}`
      )
    } catch (error) {
      console.error('Error saving translation:', error)
      throw error
    }
  }

  /**
   * Add a user to the list of users who have requested this translation
   * (for analytics/tracking who needs what translations)
   */
  static async addTranslationRequester(
    messageId: string,
    targetLanguage: string,
    userId: string
  ): Promise<void> {
    try {
      const translationRef = doc(
        db,
        COLLECTIONS.MESSAGES,
        messageId,
        COLLECTIONS.TRANSLATIONS,
        targetLanguage
      )

      await updateDoc(translationRef, {
        translatedBy: arrayUnion(userId)
      })

      console.log(
        `✅ Added user ${userId} to translation requesters for message ${messageId}`
      )
    } catch (error) {
      console.error('Error adding translation requester:', error)
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get all translations for a specific message
   * Useful for bulk loading translations for a conversation
   */
  static async getMessageTranslations(messageId: string): Promise<Translation[]> {
    try {
      const translationsRef = collection(
        db,
        COLLECTIONS.MESSAGES,
        messageId,
        COLLECTIONS.TRANSLATIONS
      )

      const translationsSnap = await getDocs(translationsRef)

      return translationsSnap.docs.map((doc) => ({
        messageId,
        targetLanguage: doc.id,
        translatedText: doc.data().translatedText,
        detectedSourceLanguage: doc.data().detectedSourceLanguage,
        culturalContext: this.transformCulturalContext(doc.data().culturalContext),
        formality: doc.data().formality,
        idioms: doc.data().idioms,
        translatedAt: doc.data().translatedAt?.toDate() || new Date(),
        translatedBy: doc.data().translatedBy || []
      })) as Translation[]
    } catch (error) {
      console.error('Error fetching message translations:', error)
      return []
    }
  }

  /**
   * Update only AI feature fields for an existing translation
   * (doesn't overwrite the core translation)
   */
  static async updateTranslationFeatures(
    messageId: string,
    targetLanguage: string,
    features: {
      culturalContext?: CulturalContext
      formality?: Formality
      idioms?: IdiomExplanation[]
    }
  ): Promise<void> {
    try {
      const translationRef = doc(
        db,
        COLLECTIONS.MESSAGES,
        messageId,
        COLLECTIONS.TRANSLATIONS,
        targetLanguage
      )

      const updateData: any = {}

      if (features.culturalContext !== undefined) {
        updateData.culturalContext = features.culturalContext
      }
      if (features.formality !== undefined) {
        updateData.formality = features.formality
      }
      if (features.idioms !== undefined) {
        updateData.idioms = features.idioms
      }

      if (Object.keys(updateData).length > 0) {
        await updateDoc(translationRef, updateData)
        console.log(`✅ Updated translation features for message ${messageId}`)
      }
    } catch (error) {
      console.error('Error updating translation features:', error)
      throw error
    }
  }
}
