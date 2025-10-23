import React, { useEffect, useState } from 'react'
import {
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native'
import { Translation, SUPPORTED_LANGUAGES } from '@/types/messaging'
import { TranslationStorageService } from '@/services/translationStorageService'
import { t, Locale } from '@/locales/translations'

interface Props {
  messageId: string
  targetLanguage: string
  isOwnMessage: boolean
  onTranslationLoaded?: (translation: Translation | null) => void
  onBadgeTap?: (messageId: string) => void
  userLocale?: Locale
}

export function TranslationDisplay({
  messageId,
  messageText,
  targetLanguage,
  isOwnMessage,
  onTranslationLoaded,
  onBadgeTap,
  userLocale = 'en'
}: Props) {
  const [translation, setTranslation] = useState<Translation | null>(null)

  // Fetch translation from Firestore
  useEffect(() => {
    const fetchTranslation = async () => {
      try {
        const trans = await TranslationStorageService.getTranslation(
          messageId,
          targetLanguage
        )

        setTranslation(trans)
        if (trans) {
          onTranslationLoaded?.(trans)
        }
      } catch (err) {
        console.error('Error fetching translation:', err)
      }
    }

    if (!isOwnMessage && targetLanguage) {
      fetchTranslation()
    }
  }, [messageId, targetLanguage, isOwnMessage])

  if (isOwnMessage || !targetLanguage || !translation) {
    return null
  }

  // Get source language name from detected language code
  const sourceLanguageCode = translation.detectedSourceLanguage as keyof typeof SUPPORTED_LANGUAGES
  const sourceLanguageName = SUPPORTED_LANGUAGES[sourceLanguageCode] || translation.detectedSourceLanguage

  return (
    <TouchableOpacity
      style={styles.translationBadge}
      onPress={() => onBadgeTap?.(messageId)}
      activeOpacity={0.7}
    >
      <Text style={styles.translationBadgeText}>
        {t(userLocale, 'chat.translationInfo', { lang: sourceLanguageName })}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6
  },
  translationBadge: {
    backgroundColor: '#00A884',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  translationBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500'
  }
})
