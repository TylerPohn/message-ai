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

- [ ] Firestore listeners for new messages
- [ ] Handle offline queue/retry
- [ ] Test airplane mode sync
- [ ] Add delivery states (sending/sent/delivered)

### 4. Real-Time Delivery

- [ ] Firestore listeners for new messages
- [ ] Handle offline queue/retry
- [ ] Test airplane mode sync
- [ ] Add delivery states (sending/sent/delivered)

### 5. Presence & Read Receipts

- [ ] Use RTDB for presence (`presence/{userId}`)
- [ ] Set `onDisconnect()` handlers
- [ ] Track `memberships/{userId}.lastReadMessageId`
- [ ] Display “Seen” indicator

### 6. Group Chats

- [ ] Add group creation (3+ participants)
- [ ] Store metadata (title, photo, admin)
- [ ] Display sender name/avatar in messages

### 7. Notifications

- [ ] Integrate Expo push notifications
- [ ] Register push tokens on profile
- [ ] Implement Cloud Function to send FCM
- [ ] Test foreground notifications

## PR2 — Enhanced Messaging & Media (Day 3–4)

### 1. Image Messaging

- [ ] Add `expo-image-picker`
- [ ] Upload to Firebase Storage
- [ ] Generate thumbnails via Cloud Function
- [ ] Display images + retry on failure

### 2. Typing Indicators

- [ ] RTDB `typing/{conversationId}/{userId}`
- [ ] Set true on keypress; clear after 5s idle
- [ ] Show “User is typing…” in UI

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
