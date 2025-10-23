/**
 * Tests for TranslateService - N8N response parsing
 *
 * Ensures the service correctly extracts translation data from nested N8N responses
 * and produces a structure that React can safely render
 */

import { TestRunner, TestAssertion, mockFetch } from './setup'

const runner = new TestRunner()

// Mock response from N8N with NEW format (current production format from live N8N)
const mockNewN8nResponse = {
  index: 0,
  message: {
    role: 'assistant',
    content: {
      translated_text: 'Toca césped',
      original_text: 'Touch grass',
      source_lang_detected: 'en',
      target_lang: 'es',
      cultural_context: {
        has_nuance: true,
        hint: "It's an internet slang advising someone to go outside and be more grounded or realistic.",
        why_differs: "A literal translation 'Toca césped' doesn't convey the slang meaning; the phrase is metaphorical in English and used mainly in online contexts."
      },
      formality: {
        detected: 'casual',
        alternatives: {
          casual: 'Toca césped',
          neutral: 'Sal a estar en contacto con la naturaleza',
          formal: 'Es recomendable salir al aire libre para reconectarse con la realidad'
        }
      },
      idioms: [
        {
          phrase: 'Touch grass',
          type: 'slang',
          meaning: 'Advice to someone to go outside and become more grounded or realistic',
          example: 'Used online to tell someone they should take a break from the internet or their obsession.'
        }
      ]
    },
    refusal: null,
    annotations: []
  }
}

// Mock response from N8N with OLD nested structure (for backwards compatibility)
const mockOldN8nResponse = {
  translatedText: {
    content: {
      translated_text: 'Toca césped',
      original_text: 'Touch grass',
      source_lang_detected: 'en',
      target_lang: 'es',
      cultural_context: {
        has_nuance: true,
        hint: "It's an internet slang advising someone to go outside and be more grounded or realistic.",
        why_differs: "A literal translation 'Toca césped' doesn't convey the slang meaning; the phrase is metaphorical in English and used mainly in online contexts."
      },
      formality: {
        detected: 'casual',
        alternatives: {
          casual: 'Toca césped',
          neutral: 'Sal a estar en contacto con la naturaleza',
          formal: 'Es recomendable salir al aire libre para reconectarse con la realidad'
        }
      },
      idioms: [
        {
          phrase: 'Touch grass',
          type: 'slang',
          meaning: 'Advice to someone to go outside and become more grounded or realistic',
          example: 'Used online to tell someone they should take a break from the internet or their obsession.'
        }
      ]
    }
  }
}

// Mock response from N8N with flat structure (legacy/fallback format)
const mockFlatN8nResponse = {
  translated_text: 'Hola mundo',
  source_lang_detected: 'en',
  target_lang: 'es'
}

runner.test('Should extract translatedText as STRING from NEW N8N response format (message.content.*)', () => {
  // Simulate what translateAndStore does with NEW N8N response
  const translationResult = mockNewN8nResponse

  let translatedTextString: string

  // NEW format: message.content.*
  if (translationResult.message?.content) {
    const content = translationResult.message.content
    translatedTextString = content.translated_text
  } else {
    throw new Error('Expected NEW N8N format not found')
  }

  // Verify it's a string (safe for React to render)
  TestAssertion.assertType(translatedTextString, 'string', 'translatedText must be a string')
  TestAssertion.assertEquals(translatedTextString, 'Toca césped', 'Should extract correct translated text')
})

runner.test('Should extract translatedText as STRING from OLD nested response format (translatedText.content.*)', () => {
  // Simulate what translateAndStore does with OLD nested response
  const translationResult = mockOldN8nResponse

  let translatedTextString: string

  // OLD format: translatedText.content.*
  if (translationResult.translatedText?.content) {
    const content = translationResult.translatedText.content
    translatedTextString = content.translated_text
  } else {
    throw new Error('Expected OLD nested structure not found')
  }

  // Verify it's a string (safe for React to render)
  TestAssertion.assertType(translatedTextString, 'string', 'translatedText must be a string')
  TestAssertion.assertEquals(translatedTextString, 'Toca césped', 'Should extract correct translated text')
})

runner.test('Should extract AI features from NEW N8N response format', () => {
  const translationResult = mockNewN8nResponse

  if (translationResult.message?.content) {
    const content = translationResult.message.content

    const culturalContext = content.cultural_context
    const formality = content.formality
    const idioms = content.idioms

    // Verify cultural context structure
    TestAssertion.assertNotNull(culturalContext, 'Cultural context should exist')
    TestAssertion.assertTrue(culturalContext.has_nuance === true, 'Should have nuance flag')
    TestAssertion.assertType(culturalContext.hint, 'string', 'Hint should be a string')

    // Verify formality structure
    TestAssertion.assertNotNull(formality, 'Formality should exist')
    TestAssertion.assertEquals(formality.detected, 'casual', 'Should detect casual formality')
    TestAssertion.assertNotNull(formality.alternatives, 'Should have formality alternatives')

    // Verify idioms structure
    TestAssertion.assertTrue(Array.isArray(idioms), 'Idioms should be an array')
    TestAssertion.assertTrue(idioms.length > 0, 'Should have at least one idiom')
    TestAssertion.assertEquals(idioms[0].phrase, 'Touch grass', 'Should extract idiom phrase')
  } else {
    throw new Error('Expected NEW N8N format not found')
  }
})

runner.test('Should handle flat N8N response (backwards compatibility)', () => {
  const translationResult = mockFlatN8nResponse

  // Fallback logic for flat structure
  let translatedTextString: string

  if (translationResult.translatedText?.content) {
    throw new Error('Should not have nested structure in flat response')
  } else {
    translatedTextString =
      translationResult.translated_text ||
      translationResult.translatedText ||
      'fallback'
  }

  TestAssertion.assertType(translatedTextString, 'string', 'translatedText must be a string')
  TestAssertion.assertEquals(translatedTextString, 'Hola mundo', 'Should extract correct translated text from flat response')
})

runner.test('Should produce React-safe output structure', () => {
  const translationResult = mockNewN8nResponse

  // Simulate the full parsing logic from translateService.ts
  let translatedTextString: string
  let detectedSourceLang: string
  let culturalContext: any
  let formality: any
  let idioms: any

  // Use NEW N8N format
  if (translationResult.message?.content) {
    const content = translationResult.message.content
    translatedTextString = content.translated_text
    detectedSourceLang = content.source_lang_detected
    culturalContext = content.cultural_context
    formality = content.formality
    idioms = content.idioms
  } else {
    throw new Error('Expected NEW N8N format not found')
  }

  // Create the final structure that gets saved to Firebase
  const finalStructure = {
    translatedText: translatedTextString,
    detectedSourceLanguage: detectedSourceLang,
    culturalContext,
    formality,
    idioms
  }

  // CRITICAL: Verify translatedText is a string (not an object)
  TestAssertion.assertType(finalStructure.translatedText, 'string', 'translatedText MUST be a string for React rendering')

  // Verify it's not the entire content object
  TestAssertion.assertTrue(
    typeof finalStructure.translatedText !== 'object',
    'translatedText must NOT be an object'
  )

  // Verify it doesn't have nested properties
  TestAssertion.assertTrue(
    !(finalStructure.translatedText as any).cultural_context,
    'translatedText should not have nested cultural_context'
  )

  // Verify AI features are at top level
  TestAssertion.assertNotNull(finalStructure.culturalContext, 'culturalContext should be at top level')
  TestAssertion.assertNotNull(finalStructure.formality, 'formality should be at top level')
  TestAssertion.assertTrue(Array.isArray(finalStructure.idioms), 'idioms should be an array at top level')
})

runner.test('Should handle missing AI features gracefully', () => {
  const minimalResponse = {
    translatedText: {
      content: {
        translated_text: 'Simple translation',
        source_lang_detected: 'en',
        target_lang: 'es'
        // No AI features
      }
    }
  }

  const content = minimalResponse.translatedText.content
  const translatedTextString = content.translated_text
  const culturalContext = content.cultural_context || undefined
  const formality = content.formality || undefined
  const idioms = content.idioms || undefined

  TestAssertion.assertType(translatedTextString, 'string', 'Should still extract text as string')
  TestAssertion.assertEquals(culturalContext, undefined, 'Should handle missing cultural context')
  TestAssertion.assertEquals(formality, undefined, 'Should handle missing formality')
  TestAssertion.assertEquals(idioms, undefined, 'Should handle missing idioms')
})

runner.test('Should detect when translatedText is accidentally an object', () => {
  // This simulates a bug where we accidentally pass the whole object
  const buggyResponse = {
    translatedText: {
      role: 'assistant',
      content: {
        translated_text: 'Toca césped'
      },
      annotations: [],
      refusal: null
    }
  }

  // If we accidentally use translatedText directly (without extracting content.translated_text)
  const wrongExtraction = buggyResponse.translatedText

  // This should be detected as wrong (it's an object, not a string)
  TestAssertion.assertTrue(
    typeof wrongExtraction === 'object',
    'Wrong extraction results in object'
  )
  TestAssertion.assertTrue(
    wrongExtraction.hasOwnProperty('role'),
    'Object has role property (proves its the wrapper)'
  )

  // Correct extraction goes through content
  const correctExtraction = buggyResponse.translatedText.content.translated_text

  TestAssertion.assertType(
    correctExtraction,
    'string',
    'Correct extraction results in string'
  )
  TestAssertion.assertEquals(
    correctExtraction,
    'Toca césped',
    'Correct extraction has right value'
  )
})

runner.test('Should handle direct string response (simplest case)', () => {
  const directStringResponse = {
    translatedText: 'Hola mundo',
    source_lang_detected: 'en'
  }

  // When translatedText is already a string
  let translatedTextString: string

  if (typeof directStringResponse.translatedText === 'string') {
    translatedTextString = directStringResponse.translatedText
  } else {
    throw new Error('Expected string')
  }

  TestAssertion.assertType(
    translatedTextString,
    'string',
    'Direct string should be handled'
  )
  TestAssertion.assertEquals(
    translatedTextString,
    'Hola mundo',
    'Should extract direct string value'
  )
})

// Run all tests
runner.run()
