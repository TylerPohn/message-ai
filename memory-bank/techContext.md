# Tech Context - MessageAI

## Technologies Used

### Frontend Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tooling
- **TypeScript**: Type-safe JavaScript
- **Expo Router**: File-based navigation
- **React Query**: Server state management
- **Zustand**: Client state management (planned)

### Backend Stack

- **Firebase Auth**: User authentication
- **Firestore**: NoSQL database for messages and user data
- **Realtime Database**: Presence and typing indicators
- **Cloud Functions**: Serverless backend logic
- **Cloud Storage**: Media file storage
- **FCM**: Push notifications

### AI Stack

- **Vercel AI SDK**: LLM integration framework
- **LangChain**: Alternative AI framework
- **OpenAI API**: LLM provider
- **Cloud Functions**: AI endpoint hosting

## Development Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- Firebase CLI
- iOS Simulator / Android Emulator

### Installation

```bash
# Project setup
npx create-expo-app MessageAI
cd MessageAI

# Dependencies
npm i firebase react-native-gifted-chat @tanstack/react-query @tanstack/react-query-devtools ulid

# Firebase setup
firebase init
```

### Environment Configuration

- **Firebase Config**: `firebaseConfig.ts`
- **Environment Variables**: `.env` file for API keys
- **Expo Configuration**: `app.json` for app settings

## Technical Constraints

### Performance Requirements

- **Optimistic Send**: <100ms response time
- **Server Acknowledgment**: <1s response time
- **Message Delivery**: No message loss
- **Offline Sync**: Reliable reconnection

### Platform Constraints

- **iOS**: Push notification requirements
- **Android**: FCM integration
- **Expo Go**: Development environment limitations
- **EAS Build**: Production deployment requirements

### Cost Constraints

- **Firestore**: Optimized queries to minimize reads
- **LLM Tokens**: Capped usage with monitoring
- **Storage**: Image compression and thumbnails
- **Functions**: Rate limiting and timeout management

## Dependencies

### Core Dependencies

```json
{
  "firebase": "^10.x",
  "react-native-gifted-chat": "^2.x",
  "@tanstack/react-query": "^5.x",
  "@tanstack/react-query-devtools": "^5.x",
  "ulid": "^2.x"
}
```

### Development Dependencies

```json
{
  "expo": "~50.x",
  "typescript": "^5.x",
  "eslint": "^8.x"
}
```

### Firebase Services

- **Authentication**: Email/password, magic links
- **Firestore**: Messages, conversations, users
- **Realtime Database**: Presence, typing
- **Cloud Functions**: AI endpoints, notifications
- **Cloud Storage**: Media files
- **FCM**: Push notifications

### Message ID System

**Firestore Document IDs**: All messages use Firestore's auto-generated document IDs as the authoritative identifier.

- **Creation**: Messages are created without custom IDs, letting Firestore generate document IDs
- **Retrieval**: Message listeners map `doc.id` as the authoritative ID, overriding any stored id fields
- **Updates**: `updateMessageStatus()` uses Firestore document references for status updates
- **Read Status**: Messages are marked as "read" using their Firestore document ID

### Message Status Flow

```
sending → sent → delivered → read
```

- **sending**: Message is being sent (optimistic UI)
- **sent**: Message successfully sent to server
- **delivered**: Message delivered to recipient's device
- **read**: Message has been read by recipient

## Development Workflow

### Local Development

1. Start Expo development server: `npx expo start`
2. Run Firebase emulators: `firebase emulators:start`
3. Test on iOS Simulator or Android Emulator
4. Use Expo Go for quick testing

### Testing Strategy

- **Unit Tests**: Component and hook testing
- **Integration Tests**: Firebase integration
- **E2E Tests**: Full user flows
- **Performance Tests**: Message load testing

### Deployment

- **Development**: Expo Go for testing
- **Staging**: EAS Build for internal testing
- **Production**: EAS Build with app store deployment

## Known Technical Challenges

- **Firestore Cost Management**: Optimized queries and caching
- **Offline Synchronization**: Complex conflict resolution
- **Push Notifications**: iOS/Android differences
- **AI Token Management**: Cost control and rate limiting
- **Real-time Performance**: Large group message handling
