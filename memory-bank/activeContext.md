# Active Context - MessageAI

## Current Work Focus

**Phase**: Memory Bank Transition
**Date**: Current session
**Status**: Moving from docs-based to memory bank workflow

## Recent Changes

- **Project Reset**: Ran `npm run reset-project` - Clean Expo project structure restored
- **Authentication Rebuilt**: All auth components and screens recreated after reset
- **Memory Bank Setup**: Transitioning from `/docs` folder to structured memory bank
- **File Migration**: Moved all documentation from `/docs` to `/memory-bank`

## Current State

### ✅ Completed

- Environment setup (Node.js, Expo CLI, Firebase CLI)
- Expo project initialization
- Firebase project setup (Auth, Firestore, Functions, Storage)
- Dependencies installed (firebase, react-native-gifted-chat, @tanstack/react-query, etc.)
- Authentication system (AuthContext, Login/Signup screens, user profiles)
- Project reset and authentication system rebuild

### 🔄 In Progress

- Memory bank structure implementation
- Documentation workflow transition
- Core messaging infrastructure setup

### ⏳ Next Steps

- Build ChatListScreen and ChatScreen
- Implement Firestore collections for conversations/messages
- Add real-time listeners and optimistic UI
- Enable Firestore offline persistence

## Active Decisions and Considerations

- **Memory Bank Structure**: Implementing structured documentation system
- **Authentication**: Firebase Auth with email/password (magic link as future enhancement)
- **State Management**: React Query for server state, considering Zustand for client state
- **UI Framework**: Expo Router for navigation, FlashList for performance
- **AI Integration**: Vercel AI SDK or LangChain for LLM integration

## Current Blockers

- None identified

## Immediate Priorities

1. Complete memory bank structure setup
2. Update memory bank rules to reflect new workflow
3. Begin core messaging infrastructure development
4. Implement basic chat screens and real-time functionality
