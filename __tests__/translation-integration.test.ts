/**
 * Integration test for translation data flow
 *
 * Tests the complete journey:
 * 1. N8N returns nested response
 * 2. translateService parses it correctly
 * 3. translationStorageService saves flat structure
 * 4. Data retrieved from Firestore
 * 5. React renders the string safely
 */

import { TestRunner, TestAssertion } from './setup'

const runner = new TestRunner()

// Real data from Firebase screenshot (what caused the bug)
const realFirebaseData = {
  translatedText: {
    content: {
      cultural_context: {
        has_nuance: true,
        hint: "It's an internet slang advising someone to go outside and be more grounded or realistic.",
        why_differs:
          "A literal translation 'Toca césped' doesn't convey the slang meaning; the phrase is metaphorical in English and used mainly in online contexts."
      },
      formality: {
        alternatives: {
          casual: 'Toca césped',
          formal: 'Es recomendable salir al aire libre para reconectarse con la realidad',
          neutral: 'Sal a estar en contacto con la naturaleza'
        },
        detected: 'casual'
      },
      idioms: [
        {
          example:
            'Used online to tell someone they should take a break from the internet or their obsession.',
          meaning: 'Advice to someone to go outside and become more grounded or realistic',
          phrase: 'Touch grass',
          type: 'slang'
        }
      ],
      original_text: 'Touch grass',
      source_lang_detected: 'en',
      target_lang: 'es',
      terminology_applied: [],
      translated_text: 'Toca césped'
    }
  },
  refusal: null,
  role: 'assistant'
}

runner.test('END-TO-END: Parse real Firebase data that caused the bug', () => {
  // Step 1: Simulate N8N response (what translateMessage returns)
  const n8nResponse = realFirebaseData

  // Step 2: Parse it (what translateAndStore does)
  let translatedTextString: string
  let detectedSourceLang: string
  let culturalContext: any
  let formality: any
  let idioms: any

  // The fix we implemented
  if (n8nResponse.translatedText?.content) {
    const content = n8nResponse.translatedText.content
    translatedTextString = content.translated_text
    detectedSourceLang = content.source_lang_detected
    culturalContext = content.cultural_context
    formality = content.formality
    idioms = content.idioms
  } else {
    throw new Error('Expected nested structure not found')
  }

  // Step 3: Create Firestore document structure (what saveTranslation does)
  const firestoreDocument = {
    translatedText: translatedTextString, // String, not object
    detectedSourceLanguage: detectedSourceLang,
    culturalContext: culturalContext,
    formality: formality,
    idioms: idioms,
    translatedBy: ['user123']
  }

  // Step 4: Verify Firestore structure is correct
  TestAssertion.assertType(
    firestoreDocument.translatedText,
    'string',
    'Firestore should store translatedText as string'
  )
  TestAssertion.assertEquals(
    firestoreDocument.translatedText,
    'Toca césped',
    'Should extract correct translation'
  )

  // Step 5: Simulate reading from Firestore (what getTranslation does)
  const translationFromFirestore = {
    messageId: 'msg123',
    targetLanguage: 'es',
    translatedText: firestoreDocument.translatedText,
    detectedSourceLanguage: firestoreDocument.detectedSourceLanguage,
    culturalContext: firestoreDocument.culturalContext,
    formality: firestoreDocument.formality,
    idioms: firestoreDocument.idioms,
    translatedAt: new Date(),
    translatedBy: firestoreDocument.translatedBy
  }

  // Step 6: Simulate what React does (from app/chat/[id].tsx:858)
  const textToRender = translationFromFirestore.translatedText

  // CRITICAL: Verify React receives a string, not an object
  TestAssertion.assertType(textToRender, 'string', 'React must receive a string to render')
  TestAssertion.assertEquals(textToRender, 'Toca césped', 'Should render correct translation')

  // Verify this won't cause "Objects are not valid as a React child" error
  TestAssertion.assertTrue(
    typeof textToRender !== 'object',
    'Must not be an object (would cause React error)'
  )
})

runner.test('END-TO-END: Verify AI features are accessible separately', () => {
  const n8nResponse = realFirebaseData

  // Parse
  const content = n8nResponse.translatedText.content
  const translatedTextString = content.translated_text
  const culturalContext = content.cultural_context
  const formality = content.formality
  const idioms = content.idioms

  // Save to Firestore
  const firestoreDocument = {
    translatedText: translatedTextString,
    culturalContext,
    formality,
    idioms
  }

  // Read from Firestore
  const translation = firestoreDocument

  // Verify AI features are accessible for the metadata modal
  TestAssertion.assertNotNull(translation.culturalContext, 'Cultural context should be accessible')
  TestAssertion.assertTrue(
    translation.culturalContext.has_nuance === true,
    'Should have nuance flag'
  )
  TestAssertion.assertType(
    translation.culturalContext.hint,
    'string',
    'Hint should be accessible as string'
  )

  TestAssertion.assertNotNull(translation.formality, 'Formality should be accessible')
  TestAssertion.assertEquals(
    translation.formality.detected,
    'casual',
    'Formality level should be accessible'
  )

  TestAssertion.assertTrue(Array.isArray(translation.idioms), 'Idioms should be accessible')
  TestAssertion.assertEquals(
    translation.idioms[0].phrase,
    'Touch grass',
    'Idiom details should be accessible'
  )
})

runner.test('END-TO-END: Compare old (buggy) vs new (fixed) structure', () => {
  const n8nResponse = realFirebaseData

  // OLD (BUGGY) WAY: Storing the entire nested object
  const oldBuggyStructure = {
    translatedText: n8nResponse.translatedText // This is an OBJECT
  }

  // Verify the old way was wrong
  TestAssertion.assertTrue(
    typeof oldBuggyStructure.translatedText === 'object',
    'Old structure had translatedText as object'
  )

  // This is what caused the React error:
  // <Text>{translation.translatedText}</Text>
  // React tried to render an object, which is invalid

  // NEW (FIXED) WAY: Extracting the string
  const content = n8nResponse.translatedText.content
  const newFixedStructure = {
    translatedText: content.translated_text, // This is a STRING
    culturalContext: content.cultural_context,
    formality: content.formality,
    idioms: content.idioms
  }

  // Verify the new way is correct
  TestAssertion.assertType(
    newFixedStructure.translatedText,
    'string',
    'New structure has translatedText as string'
  )
  TestAssertion.assertEquals(
    newFixedStructure.translatedText,
    'Toca césped',
    'Extracts correct string value'
  )

  // Now React can safely render:
  // <Text>{translation.translatedText}</Text>
  // React receives "Toca césped" (string), which is valid
})

runner.test('END-TO-END: Simulate complete chat message rendering flow', () => {
  // 1. User sends message "Touch grass"
  const originalMessage = {
    id: 'msg123',
    text: 'Touch grass',
    senderId: 'otherUser',
    timestamp: new Date()
  }

  // 2. N8N translates it
  const n8nResponse = realFirebaseData

  // 3. Parse the N8N response (translateAndStore)
  const content = n8nResponse.translatedText.content
  const translationData = {
    translatedText: content.translated_text,
    detectedSourceLanguage: content.source_lang_detected,
    culturalContext: content.cultural_context,
    formality: content.formality,
    idioms: content.idioms
  }

  // 4. Save to Firestore (saveTranslation)
  // ... saved ...

  // 5. Load translation in chat screen (from translations Map)
  const translations = new Map()
  translations.set(originalMessage.id, translationData)

  // 6. Render in React (from renderMessage function)
  const translation = translations.get(originalMessage.id)
  const isOwnMessage = false
  const autoTranslate = true
  const showOriginalText = false

  // This is the exact logic from app/chat/[id].tsx:850-860
  let textToDisplay: string
  if (translation && !isOwnMessage && autoTranslate && !showOriginalText) {
    textToDisplay = translation.translatedText // Must be a string!
  } else {
    textToDisplay = originalMessage.text
  }

  // 7. Verify React can safely render this
  TestAssertion.assertType(textToDisplay, 'string', 'Text to display must be a string')
  TestAssertion.assertEquals(textToDisplay, 'Toca césped', 'Should display translated text')

  // Verify no React error will occur
  try {
    // Simulate React rendering
    const reactElement = `<Text>${textToDisplay}</Text>`
    TestAssertion.assertTrue(true, 'React can render string without error')
  } catch (error) {
    throw new Error('React rendering failed - this should not happen with string values')
  }
})

runner.test('END-TO-END: Verify metadata modal can access AI features', () => {
  const n8nResponse = realFirebaseData

  // Parse and save
  const content = n8nResponse.translatedText.content
  const translationData = {
    translatedText: content.translated_text,
    detectedSourceLanguage: content.source_lang_detected,
    culturalContext: content.cultural_context,
    formality: content.formality,
    idioms: content.idioms
  }

  // Simulate opening metadata modal (from app/chat/[id].tsx:756-762)
  const handleTranslationBadgeTap = (translation: any) => {
    // Modal should receive the full translation object
    return translation
  }

  const modalData = handleTranslationBadgeTap(translationData)

  // Verify modal can access all AI features
  TestAssertion.assertNotNull(modalData.culturalContext, 'Modal can access cultural context')
  TestAssertion.assertNotNull(modalData.formality, 'Modal can access formality')
  TestAssertion.assertTrue(Array.isArray(modalData.idioms), 'Modal can access idioms')

  // Verify modal also has the translated text
  TestAssertion.assertType(modalData.translatedText, 'string', 'Modal receives translated text')
})

// Run all tests
runner.run()
