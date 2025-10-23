# Multi-Language Translation Schema & AI Features Implementation

## Overview

This document describes the new Firestore schema for handling multi-language translations in group chats with integrated AI features (cultural context, formality detection, idiom explanations).

---

## Problem Solved

**Before:** Single translation per message
```
Message {
  text: "Hello world",
  translatedText: "Hola mundo",      ❌ Only ONE translation
  translatedTo: "es",                ❌ Can't support multiple languages
  detectedLanguage: "en"
}
```

**Issue:** In a group chat with 3 people needing translations in 3 different languages:
- User A (Spanish): "Hello world" → "Hola mundo" ✓
- User B (French): "Hello world" → "Bonjour le monde" ✗ Lost!
- User C (German): "Hello world" → "Guten Tag Welt" ✗ Lost!

---

## New Solution: Translations Subcollection

```
messages/{messageId}/
  ├─ text: "Hello world"
  ├─ senderId: "user123"
  ├─ timestamp: Date
  ├─ detectedLanguage: "en"        ← Detected ONCE, shared across all users
  ├─ conversationId: "conv123"
  └─ translations/{targetLanguage}/  ← NEW SUBCOLLECTION
      ├─ es/
      │   ├─ translatedText: "Hola mundo"
      │   ├─ detectedSourceLanguage: "en"
      │   ├─ confidence: 0.95
      │   ├─ culturalContext: {
      │   │   hasNuance: true,
      │   │   hint: "Spanish uses 'Hola' informally",
      │   │   whyDiffers: "..."
      │   │ }
      │   ├─ formality: {
      │   │   detected: "casual",
      │   │   confidence: 0.9,
      │   │   alternatives: {
      │   │     casual: "Hola mundo",
      │   │     neutral: "Buenos días mundo",
      │   │     formal: "Estimado mundo"
      │   │   }
      │   │ }
      │   ├─ idioms: [
      │   │   {
      │   │     phrase: "hello world",
      │   │     type: "phrase",
      │   │     meaning: "greeting to the world",
      │   │     example: "Often used in programming tutorials"
      │   │   }
      │   │ ]
      │   ├─ translatedAt: Date
      │   └─ translatedBy: ["userId1", "userId2"]  ← Who requested it
      │
      ├─ fr/
      │   ├─ translatedText: "Bonjour le monde"
      │   └─ ... (same structure)
      │
      └─ de/
          ├─ translatedText: "Guten Tag Welt"
          └─ ... (same structure)
```

---

## TypeScript Interfaces

### New Types Added

```typescript
// AI Feature Types
interface CulturalContext {
  hasNuance: boolean
  hint: string
  whyDiffers?: string
}

interface FormalityAlternatives {
  casual: string
  neutral: string
  formal: string
}

interface Formality {
  detected: 'casual' | 'neutral' | 'formal'
  confidence: number
  alternatives: FormalityAlternatives
}

interface IdiomExplanation {
  phrase: string
  type: 'idiom' | 'slang'
  meaning: string
  example?: string
}

// Main Translation Type
interface Translation {
  messageId: string
  targetLanguage: string
  translatedText: string
  detectedSourceLanguage: string
  confidence: number
  culturalContext?: CulturalContext
  formality?: Formality
  idioms?: IdiomExplanation[]
  translatedAt: Date
  translatedBy: string[] // User IDs who have requested this
}

// Updated Message Type
interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  text: string
  timestamp: Date
  type: 'text' | 'image' | 'system'
  // ... other fields ...
  detectedLanguage?: string  // ← Source language (detected once)
  isTranslating?: boolean    // ← UI state during translation
  // ❌ Removed: translatedText, translatedTo
  // → These now live in translations/{targetLanguage}
}
```

---

## Services

### TranslationStorageService

New service for managing translations in Firestore subcollection.

**Location:** `services/translationStorageService.ts`

**Methods:**

```typescript
// Check if translation exists
await TranslationStorageService.hasTranslation(messageId, targetLanguage)

// Get translation for a message
const translation = await TranslationStorageService.getTranslation(
  messageId,
  targetLanguage
)

// Save new translation with all AI features
await TranslationStorageService.saveTranslation(
  messageId,
  targetLanguage,
  translatedText,
  detectedSourceLanguage,
  confidence,
  userId,
  culturalContext,
  formality,
  idioms
)

// Add user to list of who requested this translation
await TranslationStorageService.addTranslationRequester(
  messageId,
  targetLanguage,
  userId
)

// Get all translations for a message (bulk load)
const allTranslations = await TranslationStorageService.getMessageTranslations(
  messageId
)

// Update only AI feature fields (cultural context, formality, idioms)
await TranslationStorageService.updateTranslationFeatures(
  messageId,
  targetLanguage,
  {
    culturalContext: {...},
    formality: {...},
    idioms: [...]
  }
)
```

### TranslateService Updates

**New Method:** `translateAndStore()`

```typescript
const result = await TranslateService.translateAndStore(
  messageId,           // Store under this message
  text,                // Text to translate
  targetLanguage,      // Target language code
  userId,              // User requesting translation
  sourceLanguage       // Optional: source language or 'auto'
)

// Returns:
{
  translatedText: string
  detectedSourceLanguage: string
  confidence: number
  culturalContext?: CulturalContext
  formality?: Formality
  idioms?: IdiomExplanation[]
}
```

**Flow:**
1. Check Firestore for existing `translations/{targetLanguage}`
2. If found: return cached version, add user to `translatedBy`
3. If not found: call N8N webhook
4. Parse response for translation + AI features
5. Store in `messages/{messageId}/translations/{targetLanguage}`
6. Return complete result

---

## N8N Workflow Updates

**Extended Response Schema:**

```json
{
  "source_lang_detected": "en",
  "target_lang": "es",
  "original_text": "Hello world",
  "translated_text": "Hola mundo",
  "confidence": 0.95,

  "cultural_context": {
    "has_nuance": true,
    "hint": "Spanish uses 'Hola' informally",
    "why_differs": "Different formality conventions than English"
  },

  "formality": {
    "detected": "casual",
    "confidence": 0.9,
    "alternatives": {
      "casual": "Hola mundo",
      "neutral": "Buenos días mundo",
      "formal": "Estimado mundo"
    }
  },

  "idioms": [
    {
      "phrase": "hello world",
      "type": "phrase",
      "meaning": "greeting to the world",
      "example": "Often used in programming tutorials"
    }
  ],

  "terminology_applied": []
}
```

---

## Chat Component Integration

**Updated Flow in `app/chat/[id].tsx`:**

```typescript
const handleAutoTranslation = async (message: Message) => {
  // 1. Check user has preferred language
  if (!userProfile?.preferredLanguage || !user?.uid) return

  try {
    // 2. Mark message as translating (UI state)
    await MessagingService.setMessageTranslating(message.id, true)

    // 3. Call translateAndStore (handles caching + AI features)
    const result = await TranslateService.translateAndStore(
      message.id,
      message.text,
      userProfile.preferredLanguage,
      user.uid
    )

    // 4. Update message with detected source language (if not already set)
    if (!message.detectedLanguage) {
      await updateDoc(doc(db, 'messages', message.id), {
        detectedLanguage: result.detectedSourceLanguage
      })
    }

    // 5. Clear translating flag
    await MessagingService.setMessageTranslating(message.id, false)

    // ✅ Translation is now available in:
    // messages/{messageId}/translations/{targetLanguage}
    // UI components can fetch it from there

  } catch (error) {
    console.error('Translation error:', error)
    await MessagingService.setMessageTranslating(message.id, false)
  }
}
```

---

## Firestore Security Rules

**Updated Rules for Translations Subcollection:**

```firestore
match /messages/{messageId} {
  // Message read/write rules...

  // Translations subcollection - per-language translations with AI features
  match /translations/{targetLanguage} {
    // Only conversation participants can read translations
    allow read: if request.auth != null &&
      request.auth.uid in get(/databases/$(database)/documents/messages/$(messageId)).data.conversationId;

    // Only conversation participants can create/update translations
    allow write: if request.auth != null &&
      request.auth.uid in get(/databases/$(database)/documents/messages/$(messageId)).data.conversationId;
  }
}
```

---

## UI Component Updates (Next Steps)

### MessageBubble Component

Display translations with AI features:

```tsx
<MessageBubble message={message}>
  {/* Original message */}
  <Text>{message.text}</Text>

  {/* Translation toggle (loads from messages/{id}/translations/{lang}) */}
  <TranslationToggle messageId={message.id} />

  {/* Cultural context hint */}
  <CulturalContextHint translation={translation} />

  {/* Formality badge with alternatives */}
  <FormalityBadge formality={translation.formality} />

  {/* Idiom explanations */}
  <IdiomExplanation idioms={translation.idioms} />
</MessageBubble>
```

### Translation Fetching Logic

```tsx
// In message display component:
const [translation, setTranslation] = useState<Translation | null>(null)

useEffect(() => {
  const fetchTranslation = async () => {
    const trans = await TranslationStorageService.getTranslation(
      message.id,
      userProfile.preferredLanguage
    )
    setTranslation(trans)
  }

  fetchTranslation()
}, [message.id, userProfile.preferredLanguage])

// Display based on translation availability:
{translation ? (
  <>
    <Text>{translation.translatedText}</Text>
    {translation.culturalContext?.hasNuance && (
      <CulturalHint hint={translation.culturalContext.hint} />
    )}
  </>
) : (
  <Text>{message.text}</Text>
)}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Group Chat: 3 Users, 3 Languages                                │
│ User A (Spanish) | User B (French) | User C (German)            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
                    Message Sent: "Hi there"
                              ▼
        ┌───────────────────────────────────────┐
        │  Firestore: messages/{messageId}      │
        ├───────────────────────────────────────┤
        │ text: "Hi there"                      │
        │ senderId: "user123"                   │
        │ detectedLanguage: "en" ← Auto-detect  │
        │ conversationId: "conv123"             │
        └───────────────────────────────────────┘
                              ▼
           (Each user triggers auto-translation)
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
    User A opens         User B opens          User C opens
    (Spanish)            (French)              (German)
        │                     │                     │
        ▼                     ▼                     ▼
    Check: es/           Check: fr/            Check: de/
    EXISTS? ❌            EXISTS? ❌            EXISTS? ❌
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                        ▼
                Call N8N (ONCE per language)
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    N8N→es        N8N→fr            N8N→de
    "Hola"       "Bonjour"        "Hallo"
        │               │               │
        └───────────────┼───────────────┘
                        ▼
    ┌─────────────────────────────────────────┐
    │ messages/{id}/translations/              │
    ├─────────────────────────────────────────┤
    │ ├─ es/                                  │
    │ │  ├─ translatedText: "Hola"            │
    │ │  ├─ cultural_context: {...}           │
    │ │  ├─ formality: {...}                  │
    │ │  ├─ idioms: [...]                     │
    │ │  └─ translatedBy: ["userId_A"]        │
    │ │                                       │
    │ ├─ fr/                                  │
    │ │  ├─ translatedText: "Bonjour"         │
    │ │  └─ ... (same structure)              │
    │ │                                       │
    │ └─ de/                                  │
    │    ├─ translatedText: "Hallo"           │
    │    └─ ... (same structure)              │
    └─────────────────────────────────────────┘
                        ▼
    ┌──────────────────────────────────────────┐
    │ All users now see translation in         │
    │ their preferred language + AI hints      │
    └──────────────────────────────────────────┘
```

---

## Cost & Performance Benefits

### N8N API Calls Reduction
- **Before:** 100 messages × 3 users × 3 languages = 900 calls ❌
- **After:** 100 messages × 3 languages = 300 calls ✅ (66% reduction)

Why? Each translation is computed once, then cached and reused.

### Storage
- **Per translation:** ~500 bytes (text + AI features)
- **Per conversation:** ~50KB for 100 messages × 3 languages
- **Minimal impact** on Firestore quota

### Speed
- First user to request translation: ~2s (N8N call)
- Subsequent users same language: <100ms (Firestore read + cache)

---

## Migration Notes

### Existing Messages
Current messages still work with old schema (`translatedText`, `translatedTo` fields).

**No migration needed!** The new code:
1. Checks `translations/{lang}` subcollection first
2. Falls back to old fields if not found
3. Gradually converts to new schema as users re-translate

### Testing the New Schema

```typescript
// Test 1: Create a group chat
const convId = await MessagingService.createConversation(
  ['user1', 'user2', 'user3'],
  'group',
  'Test Group'
)

// Test 2: Send a message
const messageId = await MessagingService.sendMessage(
  convId,
  'user1',
  'John',
  'Hello world'
)

// Test 3: User 2 requests Spanish translation
await TranslateService.translateAndStore(
  messageId,
  'Hello world',
  'es',
  'user2'
)

// Test 4: Verify translation saved
const translation = await TranslationStorageService.getTranslation(
  messageId,
  'es'
)
console.log(translation.translatedText) // Should be Spanish

// Test 5: User 3 requests same translation (should be cached)
const start = Date.now()
const translation2 = await TranslateService.translateAndStore(
  messageId,
  'Hello world',
  'es',
  'user3'
)
console.log(`Fetch time: ${Date.now() - start}ms`) // Should be <100ms
```

---

## Next Steps

1. **UI Components** - Create MessageBubble components to display translations + AI features
2. **Translation Display** - Load translations from subcollection in real-time
3. **Toggle Functionality** - Allow users to switch between original and translation
4. **Cultural Hints** - Display cultural context hints
5. **Formality Options** - Show formality alternatives before sending
6. **Idiom Learning** - Display idiom explanations in modals

See implementation files:
- `services/translationStorageService.ts`
- `services/translateService.ts` (updated with `translateAndStore`)
- `types/messaging.ts` (new Translation interfaces)
- `languageN8nWorkflow.json` (extended response schema)
- `firestore.rules` (translations subcollection security)

