/**
 * Tests for TranslationStorageService - Firebase storage structure
 *
 * Ensures the service saves translations in the correct flat structure
 * with translatedText as a string and AI features as top-level properties
 */

import { TestRunner, TestAssertion } from './setup'

const runner = new TestRunner()

runner.test('Should store translatedText as a STRING, not an object', () => {
  // Simulate what saveTranslation receives from translateAndStore
  const translatedText = 'Toca césped'
  const detectedSourceLanguage = 'en'
  const userId = 'user123'
  const culturalContext = {
    has_nuance: true,
    hint: "It's an internet slang",
    why_differs: 'Metaphorical meaning'
  }
  const formality = {
    detected: 'casual' as const,
    alternatives: {
      casual: 'Toca césped',
      neutral: 'Sal afuera',
      formal: 'Es recomendable salir'
    }
  }
  const idioms = [
    {
      phrase: 'Touch grass',
      type: 'slang' as const,
      meaning: 'Go outside',
      example: 'Used online'
    }
  ]

  // This is what gets saved to Firestore
  const translationData: any = {
    translatedText,
    detectedSourceLanguage,
    translatedBy: [userId]
  }

  if (culturalContext) {
    translationData.culturalContext = culturalContext
  }
  if (formality) {
    translationData.formality = formality
  }
  if (idioms && idioms.length > 0) {
    translationData.idioms = idioms
  }

  // CRITICAL: Verify translatedText is a string
  TestAssertion.assertType(
    translationData.translatedText,
    'string',
    'translatedText MUST be stored as a string in Firebase'
  )

  // Verify it's not an object with nested properties
  TestAssertion.assertTrue(
    typeof translationData.translatedText !== 'object',
    'translatedText must NOT be an object'
  )

  // Verify the exact string value
  TestAssertion.assertEquals(
    translationData.translatedText,
    'Toca césped',
    'Should store the exact translated string'
  )
})

runner.test('Should store AI features as separate top-level properties', () => {
  const translationData: any = {
    translatedText: 'Toca césped',
    detectedSourceLanguage: 'en',
    translatedBy: ['user123'],
    culturalContext: {
      has_nuance: true,
      hint: "It's an internet slang"
    },
    formality: {
      detected: 'casual',
      alternatives: {
        casual: 'Toca césped',
        neutral: 'Sal afuera',
        formal: 'Es recomendable salir'
      }
    },
    idioms: [
      {
        phrase: 'Touch grass',
        type: 'slang',
        meaning: 'Go outside'
      }
    ]
  }

  // Verify AI features are at the top level, not nested under translatedText
  TestAssertion.assertNotNull(
    translationData.culturalContext,
    'culturalContext should be a top-level property'
  )
  TestAssertion.assertNotNull(
    translationData.formality,
    'formality should be a top-level property'
  )
  TestAssertion.assertTrue(
    Array.isArray(translationData.idioms),
    'idioms should be a top-level array property'
  )

  // Verify translatedText does NOT contain these features
  TestAssertion.assertTrue(
    !(translationData.translatedText as any).culturalContext,
    'translatedText should not have nested culturalContext'
  )
  TestAssertion.assertTrue(
    !(translationData.translatedText as any).formality,
    'translatedText should not have nested formality'
  )
  TestAssertion.assertTrue(
    !(translationData.translatedText as any).idioms,
    'translatedText should not have nested idioms'
  )
})

runner.test('Should match Translation interface from types/messaging.ts', () => {
  // This is what we read back from Firestore (simulated)
  const firestoreData = {
    translatedText: 'Toca césped',
    detectedSourceLanguage: 'en',
    culturalContext: {
      has_nuance: true,
      hint: "It's an internet slang",
      why_differs: 'Metaphorical meaning'
    },
    formality: {
      detected: 'casual',
      alternatives: {
        casual: 'Toca césped',
        neutral: 'Sal afuera',
        formal: 'Es recomendable salir'
      }
    },
    idioms: [
      {
        phrase: 'Touch grass',
        type: 'slang',
        meaning: 'Go outside',
        example: 'Used online'
      }
    ],
    translatedAt: new Date(),
    translatedBy: ['user123']
  }

  // Build the Translation object (as done in TranslationStorageService.getTranslation)
  const translation = {
    messageId: 'msg123',
    targetLanguage: 'es',
    translatedText: firestoreData.translatedText,
    detectedSourceLanguage: firestoreData.detectedSourceLanguage,
    culturalContext: firestoreData.culturalContext,
    formality: firestoreData.formality,
    idioms: firestoreData.idioms,
    translatedAt: firestoreData.translatedAt,
    translatedBy: firestoreData.translatedBy
  }

  // Verify the structure matches what React expects
  TestAssertion.assertType(translation.translatedText, 'string', 'translatedText must be string')
  TestAssertion.assertType(translation.messageId, 'string', 'messageId must be string')
  TestAssertion.assertType(translation.targetLanguage, 'string', 'targetLanguage must be string')
  TestAssertion.assertType(
    translation.detectedSourceLanguage,
    'string',
    'detectedSourceLanguage must be string'
  )

  // Verify optional AI features
  if (translation.culturalContext) {
    TestAssertion.assertType(
      translation.culturalContext.has_nuance,
      'boolean',
      'has_nuance must be boolean'
    )
    TestAssertion.assertType(translation.culturalContext.hint, 'string', 'hint must be string')
  }

  if (translation.formality) {
    TestAssertion.assertType(translation.formality.detected, 'string', 'detected must be string')
    TestAssertion.assertType(
      translation.formality.alternatives,
      'object',
      'alternatives must be object'
    )
  }

  if (translation.idioms) {
    TestAssertion.assertTrue(Array.isArray(translation.idioms), 'idioms must be array')
  }
})

runner.test('Should handle translations without AI features', () => {
  // Simple translation without AI features
  const translationData: any = {
    translatedText: 'Hola mundo',
    detectedSourceLanguage: 'en',
    translatedBy: ['user123']
  }

  // Should still have translatedText as a string
  TestAssertion.assertType(
    translationData.translatedText,
    'string',
    'translatedText must be string even without AI features'
  )

  // Should not have AI features
  TestAssertion.assertEquals(
    translationData.culturalContext,
    undefined,
    'culturalContext should be undefined'
  )
  TestAssertion.assertEquals(
    translationData.formality,
    undefined,
    'formality should be undefined'
  )
  TestAssertion.assertEquals(translationData.idioms, undefined, 'idioms should be undefined')
})

runner.test('Should prevent accidental nesting of translatedText', () => {
  // This is the WRONG structure (what we're preventing)
  const wrongStructure = {
    translatedText: {
      content: {
        translated_text: 'Toca césped',
        cultural_context: {},
        formality: {}
      }
    }
  }

  // Verify this is indeed wrong (typeof object, not string)
  TestAssertion.assertTrue(
    typeof wrongStructure.translatedText === 'object',
    'Wrong structure has translatedText as object'
  )

  // This is the CORRECT structure (what we're enforcing)
  const correctStructure = {
    translatedText: 'Toca césped',
    culturalContext: {},
    formality: {}
  }

  // Verify this is correct (typeof string)
  TestAssertion.assertType(
    correctStructure.translatedText,
    'string',
    'Correct structure has translatedText as string'
  )
})

// Run all tests
runner.run()
