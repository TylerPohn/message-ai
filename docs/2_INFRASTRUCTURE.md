# MessageAI: Non-AI Changes Required
## Supporting Infrastructure for International Communicator Persona

**Purpose**: These changes enable the AI features to work properly and support the International Communicator workflow without AI enhancements.

---

## 1. DATABASE SCHEMA UPDATES

### 1.1 Users Collection Enhancement

**Current State**: Basic user profiles with auth info
**Changes Needed**: Add international communicator metadata

**File**: Firestore → `users` collection

```typescript
// Add these fields to user documents:
{
  // ... existing fields (uid, email, displayName, photoURL, etc.) ...

  // NEW: International Communicator Fields
  country?: string;                 // User's country
  timezone?: string;                // IANA timezone (e.g., "Asia/Tokyo")
  businessHoursStart?: number;      // Hour of day (0-23) when user starts work
  businessHoursEnd?: number;        // Hour of day (0-23) when user ends work

  // Cultural communication preferences
  communicationStyle?: 'direct' | 'indirect';
  preferredFormality?: 'casual' | 'business' | 'formal';
  responseTimeExpectation?: 'immediate' | 'same-day' | 'flexible';

  // App preferences
  enableCulturalNotifications?: boolean;  // Show time zone warnings?
  enableFormalityDetection?: boolean;     // Show formality suggestions?
  enableToneAnalysis?: boolean;           // Show tone analysis before sending?
}
```

**Migration Strategy**:
1. Add fields as optional (no breaking changes)
2. Populate on first use or user profile edit
3. Provide UI in Settings → Language/Preferences to fill in

**Implementation Timeline**: 1 day

---

### 1.2 Contacts Collection Enhancement

**Current State**: Stores saved contacts with basic info
**Changes Needed**: Add timezone and cultural context

**File**: Firestore → `contacts` collection

```typescript
// Add these fields to contact documents:
{
  // ... existing fields (uid, contactId, displayName, etc.) ...

  // NEW: International Communication Fields
  country?: string;                 // Contact's country
  timezone?: string;                // Contact's timezone
  businessHoursStart?: number;      // When this contact typically works
  businessHoursEnd?: number;

  // Cache contact's preferences (pulled from their user profile)
  cachedCommunicationStyle?: 'direct' | 'indirect';
  cachedFormality?: 'casual' | 'business' | 'formal';
  lastCacheUpdate?: Date;           // When we last updated their info (24h cache)
}
```

**Migration Strategy**:
1. Optional fields added
2. Populated when:
   - User manually edits contact and selects country
   - System fetches contact's profile and caches their preferences
   - User long-presses contact to "set timezone"

**Implementation Timeline**: 1 day

---

### 1.3 Messages Collection Enhancement

**Current State**: Stores message text, status, timestamps
**Changes Needed**: Add AI analysis fields

**File**: Firestore → `messages` collection

```typescript
// Add these fields to message documents:
{
  // ... existing fields (text, senderId, timestamp, etc.) ...

  // NEW: AI Analysis Fields

  // Formality analysis (Feature 1)
  detectedFormality?: 'casual' | 'business' | 'formal';

  // Idiom detection (Feature 2)
  hasIdioms?: boolean;
  hasSlang?: boolean;
  idioms?: Array<{
    phrase: string;
    meaning: string;
    literalTranslation: string;
    culture: string;
    pronunciation?: string;
  }>;
  slang?: Array<{
    term: string;
    meaning: string;
    context: string;
  }>;
  idiomDetectionStatus?: 'pending' | 'detected' | 'none' | 'error';

  // Cultural translation context (Feature 3)
  culturalContext?: {
    notes: string;
    warnings: string[];
    alternativeInterpretations: string[];
    suggestedContext: string;
  };

  // Tone analysis (Feature 4)
  detectedTone?: 'friendly' | 'professional' | 'formal' | 'casual' | 'sarcastic' | 'urgent' | 'angry';
  emotionScores?: {
    positivity: number;
    urgency: number;
    formality: number;
    sarcasm: number;
    frustration: number;
  };
  toneAnalysisStatus?: 'pending' | 'analyzed' | 'error';
}
```

**Notes**:
- These fields are populated by Cloud Functions after message creation
- All fields are optional for backward compatibility
- Analysis happens asynchronously in background

**Implementation Timeline**: 1 day

---

### 1.4 New Collection: Holidays Reference

**Purpose**: Store holiday data for time zone assistant

**File**: Firestore → `holidays` collection (new)

```typescript
// Structure:
{
  country: string;                  // "Japan"
  year: number;                     // 2025
  holidays: Array<{
    name: string;                   // "New Year's Day"
    date: string;                   // "2025-01-01"
    month: number;                  // 1
    day: number;                    // 1
    significance: string;           // "National holiday"
  }>;
}

// Example document ID: "JP_2025"
```

**Data Source Options**:
- Manually seed with common holidays (5 major countries, 2 years)
- Use public holiday API (calendarific.com, date.nager.at)
- Auto-update Cloud Function to fetch annually

**Implementation Timeline**: 2-3 days (manual seeding), 5-7 days (API integration)

---

## 2. FIRESTORE SECURITY RULES UPDATES

**Current State**: Temporary rules expiring Nov 19, 2025
**Changes Needed**: Permanent rules + read permissions for new fields

**File**: `firestore.rules`

```typescript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - read own profile + read others' public fields
    match /users/{userId} {
      allow read: if request.auth.uid != null && (
        request.auth.uid == userId ||
        // Allow reading public fields for international communicator features
        resource.data.keys().hasAny(['country', 'timezone', 'communicationStyle', 'displayName', 'photoURL'])
      );
      allow write: if request.auth.uid == userId;
    }

    // Contacts collection - read/write own contacts only
    match /contacts/{contactId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }

    // Conversations - participants can read/write
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;

      // Messages subcollection
      match /messages/{messageId} {
        allow read: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if request.auth.uid == request.resource.data.senderId &&
                        request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow update: if request.auth.uid == get(/databases/$(database)/documents/messages/$(messageId)).data.senderId ||
                        request.resource.data.status in ['delivered', 'read']; // Allow status updates
      }
    }

    // Holidays reference data - public read
    match /holidays/{holidayDoc} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid == null; // Only admin/server writes
    }

    // Memberships - read own, write by system
    match /memberships/{membershipId} {
      allow read: if request.auth.uid == resource.data.userId;
    }
  }
}
```

**Implementation Timeline**: 1 day (review + deploy)

---

## 3. CLOUD FUNCTIONS ENHANCEMENTS

### 3.1 New Function: Detect Idioms on Message Creation

**File**: `functions/src/onMessageCreived.ts` (new or extend)

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { openai } from '@/functions/services/openai';

export const detectIdiomsInMessage = onDocumentCreated(
  'conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const db = getFirestore();
    const message = event.data?.data();

    if (!message?.text || message.type !== 'text') {
      return; // Skip non-text messages
    }

    try {
      // Get sender's language
      const senderDoc = await db.collection('users').doc(message.senderId).get();
      const senderLanguage = senderDoc.data()?.preferredLanguage || 'en';

      // Skip if already in English (fewer idioms to detect)
      if (senderLanguage === 'en') {
        await event.data.ref.update({
          idiomDetectionStatus: 'none'
        });
        return;
      }

      // Call OpenAI to detect idioms
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an idiom detection specialist. Analyze text for idioms, slang, and cultural expressions.
Return ONLY valid JSON with no markdown.`
          },
          {
            role: 'user',
            content: `Analyze this message for idioms and slang:
Message: "${message.text}"
Language: ${senderLanguage}

Return JSON:
{
  "has_idioms": boolean,
  "has_slang": boolean,
  "idioms": [{"phrase": "...", "meaning": "...", "literal": "...", "culture": "..."}],
  "slang": [{"term": "...", "meaning": "...", "context": "..."}]
}`
          }
        ],
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response');

      const analysis = JSON.parse(content);

      // Update message with analysis
      if (analysis.has_idioms || analysis.has_slang) {
        await event.data.ref.update({
          hasIdioms: analysis.has_idioms,
          hasSlang: analysis.has_slang,
          idioms: analysis.idioms || [],
          slang: analysis.slang || [],
          idiomDetectionStatus: 'detected'
        });
      } else {
        await event.data.ref.update({
          idiomDetectionStatus: 'none'
        });
      }
    } catch (error) {
      console.error('Idiom detection error:', error);
      await event.data.ref.update({
        idiomDetectionStatus: 'error'
      });
    }
  }
);
```

**Deployment**: `npm run deploy` in `functions/` directory
**Cost**: ~$0.00 per 1000 messages (using gpt-4-turbo at ~$0.01/request)
**Timeline**: 2-3 days

---

### 3.2 Enhance Existing Translation Function

**File**: `functions/src/translateMessage.ts` (update)

```typescript
// Add to existing translation function:

// After getting translation from N8N, enhance with cultural context
const enhancedTranslation = await getCulturalContext(
  originalMessage.text,
  translation.translatedText,
  translation.source_lang_detected,
  translation.target_lang,
  recipientCountry // Optional: if known
);

// Update message with cultural context
await db.collection('conversations')
  .doc(conversationId)
  .collection('messages')
  .doc(messageId)
  .update({
    culturalContext: enhancedTranslation.cultural_context,
    translationResult: {
      ...translation,
      culturalContext: enhancedTranslation.cultural_context
    }
  });

// Helper function
async function getCulturalContext(
  original: string,
  translated: string,
  sourceLang: string,
  targetLang: string,
  recipientCountry?: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze translation for cultural context.'
        },
        {
          role: 'user',
          content: `Original: "${original}"
Translated: "${translated}"
Source: ${sourceLang}, Target: ${targetLang}
${recipientCountry ? `Recipient: ${recipientCountry}` : ''}

Return JSON:
{
  "cultural_notes": "cultural context notes",
  "cultural_sensitivity_warnings": ["warning1"],
  "alternative_interpretations": ["alt1"],
  "suggested_context": "helpful background",
  "confidence": 0.8
}`
        }
      ]
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error('Cultural context error:', error);
    return { cultural_context: null };
  }
}
```

**Timeline**: 1-2 days

---

### 3.3 New Function: Analyze Tone on Message Creation

**File**: `functions/src/analyzeTone.ts` (new)

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { openai } from '@/functions/services/openai';

export const analyzeToneInMessage = onDocumentCreated(
  'conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const db = getFirestore();
    const message = event.data?.data();

    if (!message?.text || message.type !== 'text') {
      return;
    }

    try {
      // Get recipient's country if in conversation
      const conversationDoc = await db
        .collection('conversations')
        .doc(event.params.conversationId)
        .get();

      const participants = conversationDoc.data()?.participants || [];
      const recipientCountry = null; // TODO: get from participants' profiles

      // Analyze tone
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze message tone and emotional content.'
          },
          {
            role: 'user',
            content: `Message: "${message.text}"

Return JSON:
{
  "detected_tone": "friendly|professional|formal|casual|sarcastic|urgent|angry|neutral",
  "emotion_scores": {
    "positivity": 0.5,
    "urgency": 0.2,
    "formality": 0.7,
    "sarcasm": 0.1,
    "frustration": 0.0
  },
  "confidence": 0.85
}`
          }
        ]
      });

      const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');

      await event.data.ref.update({
        detectedTone: analysis.detected_tone,
        emotionScores: analysis.emotion_scores,
        toneAnalysisStatus: 'analyzed'
      });
    } catch (error) {
      console.error('Tone analysis error:', error);
      await event.data.ref.update({
        toneAnalysisStatus: 'error'
      });
    }
  }
);
```

**Timeline**: 1-2 days

---

## 4. USER INTERFACE UPDATES

### 4.1 Settings Screen Update

**File**: `app/(tabs)/settings.tsx`

**Changes**:
1. Add "International Communication" section
2. Add settings for:
   - Country/Timezone selection
   - Business hours
   - Communication preferences
   - Enable/disable AI features

```typescript
// Add to settings list:
<SettingsItem
  icon="globe"
  title="International Communication"
  subtitle="Timezone, cultural preferences"
  onPress={() => navigation.navigate('IntlSettings')}
/>

// Handle save to user profile:
const handleSaveIntlSettings = async () => {
  await updateUserProfile({
    country,
    timezone,
    businessHoursStart,
    businessHoursEnd,
    communicationStyle,
    preferredFormality,
    enableCulturalNotifications
  });
};
```

**Implementation Timeline**: 2 days

---

### 4.2 Contacts Screen Update

**File**: `app/(tabs)/contacts.tsx`

**Changes**:
1. Show timezone info for each contact
2. Add button to set contact's timezone/country
3. Show business hours status (online/offline)

```typescript
// In contact card:
<View>
  <Text>{contact.displayName}</Text>
  {contact.timezone && (
    <Text style={styles.timezone}>
      🌍 {contact.timezone} • {getLocalTimeString(contact.timezone)}
    </Text>
  )}
  {contact.businessHoursStart && (
    <Text style={styles.businessHours}>
      {isBusinessHours(contact) ? '✓ Work hours' : '💤 Off hours'}
    </Text>
  )}
</View>

// Add action:
<TouchableOpacity
  onPress={() => openSetTimezoneModal(contact)}
  style={styles.editButton}
>
  <Icon name="time" />
</TouchableOpacity>
```

**Implementation Timeline**: 2 days

---

### 4.3 New Screens: International Settings

**File**: `app/settings/intl-settings.tsx` (new)

```typescript
// Screen for:
// 1. Country selection (dropdown of 150+ countries)
// 2. Timezone selection (IANA timezone list)
// 3. Business hours picker (start/end time)
// 4. Communication style preferences
// 5. Feature toggles (enable formality detection, tone analysis, etc.)

// Save to Firestore:
const handleSaveSettings = async () => {
  await updateUserProfile({
    country: selectedCountry,
    timezone: selectedTimezone,
    businessHoursStart: businessHours.start,
    businessHoursEnd: businessHours.end,
    communicationStyle,
    preferredFormality,
    enableCulturalNotifications: true,
    enableFormalityDetection: true,
    enableToneAnalysis: true
  });
};
```

**Implementation Timeline**: 2-3 days

---

### 4.4 Message Composer Enhancement

**File**: `app/chat/[id].tsx`

**Changes**:
1. Add real-time analysis badges (formality, tone)
2. Show recipient's timezone status
3. Show business hours warning if needed

```typescript
// Add to composer:
<View style={styles.analysisRow}>
  {/* Formality badge */}
  {formalityAnalysis && (
    <Badge
      icon={getToneEmoji(formalityAnalysis.detectedFormality)}
      text={formalityAnalysis.detectedFormality}
    />
  )}

  {/* Tone badge */}
  {toneAnalysis && (
    <Badge
      icon={getToneEmoji(toneAnalysis.detectedTone)}
      text={toneAnalysis.detectedTone}
    />
  )}

  {/* Recipient timezone warning */}
  {recipientContext && !recipientContext.isBusinessHours && (
    <Badge
      icon="⏰"
      text="Off hours"
      color="warning"
      onPress={() => showTimezoneInfo()}
    />
  )}
</View>
```

**Implementation Timeline**: 1-2 days

---

### 4.5 Contact Card Component

**File**: `components/ContactCardInternational.tsx` (new)

Shows:
- Contact name + avatar
- Country flag + timezone
- Local time + business hours status
- Next holiday (if any)
- Tap for full details modal

**Implementation Timeline**: 2-3 days

---

### 4.6 Message Bubble Enhancement

**File**: `components/MessageBubble.tsx`

**Changes**:
1. Add buttons to view idiom explanations
2. Add button to view cultural context
3. Show tone/formality badges (optional, dismissible)

```typescript
// Add to message bubble:
<View style={styles.messageActions}>
  {message.hasIdioms && (
    <TouchableOpacity
      onPress={() => showIdiomModal(message)}
      style={styles.actionButton}
    >
      <Text>🌍 Explanations</Text>
    </TouchableOpacity>
  )}

  {message.culturalContext && (
    <TouchableOpacity
      onPress={() => showCulturalContextModal(message)}
      style={styles.actionButton}
    >
      <Text>📖 Cultural Notes</Text>
    </TouchableOpacity>
  )}

  {message.detectedTone && (
    <Text style={styles.toneLabel}>
      {getToneEmoji(message.detectedTone)}
    </Text>
  )}
</View>
```

**Implementation Timeline**: 1-2 days

---

## 5. DATA MIGRATION & SEEDING

### 5.1 Populate Holiday Reference Data

**File**: `scripts/seed-holidays.js` (new)

```javascript
// Seed holidays for major countries
const holidays = {
  JP_2025: {
    country: 'Japan',
    year: 2025,
    holidays: [
      { name: 'New Year', date: '2025-01-01', significance: 'National holiday' },
      { name: 'Coming of Age Day', date: '2025-01-13', significance: 'National holiday' },
      // ... more holidays
    ]
  },
  US_2025: {
    country: 'USA',
    year: 2025,
    holidays: [
      { name: 'New Year Day', date: '2025-01-01', significance: 'Federal holiday' },
      // ... more holidays
    ]
  }
  // ... more countries
};

// Run:
// npm run seed-holidays
```

**Implementation Timeline**: 1-2 days (manual) or 3-5 days (API integration)

---

### 5.2 Add Contact Timezone Setup

**UI Flow**:
1. When user views contact without timezone: "Set timezone?"
2. Click → country picker + timezone selector
3. Save to contact document
4. System caches contact's preferences from their profile

**Implementation Timeline**: 1 day

---

## 6. PERFORMANCE & OPTIMIZATION

### 6.1 Lazy Load AI Analysis

**Problem**: Message with full AI analysis could be large
**Solution**: Load analysis data on-demand

```typescript
// Message document stores flags only:
{
  text: "...",
  hasIdioms: true,
  idiomDetectionStatus: 'pending'
}

// Load details when user taps "Explanations":
const idiomData = await fetchMessageIdiomData(messageId);
```

**Timeline**: Built into feature implementation

---

### 6.2 Cache AI Results

**Approach**:
- Formality: 5-min cache (same message analyzed repeatedly)
- Idioms: 24-hour cache (stable for lifetime of message)
- Tone: 10-min cache
- Translation context: 1-hour cache

**Implementation**: Built into each service

**Timeline**: Built into feature implementation

---

### 6.3 Batch N8N Webhook Calls

**Current**: 1 call per translation
**Optimization**: Batch translate 5-10 messages together (only if needed)

**Implementation Timeline**: 2-3 days (optional, after features working)

---

## 7. TESTING & QA

### 7.1 Unit Tests

**Files to add tests for**:
- `services/formalityService.ts`
- `services/idiomService.ts`
- `services/toneService.ts`
- `services/timezoneService.ts`

**Test Framework**: Jest (already in project)

**Example**:
```typescript
describe('FormalityService', () => {
  it('should detect casual tone correctly', async () => {
    const result = await formalityService.detectFormality({
      text: "hey man, whatcha up to?",
      targetLanguage: 'es'
    });
    expect(result.detectedFormality).toBe('casual');
  });

  it('should warn on formality mismatch with Japan', async () => {
    const result = await formalityService.detectFormality({
      text: "hey man, whatcha up to?",
      targetLanguage: 'ja',
      recipientCountry: 'Japan'
    });
    expect(result.isMismatch).toBe(true);
  });
});
```

**Timeline**: 5-7 days (one per feature, ~10-15 tests each)

---

### 7.2 Integration Tests

**Scenarios**:
- Message composed → formality detected → alternatives shown
- Message received → idioms detected → modal displays correctly
- Contact timezone set → message composer shows business hours warning
- Meeting scheduler called → generates 3+ time slot options

**Timeline**: 5-7 days

---

### 7.3 Manual QA Checklist

```
[ ] Formality detection works across 5+ languages
[ ] Idiom explanations show for all detected phrases
[ ] Translation includes cultural notes
[ ] Tone analysis shows cultural interpretations
[ ] Timezone displays current time + business hours
[ ] Meeting scheduler finds optimal times
[ ] All features work offline (no crashes)
[ ] Performance: <1s for most AI operations
[ ] UI is responsive and not janky
[ ] Error messages are helpful
```

**Timeline**: 3-5 days (parallel with development)

---

## 8. DOCUMENTATION

### 8.1 Update README.md

Add sections for:
- International Communicator persona
- AI features overview
- How to set up timezone/preferences
- Screenshots of each feature
- Known limitations

**Timeline**: 1-2 days

---

### 8.2 Create Feature Guides

For each AI feature:
- What it does
- How to use
- Tips for best results

**Timeline**: 2-3 days

---

## 9. DEPLOYMENT CHECKLIST

**Before deploying to production**:

- [ ] All 5 AI features tested
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests pass
- [ ] Manual QA checklist completed
- [ ] Performance tested (with 1000+ messages)
- [ ] Error handling for all failures
- [ ] Firestore rules reviewed and deployed
- [ ] Cloud Functions deployed
- [ ] N8N workflow tested and stable
- [ ] Database backups configured
- [ ] Monitoring/logging set up
- [ ] Rate limiting configured on API calls
- [ ] Translation endpoint deployed (Docker)
- [ ] Push notifications fully integrated
- [ ] Analytics tracking added
- [ ] Security audit completed

---

## 10. IMPLEMENTATION TIMELINE SUMMARY

| Phase | Tasks | Days | Cumulative |
|-------|-------|------|-----------|
| **1: Database** | Schema + Firestore rules | 2-3 | 2-3 |
| **2: Cloud Functions** | Idiom, tone, translation detection | 4-6 | 6-9 |
| **3: Core UI** | Settings, contacts, internationalization | 5-7 | 11-16 |
| **4: Feature UI** | Modals, badges, analyzers | 8-10 | 19-26 |
| **5: Testing** | Unit + integration + manual QA | 5-7 | 24-33 |
| **6: Polish** | Performance, error handling, docs | 3-5 | 27-38 |
| **—** | **AI Features** (parallel) | 23-43 | 50-80 total |

**Estimated Total**: **50-80 days** for full implementation (AI + non-AI)

**Realistic Minimum** (core features only): **25-35 days**

---

## 11. QUICK START: Minimal MVP

To get a working version fast (10-15 days):

1. **Database** (1-2 days):
   - Add country/timezone fields to users + contacts
   - Add holiday reference collection
   - Update Firestore rules

2. **Settings UI** (2 days):
   - Country/timezone picker in settings
   - Save to user profile
   - Display in contacts

3. **Formality Detection** (3-4 days):
   - `formalityService.ts`
   - Message composer UI badges
   - Update N8N workflow

4. **Idiom Explanations** (3-4 days):
   - `idiomService.ts`
   - Cloud Function to detect
   - Message bubble modal

5. **Testing** (2-3 days):
   - Manual QA
   - Fix bugs

**Result**: Working MVP with 2 AI features + timezone assistant
**Upgrade path**: Add remaining features incrementally

---

## Notes for Implementation

1. **Start with database**: Everything else depends on schema
2. **Parallelize**: AI and UI can be built simultaneously
3. **Test early**: Don't wait until the end
4. **Use feature flags**: Deploy features incrementally
5. **Get feedback**: Test with real users early
6. **Optimize later**: Get it working first, then optimize
7. **Document as you go**: Makes handoff easier

---

## Files Modified Summary

```
NEW FILES (10):
✓ services/formalityService.ts
✓ services/idiomService.ts
✓ services/toneService.ts
✓ services/timezoneService.ts
✓ services/meetingCoordinatorService.ts
✓ components/IdiomExplanationModal.tsx
✓ components/ToneDetailsPanel.tsx
✓ components/CulturalContextModal.tsx
✓ components/ContactWithTimezone.tsx
✓ components/MeetingScheduler.tsx
✓ app/settings/intl-settings.tsx (new settings screen)
✓ functions/src/detectIdioms.ts (Cloud Function)
✓ functions/src/analyzeTone.ts (Cloud Function)

UPDATED FILES (8):
✓ types/messaging.ts (add AI fields)
✓ types/user.ts (add country/timezone)
✓ types/contacts.ts (add timezone fields)
✓ app/chat/[id].tsx (message composer updates)
✓ app/(tabs)/contacts.tsx (timezone display)
✓ app/(tabs)/settings.tsx (new section)
✓ components/MessageBubble.tsx (add explanation buttons)
✓ services/translateService.ts (cultural context)
✓ languageN8nWorkflow.json (extend workflow)
✓ firestore.rules (permanent + new field access)

SCRIPTS (2):
✓ scripts/seed-holidays.js (populate holiday data)
✓ migrations/addUserInternationalFields.js (optional)
```
