# 🧩 MessageAI Engineering Task List (React Native + Firebase)

## PR1 — Core Messaging Infrastructure (MVP, Day 1–2)

### 1. Environment Setup

- [x] Install Node.js 18+, Expo CLI, Firebase CLI
- [x] Initialize Expo project: `npx create-expo-app MessageAI`
- [x] Install dependencies: `npm i firebase react-native-gifted-chat @tanstack/react-query @tanstack/react-query-devtools ulid`
- [x] Initialize Firebase project (Auth, Firestore, Functions, Storage)
- [x] Add `.env` and `firebaseConfig.ts`
- [x] **RESET**: Ran `npm run reset-project` - Project reset to clean state (auth files deleted)
- [ ] Enable Firestore offline persistence

### 2. Authentication

- [x] Set up Firebase Auth (email/password)
- [x] Build AuthContext (`useAuth()` hook)
- [x] Create Login/Signup screens
- [x] Store user profiles in `/users/{userId}`
- [x] **REBUILT**: Authentication system recreated after reset - all auth components restored
- [x] **Add Logout Button**: Implement logout button in Messages page header with confirmation dialog

### 3. Basic Chat Structure

- [x] Build `ChatListScreen` (list all conversations)
- [x] Build `ChatScreen` (1:1 chat)
- [x] Create Firestore collections for conversations/messages
- [x] Add real-time listeners
- [x] Implement optimistic UI + timestamps
- [x] Verify message persistence after restart
- [x] Enable Firestore offline persistence
- [x] Add test data creation utility
- [x] Enable new conversation button
- [x] Fix message list display for user-sent messages
- [x] Fix message read status updates with Firestore document IDs

### 4. Real-Time Delivery

- [x] Firestore listeners for new messages
- [x] Handle offline queue/retry
- [x] Test airplane mode sync
- [x] Add delivery states (sending/sent/delivered/read)
- [x] Display queued messages in UI while offline
- [x] Merge offline queue with Firestore messages
- [x] Show queue status indicators for offline messages
- [x] Simplified status indicators (spinner → gray ✓ → green ✓)
- [x] Status only on most recent message

### 5. Presence & Read Receipts ✅ COMPLETED

- [x] Use RTDB for presence (`presence/{userId}`) - Real-time presence tracking with heartbeat system
- [x] Set `onDisconnect()` handlers - Automatic cleanup on logout and app state changes
- [x] Track `memberships/{userId}.lastReadMessageId` - Read status tracking in Firestore
- [x] Display "Seen" indicator - Enhanced read receipts with "Seen" text
- [x] Heartbeat system - 30-second heartbeat to keep presence fresh
- [x] Time-based offline detection - 30-second threshold for airplane mode handling
- [x] UI refresh system - 5-second periodic refresh to update stale presence data
- [x] Network-aware presence - Only sends heartbeats when online
- [x] Real-time updates - Presence indicators in conversation list and chat headers
- [x] Airplane mode detection - Users appear offline within 30 seconds of network loss
- [x] Memory management - Proper cleanup of presence listeners
- [x] Security rules - RTDB rules for presence data access control

### 6. Group Chats

- [x] Add group creation (2+ participants - reduced for better UX)
- [x] Multi-select UI with checkboxes and group mode toggle
- [x] Automatic group naming with comma-separated participant names
- [x] Store metadata (admin, participant data)
- [x] Display sender name/avatar in messages with conditional rendering
- [x] Enhanced message display (sender info only when sender changes)
- [x] Integration with offline queue and real-time delivery systems

### 7. Notifications

- [x] Integrate Expo push notifications
- [x] Register push tokens on profile
- [x] Implement Cloud Function to send FCM
- [x] Test foreground notifications

## PR2 — Enhanced Messaging & Media (Day 3–4)

### 1. Image Messaging ✅ COMPLETED

- [x] Add `expo-image-picker` - Camera & gallery access with permissions
- [x] Upload to Firebase Storage - Secure storage with rules deployed
- [x] Generate thumbnails - 200x200 thumbnails for chat list and bubbles
- [x] Display images + retry on failure - Full-screen viewer with offline support
- [x] Image compression - 1920x1080, 80% quality, ~1MB target
- [x] Offline queueing - Local preview and upload on reconnection
- [x] Image caching - LRU cache with 50MB limit
- [x] Upload progress - Real-time progress indicators
- [x] Chat integration - Image picker button and message rendering
- [x] Conversation list - "📷 Photo" indicators for image messages

### 2. Typing Indicators

- [x] RTDB `typing/{conversationId}/{userId}`
- [x] Set true on keypress; clear after 5s idle
- [x] Show "User is typing…" in UI
- [x] Enable typing indicators for group messages
- [x] Remove clear typing reactor functionality (not working)
- [x] Implement basic cleanup on component unmount
- [x] Create simplified documentation

### 3. Profile Enhancements

- [ ] Allow profile picture upload
- [ ] Add status message + last seen

### 4. Performance & Reliability

- [ ] Paginate chat history (50 messages per load)
- [ ] Use `FlashList` for smooth scrolling
- [ ] Test offline queue after app restart
- [ ] Verify ordering by server `createdAt`

## PR3 — AI Assistant & Smart Features (Day 5–6)

### 1. AI Infrastructure

- [ ] Create `/ai/invoke` Cloud Function
- [ ] Integrate Vercel AI SDK or LangChain
- [ ] Implement tools:
  - [ ] `getConversationWindow()`
  - [ ] `summarize()`
  - [ ] `translate()`
  - [ ] `extractActionItems()`
- [ ] Store AI requests in `ai_requests`

### 2. AI Assistant Chat

- [ ] Add “MessageAI” virtual chat
- [ ] Allow natural language prompts
- [ ] Display AI replies in chat
- [ ] Add “Summarize Chat” button

### 3. In-line AI Features

- [ ] Long-press → Translate
- [ ] Add “Summarize last 50 messages”
- [ ] Show Smart Reply chips

### 4. RAG Pipeline

- [ ] Maintain rolling summaries (every 100 messages)
- [ ] Combine last snapshot + new messages
- [ ] Limit to 4k tokens
- [ ] Cache repeated summaries

## PR4 — Final Polish, Testing & Deployment (Day 7)

### 1. Testing

- [ ] Test on 2+ devices
- [ ] Offline/online reconnection
- [ ] Background push delivery
- [ ] Image upload on poor network
- [ ] Group read receipts
- [ ] AI features functional

### 2. Security & Rules

- [ ] Write strict Firestore rules
- [ ] Restrict read/write to participants
- [ ] Validate senderId = auth.uid
- [ ] Add Storage rules (size/type)
- [ ] Test rules in emulator

### 3. Analytics & Monitoring

- [ ] Log events (sent/read/AI usage)
- [ ] Log Cloud Function errors
- [ ] Track token usage/day

### 4. Release

- [ ] Build via EAS (Android + iOS)
- [ ] Create Expo Go demo link
- [ ] Final smoke test (2 devices, 3+ users, AI <2s)

---
