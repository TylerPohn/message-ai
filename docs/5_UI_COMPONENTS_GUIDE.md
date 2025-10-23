# UI Components for AI Features - Implementation Guide

## Overview

This guide documents the four new UI components that display AI-enhanced translation features (cultural context, formality detection, and idiom explanations) in the chat interface.

---

## Component Architecture

### Component Hierarchy

```
ChatScreen (app/chat/[id].tsx)
  ├─ renderMessage()
  │  └─ MessageContainer
  │     ├─ Text (original message)
  │     └─ AIFeaturesContainer
  │        ├─ TranslationDisplay
  │        │  ├─ Translation toggle button
  │        │  ├─ Translated text display
  │        │  └─ Confidence indicator
  │        ├─ CulturalContextHint
  │        │  ├─ Hint button (💡)
  │        │  └─ Details modal
  │        ├─ FormalityBadge
  │        │  ├─ Formality indicator (😊/👋/🎩)
  │        │  └─ Alternatives modal
  │        └─ IdiomExplanation
  │           ├─ Expression counter button (🎓)
  │           └─ Explanations modal
```

---

## Components

### 1. TranslationDisplay

**Location:** `components/TranslationDisplay.tsx`

**Purpose:** Fetches translations from Firestore and displays them with a toggle button.

**Props:**
```typescript
interface Props {
  messageId: string                    // Message to translate
  messageText: string                  // Original text
  targetLanguage: string               // Language code (e.g., 'es', 'fr')
  isOwnMessage: boolean                // Don't translate own messages
  onTranslationLoaded?: (translation: Translation | null) => void
}
```

**Features:**
- ✅ Lazy loads translation from `messages/{id}/translations/{lang}`
- ✅ Shows loading spinner while fetching
- ✅ Toggle button to switch between original/translated
- ✅ Displays confidence percentage
- ✅ Italics styling for translated text
- ✅ Handles errors gracefully

**User Flow:**
```
1. Component mounts
2. Calls TranslationStorageService.getTranslation()
3. If found: Display with toggle + confidence
4. If not found: Show loading state
5. User taps toggle to switch original ↔ translated
6. Calls onTranslationLoaded with translation data
   → Parent component stores in translations Map
   → Other components can access it
```

**Styling:**
- Toggle button: `translationButton` (gray background, small text)
- Display text: `displayText` (italic blue if translated)
- Confidence: Small gray text below

---

### 2. CulturalContextHint

**Location:** `components/CulturalContextHint.tsx`

**Purpose:** Shows cultural nuances and differences in the translation.

**Props:**
```typescript
interface Props {
  culturalContext: CulturalContext | undefined
}
```

**CulturalContext Structure:**
```typescript
interface CulturalContext {
  hasNuance: boolean        // Whether there's a cultural difference
  hint: string              // Brief explanation
  whyDiffers?: string       // Why literal translation wouldn't work
}
```

**Features:**
- ✅ Shows hint button only if `hasNuance` is true
- ✅ Tap to open expandable modal
- ✅ Modal shows both the hint and explanation
- ✅ Yellow highlight with 💡 icon
- ✅ Bottom tip about importance of cultural awareness

**Example:**
```
Original: "Je suis fatigué" (French)
Hint: "French uses 'fatigué' for both physical & mental tiredness"
Why Differs: "English distinguishes these meanings more clearly"
```

**Styling:**
- Button: Yellow background (`#fff3cd`) with left border
- Modal: Bottom sheet style, scrollable content
- Info tip: Yellow box with supporting message

---

### 3. FormalityBadge

**Location:** `components/FormalityBadge.tsx`

**Purpose:** Displays detected formality level and offers alternative versions.

**Props:**
```typescript
interface Props {
  formality: Formality | undefined
}
```

**Formality Structure:**
```typescript
interface Formality {
  detected: 'casual' | 'neutral' | 'formal'      // Detected level
  confidence: number                              // 0-1
  alternatives: {
    casual: string   // Casual version
    neutral: string  // Neutral version
    formal: string   // Formal version
  }
}
```

**Features:**
- ✅ Badge shows detected formality with emoji:
  - 😊 = Casual (Orange)
  - 👋 = Neutral (Light blue)
  - 🎩 = Formal (Blue)
- ✅ Shows confidence percentage
- ✅ Tap to open alternatives modal
- ✅ Modal displays all three versions
- ✅ Marks detected version as "Detected"
- ✅ Educational tip about formality importance

**Example:**
```
Message: "Hey! What's up?"
Detected: Casual (95%)

Alternatives:
😊 Casual:   "Hey! What's up?"
👋 Neutral:  "Hi, how are you?"
🎩 Formal:   "Good day, how are you doing?"
```

**Styling:**
- Badge: Compact inline button with colored border
- Modal: Bottom sheet, shows alternatives in cards
- Selected indicator: Light blue background + blue text

---

### 4. IdiomExplanation

**Location:** `components/IdiomExplanation.tsx`

**Purpose:** Detects and explains idioms and slang in the message.

**Props:**
```typescript
interface Props {
  idioms: IdiomExplanation[] | undefined
}
```

**IdiomExplanation Structure:**
```typescript
interface IdiomExplanation {
  phrase: string          // e.g., "break a leg"
  type: 'idiom' | 'slang' // Type of expression
  meaning: string         // What it actually means
  example?: string        // Where you'd use it
}
```

**Features:**
- ✅ Shows count badge: "2 expressions found" (🎓 icon)
- ✅ Tap to open modal with full explanations
- ✅ Modal shows each expression with icon (🎭 = idiom, 💬 = slang)
- ✅ Displays phrase, meaning, and optional example
- ✅ Clean formatting with dividers between items
- ✅ Educational tip about learning idioms

**Example:**
```
Message: "Break a leg! It's raining cats and dogs."

Found Expressions:
🎭 "break a leg" (Idiom)
   Means: Good luck
   Example: Often said to performers before shows

🌧️ "raining cats and dogs" (Idiom)
   Means: Raining very heavily
```

**Styling:**
- Button: Green border (`#34C759`), shows count
- Modal: Bottom sheet, items separated by dividers
- Type icons: 🎭 for idioms, 💬 for slang
- Example text: Italic gray, in indented box

---

## Integration in Chat Component

### How They Work Together

**In `app/chat/[id].tsx` renderMessage function:**

```typescript
// 1. State management
const [translations, setTranslations] = useState<Map<string, any>>(new Map())

// 2. Auto-translation checks translation map
const messagesToTranslate = updatedMessages.filter(
  (msg) =>
    msg.type === 'text' &&
    msg.senderId !== user.uid &&
    !translations.has(msg.id) &&  // ← Check cache
    !msg.isTranslating
)

// 3. Display components
{!isOwnMessage && userProfile?.preferredLanguage && !item.isTranslating && (
  <View style={styles.aiFeaturesContainer}>
    {/* Translation with callback to store in Map */}
    <TranslationDisplay
      messageId={item.id}
      messageText={item.text}
      targetLanguage={userProfile.preferredLanguage}
      isOwnMessage={isOwnMessage}
      onTranslationLoaded={(translation) => {
        if (translation) {
          setTranslations((prev) => {
            const newMap = new Map(prev)
            newMap.set(item.id, translation)
            return newMap
          })
        }
      }}
    />

    {/* Get translation and display features */}
    {(() => {
      const translation = translations.get(item.id)
      return (
        <>
          <CulturalContextHint culturalContext={translation?.culturalContext} />
          <FormalityBadge formality={translation?.formality} />
          <IdiomExplanation idioms={translation?.idioms} />
        </>
      )
    })()}
  </View>
)}
```

### Data Flow

```
Message arrives
   ↓
Auto-translation triggered
   ↓
TranslationDisplay component
   ├─ Fetches from Firestore
   ├─ Calls onTranslationLoaded callback
   ↓
Parent stores in translations Map
   ↓
CulturalContextHint reads from Map
   ├─ Shows if hasNuance = true
   ├─ Opens modal on tap
FormalityBadge reads from Map
   ├─ Shows badge with emoji
   ├─ Opens alternatives on tap
IdiomExplanation reads from Map
   ├─ Shows if idioms.length > 0
   ├─ Opens list on tap
```

---

## Styling System

### Colors Used

| Feature | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Cultural Context | Yellow | `#fff3cd` / `#ffc107` | Hint button, info box |
| Formality | Orange/Blue | `#FF9500` / `#2196F3` | Badge, modal |
| Idioms | Green | `#34C759` | Button, border |
| Translation | Blue | `#0084FF` | Toggle button, text |
| Dividers | Gray | `#eee` / `rgba(0,0,0,0.1)` | Borders, separators |

### Layout Patterns

**Button Pattern:**
```
[Icon] [Text] [Chevron]
```

**Modal Pattern:**
```
Header (Title + Close)
─────────────────────
Content (scrollable)
─────────────────────
Action Button
```

### Responsive Design

- Components use flex layout for responsiveness
- Modals are "bottom sheet" style (slide up from bottom)
- Touch targets: minimum 44px height for accessibility
- Text sizes: 11-15px for readability in bubbles

---

## User Experience Flow

### Scenario: Group Chat with Multiple Languages

**Setup:**
- Group has 3 participants: Spanish speaker, French speaker, German speaker
- All have auto-translate enabled

**What Happens:**

```
1. Spanish speaker sends: "¡Hola a todos!"

2. Message appears for all:
   ┌─────────────────────────┐
   │ ¡Hola a todos!          │  ← Original
   ├─────────────────────────┤
   │ [👁️ Show Translation]   │  ← TranslationDisplay
   │                         │
   │ [💡 Spanish greet...] │  ← CulturalContextHint (if nuance)
   │ [😊 Casual]             │  ← FormalityBadge
   │ (No idioms found)       │  ← IdiomExplanation
   └─────────────────────────┘

3. User taps [Show Translation]:
   ┌─────────────────────────┐
   │ Hello everyone!         │  ← Translated
   │ (95% confidence)        │
   ├─────────────────────────┤
   │ [Show Original]         │  ← Can toggle back
   └─────────────────────────┘

4. User taps [💡 Spanish greet...]:
   ┌─────────────────────────┐
   │ Cultural Context        │
   ├─────────────────────────┤
   │ What's Different?       │
   │ "Spanish 'Hola' can be  │
   │  formal or informal..." │
   │                         │
   │ Why the Difference?     │
   │ "English uses different │
   │  greetings for formal..." │
   └─────────────────────────┘

5. User taps [😊 Casual]:
   ┌─────────────────────────┐
   │ Formality Level         │
   ├─────────────────────────┤
   │ 😊 Casual:              │
   │ "¡Hola a todos!"        │
   │                         │
   │ 👋 Neutral:             │
   │ "Buenos días a todos"   │
   │                         │
   │ 🎩 Formal:              │
   │ "Buenos días señores"   │
   └─────────────────────────┘
```

---

## Performance Considerations

### Optimization Techniques

1. **Lazy Loading**
   - TranslationDisplay only fetches when component mounts
   - No prefetching of unused translations
   - Firestore cache handles repeated requests

2. **Memoization**
   - Parent component uses Map to avoid re-computing
   - Child components only re-render when translation data changes
   - Modals don't re-render parent on open/close

3. **Batch Loading**
   - Auto-translation processes one message at a time
   - Prevents UI freezes with multiple messages

### Memory Management

- Translations Map grows as new messages are translated
- Consider cleanup for very long conversations (1000+ messages)
- Modals are destroyed when closed (not kept in memory)

---

## Accessibility

### Touch Targets

- All buttons: minimum 44x44pt
- Text sizes: 12pt minimum for body text
- Color contrast: WCAG AA compliant

### Screen Reader Support

- Components should have `accessible={true}` props
- Modal headers clearly describe content
- Button labels are descriptive ("Show Translation", not just "➔")

### Keyboard Navigation

- Bottom sheet modals support swipe-to-close
- Back button closes modals
- Touch-friendly spacing between elements

---

## Testing Guide

### Unit Tests to Write

```typescript
// TranslationDisplay.test.tsx
describe('TranslationDisplay', () => {
  it('fetches translation from Firestore', async () => {})
  it('toggles between original and translated', () => {})
  it('displays confidence percentage', () => {})
  it('shows loading state', () => {})
  it('handles missing translation', () => {})
})

// CulturalContextHint.test.tsx
describe('CulturalContextHint', () => {
  it('shows hint only if hasNuance is true', () => {})
  it('opens modal on tap', () => {})
  it('displays hint and explanation', () => {})
})

// Similar tests for FormalityBadge, IdiomExplanation
```

### Integration Tests

```typescript
// ChatScreen.test.tsx
describe('AI Features in Chat', () => {
  it('loads all components for translated message', async () => {})
  it('updates translations map correctly', () => {})
  it('displays multiple idioms in one message', () => {})
  it('handles rapid message arrivals', () => {})
})
```

### Manual Testing Checklist

- [ ] Translation loads within 2 seconds
- [ ] Toggle switches smoothly
- [ ] Modal opens/closes without lag
- [ ] Confidence percentage displays correctly
- [ ] All 4 components work together
- [ ] Works in direct chats
- [ ] Works in group chats
- [ ] Works with auto-translate on/off
- [ ] Handles messages with no idioms
- [ ] Handles cultural context-less translations
- [ ] Touch targets are comfortable to tap

---

## Future Enhancements

### Potential Features

1. **Swipe-to-translate**
   - Swipe left/right on message to toggle translation

2. **Copy translated text**
   - Long-press translation to copy to clipboard

3. **Share idiom learnings**
   - "Add to my vocabulary" bookmark system

4. **Formality preferences**
   - "Always use formal tone with this contact"

5. **Translation history**
   - View all translations for a message

6. **Voice pronunciation**
   - Play pronunciation of translated text

---

## File Structure

```
components/
├── TranslationDisplay.tsx        (Component + styles)
├── CulturalContextHint.tsx       (Component + styles)
├── FormalityBadge.tsx            (Component + styles)
└── IdiomExplanation.tsx          (Component + styles)

services/
├── translationStorageService.ts  (Firestore operations)
├── translateService.ts           (N8N + storage integration)

app/
└── chat/
    └── [id].tsx                  (Integration + rendering)
```

---

## Summary

The four new UI components provide an immersive multilingual communication experience by:

1. **TranslationDisplay** - Core translation with toggle
2. **CulturalContextHint** - Educational context about differences
3. **FormalityBadge** - Tone awareness with alternatives
4. **IdiomExplanation** - Vocabulary learning in context

Together, they transform raw translations into a learning experience while maintaining a clean, non-intrusive UI.

