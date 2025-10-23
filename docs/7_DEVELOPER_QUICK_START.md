# Developer Quick Start: AI Features

## 🚀 Get Started in 5 Minutes

### What You Need to Know

The app now supports AI-enhanced translations with cultural context, formality detection, and idiom explanations. All the backend is done—just need to test and verify it works!

---

## Installation

No new packages needed! Everything uses existing dependencies:
- `firebase` (Firestore storage)
- `expo` (React Native UI)
- `axios` (N8N API calls)

---

## How It Works (Simple Version)

```
User gets message in Spanish
       ↓
App auto-translates to user's language (if enabled)
       ↓
Translation stored in Firestore: messages/{id}/translations/es/
       ↓
UI displays:
  • Original + translated text (toggle)
  • Cultural hint (if different from English)
  • Formality level (casual/neutral/formal)
  • Idioms explained
```

---

## Code Examples

### Example 1: Using TranslationDisplay

```tsx
import { TranslationDisplay } from '@/components/TranslationDisplay'

// In your message component:
<TranslationDisplay
  messageId="msg123"
  messageText="Hola mundo"
  targetLanguage="en"  // User's language
  isOwnMessage={false}
  onTranslationLoaded={(translation) => {
    if (translation) {
      console.log('Translated:', translation.translatedText)
      console.log('Cultural hint:', translation.culturalContext?.hint)
      console.log('Formality:', translation.formality?.detected)
      console.log('Idioms:', translation.idioms)
    }
  }}
/>
```

### Example 2: Manual Translation

```typescript
import { TranslateService } from '@/services/translateService'

// Translate and store in Firestore
const result = await TranslateService.translateAndStore(
  messageId: 'msg123',        // Message to translate
  text: 'Hola mundo',          // Text to translate
  targetLanguage: 'en',        // Target language
  userId: 'user123'            // Who's requesting
)

// Result includes everything:
result.translatedText        // "Hello world"
result.detectedSourceLanguage  // "es"
result.confidence             // 0.95
result.culturalContext        // { hasNuance, hint, whyDiffers }
result.formality              // { detected, confidence, alternatives }
result.idioms                 // [{ phrase, type, meaning, example }]
```

### Example 3: Checking Cache

```typescript
import { TranslationStorageService } from '@/services/translationStorageService'

// Check if translation exists
const exists = await TranslationStorageService.hasTranslation('msg123', 'en')
if (exists) {
  console.log('Translation cached!')
} else {
  console.log('Will need to call N8N')
}

// Get translation
const translation = await TranslationStorageService.getTranslation('msg123', 'en')
if (translation) {
  console.log('Translated text:', translation.translatedText)
}
```

---

## Component APIs

### TranslationDisplay

**Shows:** Original + translated text with toggle button

```tsx
<TranslationDisplay
  messageId={string}                    // Which message
  messageText={string}                  // Original text
  targetLanguage={string}               // 'es', 'fr', 'de', etc.
  isOwnMessage={boolean}                // Don't translate your own
  onTranslationLoaded={(trans) => {}}   // Called when loaded
/>
```

### CulturalContextHint

**Shows:** 💡 Hint button if translation has cultural nuance

```tsx
<CulturalContextHint
  culturalContext={{
    hasNuance: true,
    hint: "French greeting conventions differ",
    whyDiffers: "..."
  }}
/>
```

### FormalityBadge

**Shows:** 😊/👋/🎩 Badge with formality level + alternatives

```tsx
<FormalityBadge
  formality={{
    detected: 'casual',
    confidence: 0.95,
    alternatives: {
      casual: "hey there",
      neutral: "hello",
      formal: "good day"
    }
  }}
/>
```

### IdiomExplanation

**Shows:** 🎓 Button with number of expressions found

```tsx
<IdiomExplanation
  idioms={[
    {
      phrase: "break a leg",
      type: "idiom",
      meaning: "good luck",
      example: "said to performers"
    }
  ]}
/>
```

---

## File Structure

```
MessageAI/
├─ services/
│  ├─ translateService.ts (UPDATED)
│  │  └─ translateAndStore() - Main method
│  └─ translationStorageService.ts (NEW)
│     └─ Firestore subcollection ops
│
├─ components/
│  ├─ TranslationDisplay.tsx (NEW)
│  ├─ CulturalContextHint.tsx (NEW)
│  ├─ FormalityBadge.tsx (NEW)
│  └─ IdiomExplanation.tsx (NEW)
│
├─ app/
│  └─ chat/
│     └─ [id].tsx (UPDATED)
│        └─ renderMessage() - Integration
│
├─ types/
│  └─ messaging.ts (UPDATED)
│     ├─ Translation interface (NEW)
│     └─ Message interface (MODIFIED)
│
└─ docs/
   ├─ 4_MULTI_LANGUAGE_TRANSLATION_SCHEMA.md
   ├─ 5_UI_COMPONENTS_GUIDE.md
   ├─ 6_IMPLEMENTATION_SUMMARY.md
   └─ 7_DEVELOPER_QUICK_START.md (THIS FILE)
```

---

## Testing Checklist

### Quick Test (5 minutes)

- [ ] Open app, go to chat
- [ ] Enable "Auto-translate" in settings
- [ ] Receive message in another language
- [ ] See translation appear with toggle
- [ ] Tap toggle to switch original ↔ translated
- [ ] Tap 💡 icon to see cultural context
- [ ] Tap 😊 badge to see formality alternatives
- [ ] Tap 🎓 icon to see idioms

### Detailed Test (30 minutes)

- [ ] Test with multiple languages (Spanish, French, German)
- [ ] Test in group chats (3+ users, different languages)
- [ ] Test with messages containing idioms
- [ ] Test formality alternatives for casual/neutral/formal
- [ ] Test cultural context hints
- [ ] Toggle translation multiple times
- [ ] Check Firestore for stored translations
- [ ] Verify no duplicate N8N calls for same language

### Stress Test

- [ ] Rapidly send 10 messages
- [ ] Check they all translate correctly
- [ ] Verify N8N not called 10x (should be cached)
- [ ] No UI freezes or lag

---

## Common Tasks

### How to Add a New Language

The app supports 16 languages. To add more:

1. **N8N:** Update supported languages list
2. **Types:** No changes needed (uses string codes)
3. **UI:** No changes needed (works automatically)

Language codes used: `en`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `uk`, `ja`, `ko`, `zh`, `ar`, `hi`, `th`, `vi`, `nl`

### How to Debug a Translation

```typescript
// Check what's stored
const trans = await TranslationStorageService.getTranslation(messageId, 'es')
console.log(trans)

// Should show:
{
  messageId: "msg123",
  targetLanguage: "es",
  translatedText: "Hola mundo",
  detectedSourceLanguage: "en",
  confidence: 0.95,
  culturalContext: { hasNuance: false, hint: "" },
  formality: { detected: "neutral", confidence: 0.8, ... },
  idioms: [],
  translatedAt: Date,
  translatedBy: ["user123"]
}
```

### How to Test Without N8N

If N8N is down, translations will fail but app won't crash:

```typescript
// TranslationDisplay will show loading indefinitely
// But message still displays in original language
// No app crash or error state
```

### How to Monitor API Usage

```typescript
// Check how many translations cached in memory
console.log('Translations in state:', translations.size)

// Check Firestore usage
// Firebase Console → Database → Storage
// Look for messages/{id}/translations/ subcollection

// Estimate cost
// 100 messages × 3 languages = ~300 Firestore operations
// ≈ $0 (within free tier) unless massive scale
```

---

## Troubleshooting

### Problem: Component not showing

**Solution:** Check if translation loaded
```typescript
const translation = translations.get(item.id)
if (!translation) {
  console.log('Translation not loaded yet')
} else {
  console.log('Translation ready:', translation)
}
```

### Problem: Modal doesn't open

**Solution:** Check if data exists
```typescript
// For CulturalContextHint
if (translation?.culturalContext?.hasNuance) {
  // Should show
}

// For IdiomExplanation
if (translation?.idioms?.length > 0) {
  // Should show
}
```

### Problem: Confidence shows 0%

**Solution:** N8N might return missing field
```typescript
// Check response from N8N
console.log('N8N Response:', translationResult)
// Should have: confidence: 0.95
// If missing, check N8N workflow
```

### Problem: Users see different translations

**This is expected!** Different users might translate to different languages. Each language has its own translation document.

---

## Performance Tips

### What's Already Optimized

✅ Translations cached in Firestore (no re-calling N8N)
✅ Translations cached in memory (Map in React state)
✅ Only translate once per language (shared across users)
✅ Lazy load (only fetch when component mounts)
✅ Async (doesn't block UI)

### What You Can Optimize

If experiencing lag with 1000+ messages:

```typescript
// Cleanup old translations after 1 hour
// Add in chatScreen component
useEffect(() => {
  const timer = setInterval(() => {
    setTranslations(new Map())  // Clear cache
  }, 60 * 60 * 1000)
  return () => clearInterval(timer)
}, [])
```

---

## Questions & Answers

**Q: Will this work offline?**
A: Translations won't work offline (need N8N). But app won't crash—just shows original text.

**Q: Can users disable translations?**
A: Yes! Check `userProfile?.autoTranslate` flag. Also per-conversation settings possible.

**Q: How much will this cost?**
A: Negligible for most apps. See cost analysis in summary doc.

**Q: Can I customize N8N response?**
A: Yes! Edit `languageN8nWorkflow.json` to change what fields are returned.

**Q: What if N8N fails?**
A: Translation fails gracefully, shows original text, no app crash.

**Q: Can I test with fake data?**
A: Yes! Mock TranslationStorageService to return test translations.

---

## Next Steps

1. **Run QA Tests**
   - Follow testing checklist above
   - Report any issues

2. **Gather Feedback**
   - User testing with beta group
   - Measure engagement with features

3. **Deploy**
   - Gradual rollout
   - Monitor performance

4. **Enhance**
   - Add features from "Future Enhancements"
   - Optimize based on user feedback

---

## Resources

- **Schema Details:** `docs/4_MULTI_LANGUAGE_TRANSLATION_SCHEMA.md`
- **Component API:** `docs/5_UI_COMPONENTS_GUIDE.md`
- **Implementation Details:** `docs/6_IMPLEMENTATION_SUMMARY.md`
- **Service Code:** `services/translateService.ts`, `services/translationStorageService.ts`
- **Component Code:** `components/Translation*.tsx`, `components/*Hint.tsx`, etc.

---

## Quick Command Reference

```bash
# Check types compile
npx tsc --noEmit

# Run tests (when available)
npm test

# Build app
npm run build

# Check Firestore rules
firebase deploy --only firestore:rules

# Monitor Firestore
firebase firestore:inspect

# Check N8N webhook
curl -X POST https://your-n8n.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"text":"hello","target_lang":"es"}'
```

---

## Support

- **Code Issues:** Check error logs in console
- **Feature Questions:** See documentation files
- **N8N Issues:** Check N8N logs
- **Firestore Issues:** Check Firebase console

---

Done! You're ready to test and deploy. Happy coding! 🚀
