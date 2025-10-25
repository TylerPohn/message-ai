# Babel - AI-Powered Multilingual Messaging

Babel is a cross-platform messaging application that breaks down language barriers using AI-powered translation and cultural context awareness. Built with React Native and Expo, it enables real-time communication between users speaking different languages.

## Features

### Intelligent Translation System
- **AI-Powered Translation**: Real-time message translation powered by GPT-4o-mini, supporting 20+ languages including English, Spanish, French, German, Japanese, Korean, Chinese, Arabic, and more
- **Auto-Detect Source Language**: Automatically identifies the language of incoming messages
- **Cultural Context Awareness**: Provides cultural nuances and explanations when literal translations may miss important context
- **Formality Analysis**: Detects formality levels (casual/neutral/formal) and offers alternative translations for different social contexts
- **Idiom Detection**: Identifies and explains idioms and slang expressions with their meanings and usage examples
- **Terminology Glossary**: Apply custom glossary mappings for consistent translation of specific terms
- **Translation Caching**: Firestore-based caching system to avoid redundant translations and reduce API costs
- **Rate Limiting**: Built-in rate limiting with exponential backoff to manage API usage

### Advanced Messaging Features
- **Real-Time Chat**: Firebase Firestore-powered real-time messaging with delivery and read status tracking
- **Direct & Group Conversations**: Support for both one-on-one and group messaging
- **Image Sharing**: Share photos with automatic thumbnail generation and metadata tracking
- **Message Replies**: Thread conversations by replying to specific messages
- **Typing Indicators**: See when other users are composing messages with RTDB
- **Presence System**: Real-time online/offline status and last seen timestamps with RTDB
- **Read Receipts**: Track message delivery and read status for all participants
- **Offline Support**: Queue messages when offline and auto-send when connection is restored

### RAG (Retrieval-Augmented Generation) System
- **Conversation Memory**: Stores message context and conversation history in a vector database
- **Intelligent Query**: Ask questions about past conversations and receive AI-generated answers based on your message history
- **Event Extraction**: Automatically identifies and categorizes important events (milestones, updates, plans) from conversations
- **Sentiment Analysis**: Tracks emotional context of conversations
- **Multi-Language Context**: Maintains conversation context across language boundaries

### User Experience
- **Multi-Language UI**: Interface available in 16 languages with proper RTL support for Arabic and Hebrew
- **Per-User Language Settings**: Each user can set their preferred UI language and writing language
- **Auto-Translate Toggle**: Enable/disable automatic translation of received messages in settings
- **Write in Any Language**: Set a language to translate outgoing messages to prior to sending
- **Contact Management**: Add contacts manually or automatically from conversations
- **User Profiles**: Customizable profiles with photos, status messages, and language preferences
- **Haptic Feedback**: Tactile feedback for important interactions
- **Optimized Performance**: Flash List for efficient rendering of large message histories

### Technical Features
- **Firebase Authentication**: Secure email/password authentication with user session management
- **Cloud Storage**: Firebase Storage for image uploads with automatic compression
- **Network Awareness**: Detects connectivity changes and adapts behavior accordingly
- **Background Sync**: Syncs messages and updates when app returns to foreground
- **React Query Integration**: Efficient data fetching, caching, and synchronization
- **Type Safety**: Full TypeScript implementation for reliability
- **Cross-Platform**: Runs on iOS, Android, and web with native performance

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. If having issues with network firewall

   ```bash
   npx expo start --tunnel
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
