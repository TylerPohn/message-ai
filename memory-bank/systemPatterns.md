# System Patterns - MessageAI

## Architecture Overview

MessageAI follows a React Native + Firebase architecture with AI integration, designed for real-time messaging with offline support and intelligent features.

## Key Technical Decisions

### Frontend Architecture

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Query for server state, Zustand for client state
- **UI Components**: Custom components with WhatsApp-style theming
- **Performance**: FlashList for smooth scrolling, optimistic UI patterns

### Backend Architecture

- **Primary**: Firebase (Auth, Firestore, Realtime Database, Cloud Functions, Storage, FCM)
- **AI Server**: Cloud Functions (Node) calling LLM APIs via Vercel AI SDK or LangChain
- **Real-time**: Firestore for messages, Realtime Database for presence/typing
- **Storage**: Firebase Storage for media with resumable uploads

### Data Flow Patterns

```
User Action → Optimistic UI → Firestore → Real-time Sync → UI Update
     ↓
Offline Queue → Retry Logic → Reconnection → Sync Resolution
```

## Design Patterns in Use

### Authentication Pattern

- **Context Provider**: AuthContext with useAuth hook
- **Route Protection**: AuthGuard component for protected routes
- **User Profiles**: Stored in `/users/{userId}` collection

### Messaging Patterns

- **Optimistic UI**: Immediate local updates with server reconciliation
- **Offline Queue**: Local storage with retry mechanisms
- **Real-time Sync**: Firestore listeners with presence indicators
- **Message Ordering**: Server timestamps for consistent ordering

### AI Integration Patterns

- **Tool-based Architecture**: Modular AI functions (summarize, translate, extract)
- **RAG Implementation**: Rolling summaries with bounded context
- **Cost Management**: Token limits and caching strategies

## Component Relationships

### Core Components

- **AuthContext**: Central authentication state management
- **AuthGuard**: Route protection wrapper
- **ChatListScreen**: Conversation list with real-time updates
- **ChatScreen**: Individual chat with message handling
- **MessageAI**: AI assistant integration

### Data Flow

```
AuthContext → AuthGuard → Protected Routes
     ↓
ChatListScreen → ChatScreen → Message Components
     ↓
Firestore ← Real-time Listeners ← UI Updates
```

## Key Implementation Patterns

### Real-time Messaging

- **Firestore Collections**: conversations, messages, memberships, contacts
- **Realtime Database**: presence, typing indicators
- **Message Status Flow**: sending → sent → delivered → read (instant progression)
- **Real-time Listener**: Processes ALL messages from Firestore for accurate status updates
- **No Optimistic Messages**: Messages appear with correct status directly from Firestore
- **Status Indicators**: Spinner (⏳) → Gray checkmark (✓) → Green checkmark (✓)
- **Offline Support**: Local queue with retry logic and AsyncStorage persistence
- **Network Monitoring**: Real-time connectivity detection with NetInfo
- **Message IDs**: Firestore document IDs used throughout for consistency
- **Read Status**: Automatic read receipt updates when messages are viewed

### Group Chat Patterns

- **Multi-Select UI**: Checkbox-based participant selection with group mode toggle
- **Automatic Naming**: Comma-separated participant names (e.g., "Alice, Bob, Charlie")
- **Sender Display**: Conditional sender name/avatar display in group messages
- **Message Threading**: Sender info only shown when sender changes between consecutive messages
- **Group Metadata**: Admin assignment and participant data storage
- **Avatar Generation**: First participant's initial for group avatars
- **Integration**: Seamless integration with offline queue and real-time delivery systems

### AI Features

- **Cloud Functions**: `/ai/invoke` endpoint with tool routing
- **RAG Pipeline**: Rolling summaries every 100 messages
- **Context Management**: 4k token limits with caching
- **User Preferences**: Stored in user profiles

### Contacts System Patterns

- **Contact Management**: Manual add/remove contacts with real-time synchronization
- **Contact Storage**: Firestore `contacts` collection with user-scoped access control
- **Contact Display**: Sectioned layout in new conversation flow (Contacts first, then All Users)
- **Contact Actions**: Star icons (☆/★) for add/remove with confirmation dialogs
- **Contact Integration**: Seamless integration with presence, messaging, and user management systems
- **Contact Security**: Users can only access their own contacts with proper Firestore rules

### Performance Optimizations

- **Pagination**: 50 messages per load with FlashList
- **Image Handling**: Thumbnails via Cloud Functions
- **State Management**: React Query for server state caching
- **Offline Persistence**: Firestore offline support

## Security Patterns

- **Firebase Rules**: Scoped read/write to participants
- **Storage Rules**: Size/type restrictions
- **Rate Limiting**: Cloud Function rate limits
- **PII Scope**: Opt-in AI features with privacy controls
