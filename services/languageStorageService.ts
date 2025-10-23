import AsyncStorage from '@react-native-async-storage/async-storage'
import { Locale } from '@/locales/translations'

const LANGUAGE_STORAGE_KEY = '@babel_preferred_language'

/**
 * Service for persisting user's preferred language across sessions
 * This allows the login/signup screens to display in the user's last selected language
 */
export class LanguageStorageService {
  /**
   * Save the user's preferred language to AsyncStorage
   */
  static async saveLanguage(locale: Locale): Promise<void> {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, locale)
    } catch (error) {
      console.error('Error saving language preference:', error)
    }
  }

  /**
   * Get the user's preferred language from AsyncStorage
   * Returns 'en' as default if no preference is stored
   */
  static async getLanguage(): Promise<Locale> {
    try {
      const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      return (language as Locale) || 'en'
    } catch (error) {
      console.error('Error retrieving language preference:', error)
      return 'en'
    }
  }

  /**
   * Clear the stored language preference
   */
  static async clearLanguage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing language preference:', error)
    }
  }
}
