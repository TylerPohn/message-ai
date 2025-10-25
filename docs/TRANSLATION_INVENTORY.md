# Babel - Hardcoded User-Facing Text Inventory

## Executive Summary
This document catalogs all hardcoded user-facing text strings in the Babel application that require translation. The inventory includes 126+ unique translatable strings organized by functional area and screen location.

---

## 1. AUTHENTICATION SCREENS

### 1.1 Login Screen (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/auth/login.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Loading..." | Loading indicator | 26 | Shown while auth state loads |
| "Welcome Back" | Title | 71 | Main heading |
| "Sign in to your Babel account" | Subtitle | 73 | Login description |
| "Enter your email" | Placeholder | 78 | Email input field |
| "Enter your password" | Placeholder | 91 | Password input field |
| "Signing In..." | Button text (dynamic) | 106 | Shown while processing |
| "Sign In" | Button text | 106 | Primary action button |
| "Error" | Alert title | 29 | Validation error |
| "Please fill in all fields" | Alert message | 29 | Empty field validation |
| "Login Failed" | Alert title | 39 | Login failure |
| "An error occurred during login" | Alert message | 40 | Generic error fallback |
| "Dev Login Failed" | Alert title | 56 | Dev mode login failure |
| "An error occurred during dev login" | Alert message | 57 | Dev mode error fallback |
| "Don't have an account?" | Link text | 111 | Sign up prompt |
| "Sign Up" | Link text | 114 | Sign up link |
| "Development Mode" | Section title | 122 | Dev mode header |
| "Quick login for testing" | Section subtitle | 123 | Dev mode description |
| "Signing In..." | Dev button text (dynamic) | 135 | Dev login loading |
| "Login as Tyler" | Dev button text | 135 | Dev test account 1 |
| "Login as Moblin" | Dev button text | 151 | Dev test account 2 |
| "Login as Daihorusu" | Dev button text | 165 | Dev test account 3 |

### 1.2 Signup Screen (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/auth/signup.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Create Account" | Title | 61 | Main heading |
| "Join Babel and start chatting" | Subtitle | 63 | Signup description |
| "Display Name" | Form label | 66 | User display name field |
| "Enter your display name" | Placeholder | 69 | Display name input |
| "Email" | Form label | 78 | Email field |
| "Enter your email" | Placeholder | 81 | Email input |
| "Password" | Form label | 92 | Password field |
| "Enter your password (min 6 characters)" | Placeholder | 95 | Password input with hint |
| "Confirm Password" | Form label | 105 | Confirm password field |
| "Confirm your password" | Placeholder | 108 | Confirm password input |
| "Error" | Alert title | 26, 31, 36 | Validation errors |
| "Please fill in all fields" | Alert message | 26 | Empty field validation |
| "Passwords do not match" | Alert message | 31 | Password mismatch |
| "Password must be at least 6 characters" | Alert message | 36 | Password length validation |
| "Creating Account..." | Button text (dynamic) | 123 | Signup processing |
| "Create Account" | Button text | 123 | Primary action button |
| "Signup Failed" | Alert title | 46 | Signup failure |
| "An error occurred during signup" | Alert message | 47 | Generic signup error |
| "Already have an account?" | Link text | 128 | Login prompt |
| "Sign In" | Link text | 131 | Login link |

---

## 2. MAIN NAVIGATION & TABS

### 2.1 Tab Navigation (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/(tabs)/_layout.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Chats" | Tab title | 26 | Chat list tab |
| "Contacts" | Tab title | 39 | Contacts tab |
| "Settings" | Tab title | 52 | Settings tab |

---

## 3. CHAT LIST SCREEN

### 3.1 Chats/Messages Screen (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/(tabs)/index.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Loading conversations..." | Loading text | 538 | Initial load indicator |
| "Babel" | Header title | 547 | App name in header |
| "Camera" | Alert title | 570 | Camera feature placeholder |
| "Camera feature coming soon!" | Alert message | 570 | Coming soon message |
| "No conversations yet" | Empty state title | 592 | When no chats exist |
| "Use the \"+\" button to start new conversations" | Empty state subtitle | 593-594 | Empty state instruction |
| "{count} message(s) queued" | Queue status | 560-562 | Offline queue indicator (dynamic) |
| "📷 Photo" | Message preview (image) | 370, 372 | Image message indicator |
| "Online" | Status indicator | 394 | User online status |
| "Last seen {time}" | Status indicator | 396-398 | User last seen (dynamic) |
| "No messages yet" | Conversation subtitle | 382 | Empty conversation |
| "Group Chat" | Default group title | 341 | When group name unavailable |
| "Unknown" | Fallback user name | 337, 356, 362 | When user data unavailable |
| "Unknown User" | Fallback user name | 359, 362 | When direct chat user unavailable |

---

## 4. SETTINGS SCREEN

### 4.1 Settings Screen (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/(tabs)/settings.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Settings" | Header title | 256 | Settings page title |
| "Search" | Alert title | 260 | Search feature placeholder |
| "Search feature coming soon!" | Alert message | 260 | Coming soon message |
| "Account" | Settings item title | 198 | Account settings section |
| "Security notifications, change number" | Settings subtitle | 199 | Account description |
| "Account" | Alert title (settings placeholder) | 201 | Settings section title |
| "Account settings coming soon!" | Alert message | 201 | Placeholder message |
| "Privacy" | Settings item title | 205 | Privacy settings section |
| "Block contacts, disappearing messages" | Settings subtitle | 206 | Privacy description |
| "Privacy" | Alert title (settings placeholder) | 208 | Settings section title |
| "Privacy settings coming soon!" | Alert message | 208 | Placeholder message |
| "Avatar" | Settings item title | 212 | Avatar settings section |
| "Create, edit, profile photo" | Settings subtitle | 213 | Avatar description |
| "Language" | Settings item title | 219 | Language settings section |
| "Language: {code}" | Settings subtitle (dynamic) | 221 | Current language display |
| "Language preferences" | Settings subtitle | 222 | Default language description |
| "Notifications" | Settings item title | 228 | Notifications settings section |
| "Message, group & call tones" | Settings subtitle | 229 | Notifications description |
| "Notifications" | Alert title (settings placeholder) | 232 | Settings section title |
| "Notification settings coming soon!" | Alert message | 232 | Placeholder message |
| "Sign Out" | Logout confirmation title | 53 | Logout dialog title |
| "Are you sure you want to sign out, {name}?" | Logout confirmation (dynamic) | 54 | Logout confirmation message |
| "Cancel" | Button text | 56 | Cancel logout |
| "Sign Out" | Button text | 58 | Confirm logout |
| "Error" | Alert title | 65 | Logout error |
| "Failed to sign out. Please try again." | Alert message | 65 | Logout error message |
| "Edit Profile" | Modal title | 342 | Profile edit dialog |
| "Error" | Alert title | 81, 95 | Profile update errors |
| "Display name is required" | Alert message | 81 | Display name validation |
| "Success" | Alert title | 92 | Profile update success |
| "Profile updated successfully!" | Alert message | 92 | Success message |
| "Failed to update profile. Please try again." | Alert message | 95 | Profile update failure |
| "Display Name" | Form label | 361 | Display name field |
| "Enter your name" | Placeholder | 366 | Display name input |
| "Status" | Form label | 372 | Status field |
| "What's on your mind?" | Placeholder | 377 | Status input |
| "{count}/140" | Character counter | 382 | Status character limit indicator |
| "Saving..." | Button text (dynamic) | 397 | Profile save loading |
| "Save" | Button text | 397 | Confirm profile changes |
| "Cancel" | Button text | 406 | Cancel profile edit |
| "Select Avatar" | Action sheet title | 113 | Avatar selection title |
| "Take Photo" | Action sheet option | 105, 125 | Camera option |
| "Choose from Library" | Action sheet option | 105, 126 | Gallery option |
| "Select Avatar" | Alert title (Android) | 124 | Android avatar selection |
| "Choose how you want to set your avatar" | Alert message (Android) | 124 | Android avatar instructions |
| "Error" | Alert title | 145, 159, 188 | Image upload errors |
| "Failed to take photo. Please try again." | Alert message | 145 | Photo capture error |
| "Failed to select image. Please try again." | Alert message | 159 | Image selection error |
| "Failed to upload avatar. Please try again." | Alert message | 188 | Avatar upload error |
| "Success" | Alert title | 185 | Avatar upload success |
| "Avatar updated successfully!" | Alert message | 185 | Avatar success message |
| "Hey there! I am using Babel" | Default status | 300 | Default user status text |
| "Unknown User" | Profile name fallback | 297 | When user name unavailable |

---

## 5. CONTACTS SCREEN

### 5.1 Contacts Screen (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/(tabs)/contacts.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Contacts" | Header title | 377 | Contacts page title |
| "Search" | Alert title | 381 | Search feature placeholder |
| "Search feature coming soon!" | Alert message | 381 | Coming soon message |
| "Menu" | Alert title | 387 | Menu feature placeholder |
| "Menu feature coming soon!" | Alert message | 387 | Coming soon message |
| "Contacts" | Tab label | 409 | Contacts tab name |
| "Status" | Tab label | 425 | Status tab name |
| "Search contacts..." | Placeholder | 436 | Search input |
| "Loading contacts..." | Loading text | 369 | Initial load indicator |
| "No contacts yet" | Empty state (no contacts) | 448 | When contact list empty |
| "Add contacts from the new conversation screen" | Empty state subtitle | 453 | Empty state instruction |
| "No contacts found" | Empty state (search) | 448 | When search returns no results |
| "Try a different search term" | Empty state subtitle | 452 | Search help text |
| "Remove Contact" | Confirmation title | 246 | Remove contact dialog |
| "Remove {name} from your contacts?" | Confirmation message (dynamic) | 247 | Contact removal confirmation |
| "Cancel" | Button text | 249 | Cancel removal |
| "Remove" | Button text | 251 | Confirm removal |
| "Success" | Alert title | 256 | Contact action success |
| "Contact removed" | Alert message | 256 | Removal success message |
| "{name} added to contacts" | Alert message (dynamic) | 174 | Add contact success |
| "{name} removed from contacts" | Alert message (dynamic) | 187 | Remove contact success |
| "Error" | Alert title | 238, 259 | Contact action errors |
| "Failed to start conversation" | Alert message | 238 | Conversation creation error |
| "Failed to remove contact" | Alert message | 259 | Remove contact failure |
| "Failed to add contact" | Alert message | 177 | Add contact failure |
| "Status" | Section title | 468 | Status section heading |
| "Recent Updates" | Section title | 485 | Recent status updates section |
| "No recent updates" | Empty state | 495 | When no status updates |
| "When your contacts share status updates, they will appear here" | Empty state subtitle | 496-498 | Status empty state instruction |
| "Add Status" | Modal title | 523 | Status creation dialog |
| "Share what is on your mind" | Modal description | 541-542 | Status instruction text |
| "What's happening?" | Status input placeholder | 550 | Status text input |
| "{count}/140" | Character counter | 559-560 | Status character limit |
| "Post" | Button text | 578 | Post status button |
| "Cancel" | Button text | 587 | Cancel status creation |
| "Success" | Alert title | 156 | Status update success |
| "Status updated successfully!" | Alert message | 156 | Status success message |
| "Error" | Alert title | 159 | Status update error |
| "Failed to update status. Please try again." | Alert message | 159 | Status update failure |
| "Add status" | Status display (no status) | 282 | When user has no status |
| "Tap to edit" | Status instruction (has status) | 285 | Existing status instruction |
| "Tap to add status" | Status instruction (no status) | 286 | New status instruction |
| "Online" | Online indicator | 204 | Contact is online |
| "{time}m ago" | Time indicator | 194 | Minutes ago format (dynamic) |
| "{time}h ago" | Time indicator | 195 | Hours ago format (dynamic) |
| "{time}d ago" | Time indicator | 196 | Days ago format (dynamic) |

---

## 6. NEW CONVERSATION SCREEN

### 6.1 New Conversation/Group Creation (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/chat/new.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "New Message" | Header title (direct) | 362 | New direct message title |
| "New Group" | Header title (group) | 362 | New group chat title |
| "Cancel" | Back button text | 359 | Close screen button |
| "Direct" | Mode toggle | 381 | Direct message mode |
| "Group" | Mode toggle | 394 | Group chat mode |
| "{count} selected" | Selection counter (dynamic) | 402 | Number of selected users |
| "Create Group" | Button text | 409 | Create group button |
| "Search users..." | Search placeholder | 418 | User search input |
| "Loading users..." | Loading text | 347 | Initial load indicator |
| "Error" | Alert title | 67, 107, 157, 175, 190, 196, 201 | Various error scenarios |
| "Failed to load users" | Alert message | 67 | User list load failure |
| "User not authenticated" | Alert message | 107, 201 | User auth failure |
| "Please select at least 2 people to create a group" | Alert message | 196 | Group size validation |
| "Failed to create conversation: {error}" | Alert message (dynamic) | 158-161 | Conversation creation error |
| "Failed to create group: {error}" | Alert message (dynamic) | 232-235 | Group creation error |
| "Success" | Alert title | 174, 187 | Contact action success |
| "{name} added to contacts" | Alert message (dynamic) | 174 | Add contact success |
| "{name} removed from contacts" | Alert message (dynamic) | 187 | Remove contact success |
| "Contacts ({count})" | Section header (dynamic) | 430 | Contacts list section |
| "All Users ({count})" | Section header (dynamic) | 444 | All users list section |
| "No users found" | Empty state (search) | 449 | Search no results |
| "No users available" | Empty state (no users) | 449 | No users exist |
| "Try a different search term" | Empty state subtitle | 453 | Search help |
| "Other users need to sign up to start conversations" | Empty state subtitle | 454 | No users help text |
| "Online" | Status indicator | 251 | User online status (dynamic) |
| "{time}m ago" | Time indicator | 252 | Minutes ago format |
| "{time}h ago" | Time indicator | 253 | Hours ago format |
| "{time}d ago" | Time indicator | 254 | Days ago format |

---

## 7. CHAT SCREEN

### 7.1 Chat Screen (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/chat/[id].tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Loading messages..." | Loading text | 988 | Initial message load |
| "Loading more messages..." | Loading indicator | 1066 | Pagination loading |
| "Chat" | Default title | 875, 908 | Fallback conversation title |
| "Group Chat" | Group default title | 889 | Default group conversation name |
| "Unknown User" | Unknown participant | 902, 905 | Unknown user fallback |
| "Online" | Presence status | 1017 | User is online |
| "Last seen {time}" | Presence status (dynamic) | 1018-1020 | Last seen format |
| "Select Image" | Action sheet title | 470 | Image selection title |
| "Camera" | Action option | 472 | Camera selection |
| "Photo Library" | Action option | 473 | Photo library selection |
| "Cancel" | Cancel button | 471 | Cancel image selection |
| "Error" | Alert title | 486, 498, 534 | Various error scenarios |
| "Failed to take photo. Please try again." | Alert message | 486 | Photo capture error |
| "Failed to select image. Please try again." | Alert message | 498 | Image selection error |
| "Failed to send image. Please try again." | Alert message | 534 | Image send error |
| "Type a message..." | Message input placeholder | 1141 | Text input placeholder |
| "Send" | Send button text | 1155 | Send message button |
| "..." | Send button loading | 1155 | Sending indicator |
| "Cancel" | Image preview cancel | 1085 | Cancel image preview |
| "Uploading {progress}%" | Image upload button (dynamic) | 1097 | Upload progress indicator |
| "Send" | Image send button | 1098 | Send image button |
| "Tap to show translation" | Translation toggle hint | 824 | Switch to original text |
| "Translated from {lang}" | Translation info (dynamic) | 825 | Translation source language |
| "Translating..." | Translation loading | 835 | Translation in progress |
| "Seen" | Message status | 867 | Message read indicator |

---

## 8. LANGUAGE SETTINGS SCREEN

### 8.1 Language Settings (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/settings/language.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Language" | Header title | 112 | Language settings title |
| "Preferred Language" | Section title | 119 | Language selection section |
| "Select Language" | Modal title | 176 | Language picker title |
| "Auto-Translate Messages" | Toggle title | 139 | Auto-translate setting |
| "Automatically translate incoming messages to your preferred language" | Toggle subtitle | 140-142 | Auto-translate description |
| "Saving..." | Button text (loading) | 161 | Save button loading state |
| "Save Preferences" | Button text | 161 | Save button |
| "Success" | Alert title | 64 | Preferences saved success |
| "Language preferences saved successfully!" | Alert message | 64 | Success message |
| "Error" | Alert title | 68 | Preferences save error |
| "Failed to save preferences. Please try again." | Alert message | 68 | Error message |

---

## 9. INITIALIZATION & LOADING SCREENS

### 9.1 Splash/Index Screen (`/Users/tyler/Desktop/Gauntlet/MessageAI/app/index.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "Loading..." | Loading text | 26 | Auth initialization |

---

## 10. NOTIFICATIONS (IN-APP BANNER)

### 10.1 In-App Banner Component (`/Users/tyler/Desktop/Gauntlet/MessageAI/components/InAppBanner.tsx`)

| String | Type | Line(s) | Notes |
|--------|------|---------|-------|
| "📷 Photo" | Image message indicator | 103 | Image message display |

---

## SUMMARY BY CATEGORY

### Loading & Initialization (7 strings)
- "Loading..." (3x)
- "Loading conversations..."
- "Loading contacts..."
- "Loading users..."
- "Loading more messages..."

### Error Messages (20+ strings)
- "Error" titles (generic)
- "Please fill in all fields"
- "Passwords do not match"
- "Failed to..." messages
- Various validation messages

### Button & Action Text (25+ strings)
- "Sign In" / "Sign Up"
- "Create Account"
- "Sign Out"
- "Save" / "Cancel"
- "Send" / "Post"
- Mode toggles: "Direct" / "Group"

### Titles & Headers (15+ strings)
- "Settings", "Contacts", "Chats", etc.
- "Edit Profile", "Add Status", "Select Language"
- "Sign In", "Create Account", "New Message"

### Form Labels & Placeholders (20+ strings)
- "Display Name", "Email", "Password"
- "Enter your email", "Enter your password"
- Search placeholders
- Status/message input placeholders

### Status & Indicators (15+ strings)
- "Online", "Offline"
- "Last seen {time}"
- "Typing..." (generated)
- "Seen", "Delivered", "Sent"

### Empty States & Help Text (15+ strings)
- "No conversations yet"
- "No contacts found"
- "No messages yet"
- Instructional subtitles

### Tab Navigation (3 strings)
- "Chats"
- "Contacts"
- "Settings"

### Settings Items (8+ strings)
- "Account", "Privacy", "Avatar", "Language", "Notifications"
- Descriptions for each setting

### Feature Placeholders (5+ strings)
- "Coming soon!" messages
- Camera, Search, Menu, etc.

---

## TRANSLATION CONSIDERATIONS

### Dynamic Content Requiring Parameters
- Error messages with variable data
- Time-based indicators: "Last seen {time}", "Online", etc.
- Status messages with user names
- Character counters: "{count}/140"
- User counts: "Contacts ({count})", "All Users ({count})"
- Time calculations: "{time}m ago", "{time}h ago"

### Gender & Pluralization
- Message queue: "{count} message(s) queued" - needs plural handling
- User selection: "{count} selected" - needs plural handling

### Context-Specific Translations
- "Cancel" appears in multiple contexts (logout, image, status)
- "Error" appears as both title and context
- "Remove Contact" dialog - needs to mention specific contact name dynamically

### Brand & Technical Terms NOT to Translate
- "MessageAI" (app name)
- "Firestore" (database, only in comments/logs)
- "Expo" (framework, only in dependencies)
- Language codes (en, es, fr, etc.)

### RTL Language Considerations
- All layout already uses flex alignment suitable for RTL
- Text direction should be handled by React Native's RTL support
- Directional indicators like arrows (←, ›, ✓) may need adjustment

### Character Limits
- Status field: 140 characters maximum
- Status display should accommodate translations
- Message preview truncation: 50 characters

### Emoji & Symbols Used
- "📷 Photo" - image indicator (consider localization)
- "✓" - checkmark for selections
- "⏳" - loading indicator
- Status icons: "Online"/"Offline" (text-based in some locations)
- "←" - back button (might use icon instead)
- "›" - navigation arrow

---

## FILES TO TRANSLATE

### Primary Application Files (26 files)
1. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/index.tsx` - Splash screen
2. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/auth/login.tsx` - Login
3. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/auth/signup.tsx` - Signup
4. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/(tabs)/index.tsx` - Chat list
5. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/(tabs)/contacts.tsx` - Contacts
6. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/(tabs)/settings.tsx` - Settings
7. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/(tabs)/_layout.tsx` - Tab navigation
8. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/chat/[id].tsx` - Chat screen
9. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/chat/new.tsx` - New conversation
10. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/settings/language.tsx` - Language settings
11. `/Users/tyler/Desktop/Gauntlet/MessageAI/app/auth/_layout.tsx` - Auth layout (minimal)
12. `/Users/tyler/Desktop/Gauntlet/MessageAI/components/InAppBanner.tsx` - Notifications

### Secondary Files (Services - Check for user-visible strings)
- `/Users/tyler/Desktop/Gauntlet/MessageAI/services/messagingService.ts` - May contain error messages
- `/Users/tyler/Desktop/Gauntlet/MessageAI/services/notificationService.ts` - May contain notification text
- `/Users/tyler/Desktop/Gauntlet/MessageAI/services/typingService.ts` - "is typing" messages
- `/Users/tyler/Desktop/Gauntlet/MessageAI/services/networkService.ts` - Network status messages
- `/Users/tyler/Desktop/Gauntlet/MessageAI/services/translateService.ts` - Translation status

---

## RECOMMENDED TRANSLATION APPROACH

### 1. **Extraction Strategy**
- Use i18n library (recommended: `i18next`, `react-i18next`, or `react-native-localization`)
- Create translation keys for all hardcoded strings
- Maintain english.json as source file

### 2. **Key Naming Convention**
```
screens.login.title = "Welcome Back"
screens.login.subtitle = "Sign in to your MessageAI account"
buttons.signIn = "Sign In"
errors.emptyFields = "Please fill in all fields"
labels.email = "Email"
placeholders.email = "Enter your email"
common.loading = "Loading..."
common.error = "Error"
```

### 3. **Priority Tiers**

**Tier 1 (Critical - User Actions)**
- Button labels (Sign In, Sign Up, Send, Save, Cancel)
- Form labels and placeholders
- Error messages
- Navigation titles
- Modal titles

**Tier 2 (Important - User Feedback)**
- Loading states
- Success messages
- Status indicators
- Empty states
- Help text and descriptions

**Tier 3 (Nice-to-Have - Polish)**
- Development mode buttons
- Feature placeholders ("Coming soon!")
- Settings descriptions
- Advanced feature text

### 4. **Testing Recommendations**
- Test with long translations (German, Spanish)
- Test with short translations (Chinese)
- Test with RTL languages (Arabic, Hebrew)
- Verify dynamic content still fits
- Check character counters with multi-byte characters

---

## TOTAL TRANSLATION STRINGS

- **Unique translatable strings: 126+**
- **Alerts/Modals: 40+**
- **Form fields/Placeholders: 25+**
- **Button text: 20+**
- **Status/Indicators: 20+**
- **Empty states: 12+**
- **Tab navigation: 3**
- **Dynamic content patterns: 15+**

---

## NOTES FOR TRANSLATORS

1. Maintain consistency with messaging app terminology
2. Keep button text concise (avoid unnecessary articles)
3. Preserve technical terms like "Firestore", "Cloud Functions"
4. Status messages should be professional and friendly
5. Error messages should be helpful, not blame-oriented
6. Consider cultural differences in emoji usage
7. Phone/date formats should respect regional settings

---

**Last Updated:** October 22, 2025
**Repository:** MessageAI
**Path:** /Users/tyler/Desktop/Gauntlet/MessageAI
