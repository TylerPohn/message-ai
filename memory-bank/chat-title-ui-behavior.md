# Chat Title UI Behavior - MessageAI

## Expected UI Behavior for Chat Titles

### Direct Messages (1:1 Chats)

**Display Logic:**

- Show the other participant's display name
- If display name is not available, show "Unknown User"
- Never show UUIDs, user IDs, or email addresses

**Examples:**

- ✅ "John Smith" (correct)
- ✅ "Unknown User" (when display name unavailable)
- ❌ "user_123abc" (incorrect - showing UUID)
- ❌ "john@example.com" (incorrect - showing email)

### Group Messages

**Display Logic:**

1. **If group has custom title:** Show the group title
2. **If no custom title:** Show participant names based on count:
   - **2 participants:** Show both names (e.g., "John, Jane")
   - **3 participants:** Show all three names (e.g., "John, Jane, Bob")
   - **4+ participants:** Show first 3 names + count (e.g., "John, Jane, Bob +2 more")

**Examples:**

- ✅ "Project Team" (custom group title)
- ✅ "John, Jane" (2 participants)
- ✅ "John, Jane, Bob" (3 participants)
- ✅ "John, Jane, Bob +2 more" (5 participants)
- ❌ "user_123, user_456" (incorrect - showing UUIDs)

### Implementation Requirements

**Data Sources:**

- Use `UserProfile.displayName` for participant names
- Use `Conversation.title` for group titles
- Use `UserCacheService` for efficient profile lookups

**Fallback Behavior:**

- If display name is missing: "Unknown User"
- If group has no title: Use participant name logic
- If no participants found: "Group Chat"

**Performance Considerations:**

- Cache user profiles to avoid repeated lookups
- Batch profile requests when possible
- Handle loading states gracefully

## Current Regression

**Issue:** Chat titles showing UUIDs instead of display names

**Root Cause:** The `getConversationTitle()` function in `app/chat/[id].tsx` is returning participant IDs instead of resolving them to display names.

**Affected Areas:**

- Individual chat screen headers
- Chat list screen (may also be affected)

**Fix Required:**

1. Update `getConversationTitle()` to resolve participant IDs to display names
2. Ensure consistent logic between chat list and individual chat screens
3. Add proper fallback handling for missing display names

## Testing Scenarios

### Direct Message Testing

- [ ] Other user has display name → Shows display name
- [ ] Other user has no display name → Shows "Unknown User"
- [ ] Other user profile not found → Shows "Unknown User"

### Group Message Testing

- [ ] Group with custom title → Shows group title
- [ ] Group with 2 participants → Shows "Name1, Name2"
- [ ] Group with 3 participants → Shows "Name1, Name2, Name3"
- [ ] Group with 4+ participants → Shows "Name1, Name2, Name3 +X more"
- [ ] Group with missing participant names → Shows "Unknown User" for missing names

### Edge Cases

- [ ] Network offline → Graceful fallback
- [ ] Profile loading → Loading state or fallback
- [ ] Malformed data → Safe fallback to "Unknown User"
