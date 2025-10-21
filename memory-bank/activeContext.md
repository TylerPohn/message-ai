# Active Context - MessageAI

## Current Work Focus

**Phase**: Image Messaging Implementation - COMPLETED & TESTED
**Date**: Current session
**Status**: PR2 Item 1 - Image messaging system fully implemented and working with camera/gallery access, compression, thumbnails, full-screen viewing, offline support, secure storage, and all issues resolved

## Recent Changes

- **Project Reset**: Ran `npm run reset-project` - Clean Expo project structure restored
- **Authentication Rebuilt**: All auth components and screens recreated after reset
- **Memory Bank Setup**: Transitioning from `/docs` folder to structured memory bank
- **File Migration**: Moved all documentation from `/docs` to `/memory-bank`
- **Basic Chat Structure**: Implemented complete messaging infrastructure
  - Firestore offline persistence enabled with manual control functions
  - ChatListScreen and ChatScreen built with full functionality
  - Real-time listeners implemented for conversations and messages
  - Optimistic UI with message status indicators (sending/sent/delivered/read)
  - Test conversation creation utility with "Test" button in ChatListScreen
  - Complete data models and service layer (MessagingService)
  - Message persistence verified and working
- **Routing Fix**: Fixed authentication redirect issue - login and signup now properly redirect to `/chat/` instead of non-existent `/(tabs)` route
- **Message Display Fixes**: Fixed conversation list display issues
  - Created UserCacheService for efficient user profile caching
  - Fixed conversation titles to show display names instead of UIDs
  - Added read status tracking using membership.lastReadMessageId
  - Implemented bold text display for unread messages
  - Added getUserMembership method to MessagingService
- **Read Status Implementation**: Added automatic message read status updates
  - Messages now marked as "read" when user opens conversation
  - Added debounced read status updates to prevent excessive Firestore writes
  - Implemented batch updates for multiple unread messages
  - Only marks messages as read if current user didn't send them
- **Message List Display Fix**: Fixed real-time listener for conversation updates
  - Updated listenToUserConversations to watch conversations collection directly
  - Now properly shows user-sent messages in conversation list instead of "No messages yet"
  - Implemented proper cleanup for nested listeners to prevent memory leaks
- **Message Read Status Fix**: Removed custom ID generation and standardized on Firestore document IDs
  - Removed generateMessageId() function and custom ID logic from sendMessage()
  - Updated message listeners to use Firestore document IDs as authoritative IDs
  - Fixed updateMessageStatus() to work with Firestore document references
  - Messages now properly marked as "read" when viewed by recipients
- **Real-Time Delivery System (PR1 Item 4)**: Implemented comprehensive offline support and delivery tracking
  - Added OfflineQueueService with AsyncStorage persistence for failed messages
  - Implemented NetworkService with real-time connectivity monitoring
  - Enhanced MessagingService with offline detection and retry logic
  - Added delivered status tracking (sent → delivered → read)
  - Updated UI components with network status indicators and queue information
  - Implemented exponential backoff retry mechanism (1s, 2s, 4s, 8s, 16s)
  - Added network state display in chat headers and conversation list
  - **Fixed offline message visibility**: Queued messages now display in UI with queue indicators
  - Merged offline queue with Firestore messages for seamless user experience
  - **Simplified status indicators**: Spinner (⏳) → Gray checkmark (✓) → Green checkmark (✓)
  - **Status on most recent only**: Clean UI showing status only on latest message
  - **Color coding**: Orange for sending/queued, Gray for delivered, Green for read
  - **Optimistic UI**: Messages appear immediately when sent offline with spinner indicator
  - **Duplicate Prevention**: Enhanced deduplication logic prevents message duplicates on reconnection
  - **Smart Cleanup**: Optimistic messages automatically removed when Firestore messages arrive
- **Android Keyboard Fix**: Resolved Android keyboard covering message input and send button
  - Updated app.json with proper Android keyboard configuration (softwareKeyboardLayoutMode: "pan", windowSoftInputMode: "adjustResize")
  - Modified KeyboardAvoidingView behavior from "height" to "padding" for better Android compatibility
  - Added SafeAreaView wrapper for proper spacing from system UI
  - Enhanced input container styling with minHeight and improved textInput properties
  - Added keyboardVerticalOffset for fine-tuned positioning
- **iOS Keyboard Fix**: Resolved iOS keyboard covering message input and send button
  - Added keyboard event listeners (keyboardWillShow/keyboardWillHide) for dynamic keyboard height tracking
  - Improved KeyboardAvoidingView with keyboardVerticalOffset of 90px for iOS to account for navigation bar
  - Added automatic scroll-to-bottom when keyboard appears to keep latest messages visible
  - Enhanced input container with keyboard-specific styling (reduced padding when keyboard is active)
  - Added proper cleanup for keyboard listeners to prevent memory leaks
- **Presence & Read Receipts System (PR1 Item 5)**: Implemented comprehensive presence tracking and enhanced read receipt UI
  - Created PresenceService with Firebase Realtime Database integration for real-time presence tracking
  - Added onDisconnect handlers to automatically mark users offline when connection drops
  - Integrated presence tracking in AuthContext with app state listeners (foreground/background)
  - Enhanced conversation list with presence indicators (green dot for online users, last seen timestamps)
  - Added real-time presence status display in chat screen headers
  - Implemented "Seen" text indicator below messages when read by recipients
  - Updated UserProfile type to include presence data structure
  - Added getConversation method to MessagingService for presence tracking setup
  - Secured RTDB presence data with proper security rules (users can only write their own presence)
  - Enhanced message rendering with read status tracking and "Seen" indicators
  - Added comprehensive presence cleanup on logout and app state changes
- **Presence Heartbeat & Time-Based Offline Detection**: Fixed critical airplane mode issue with heartbeat system
  - Added heartbeat system that sends presence updates every 30 seconds when online
  - Implemented time-based offline detection (60-second threshold) for stale presence data
  - Added network-aware heartbeat that only runs when network is available
  - Enhanced presence listening logic to check time-based offline status in real-time
  - Integrated heartbeat with AuthContext (start on login, stop on logout)
  - Added comprehensive debugging logs for testing airplane mode scenarios
  - Created testing guide for verifying airplane mode, app background, and network drop scenarios
  - Fixed issue where users appeared online indefinitely when airplane mode was enabled
  - Users now appear offline within 60 seconds of losing network connectivity
- **Presence Updates on Messages Page Fix**: Resolved presence status not updating on conversation list
  - Fixed presence listeners only being set up once when conversations were first loaded
  - Moved presence listener setup inside conversation update handler to refresh on changes
  - Added cleanup of existing presence listeners before setting up new ones to prevent memory leaks
  - Implemented periodic presence data refresh (5-second interval) to update stale status
  - Added comprehensive debugging logs to track presence listener lifecycle and updates
  - Created testing guide for verifying presence updates work on Messages page without navigation
  - Users now see real-time presence updates on the Messages page without needing to click into chats
  - Fixed issue where presence status only updated when navigating to specific conversations
- **Airplane Mode Detection Fix**: Resolved critical issue where users didn't appear offline when going into airplane mode
  - Reduced OFFLINE_THRESHOLD from 60 seconds to 30 seconds for more responsive detection
  - Enhanced presence listeners with immediate stale data detection when presence updates are received
  - Added comprehensive debugging logs to track presence data age and offline detection logic
  - Implemented immediate `isUserOffline()` checks in both Messages page and chat screen presence listeners
  - Added detailed console logging to monitor presence update flow and detection results
  - Created comprehensive testing guide for airplane mode detection scenarios
  - Users now appear offline within 30 seconds of going into airplane mode on other users' devices
  - Fixed issue where onDisconnect handlers couldn't fire when users were already offline
- **Comprehensive Documentation**: Created detailed technical documentation for presence system
  - **presence-system-docs.md**: Complete system documentation with code snippets and implementation details
  - **presence-system-architecture.md**: Visual architecture diagrams and data flow documentation
  - **presence-quick-reference.md**: Developer quick reference guide with common operations and troubleshooting
  - **presence-heartbeat-plan.md**: Original implementation plan with task breakdown
  - **presence-messages-page-fix.md**: Documentation for Messages page presence fix
  - **presence-testing-guide.md**: Comprehensive testing procedures for airplane mode scenarios
  - **airplane-mode-detection-test.md**: Detailed testing guide for airplane mode detection
  - Documentation includes code snippets, architecture diagrams, troubleshooting guides, and performance notes
- **Platform-Specific Keyboard Isolation**: Resolved cross-platform keyboard handling conflicts
  - Extracted platform-specific keyboard handling into separate functions (setupIOSKeyboardHandling, setupAndroidKeyboardHandling)
  - Implemented isolated keyboard event listeners for iOS (keyboardWillShow/Hide) vs Android (keyboardDidShow/Hide)
  - Created platform-specific style objects (inputContainerKeyboardIOS, inputContainerAndroid)
  - Updated KeyboardAvoidingView behavior: iOS uses 'padding' with 90px offset, Android uses 'height' with 0px offset
  - Added proper conditional rendering for platform-specific input container styling
  - Ensured iOS keyboard height tracking only affects iOS, Android relies on KeyboardAvoidingView automatic handling
  - Fixed keyboard listener cleanup to prevent memory leaks on both platforms
- **Android Keyboard Fixes**: Resolved Android-specific keyboard accumulation and padding issues
  - Changed Android KeyboardAvoidingView from 'height' to 'padding' behavior to prevent accumulation
  - Added Android keyboard height tracking to prevent input container moving too high above keyboard
  - Implemented baseline padding (16px) for Android input container when keyboard is closed for easier access
  - Added Android keyboard-active styling (8px padding) when keyboard is open
  - Updated keyboardVerticalOffset for Android from 0px to 20px for proper positioning
  - Fixed keyboard open/close cycle accumulation that caused input to move progressively higher
  - Ensured consistent keyboard behavior across multiple open/close cycles
- **Android Double Adjustment Fix**: Eliminated double keyboard adjustment causing input to move twice as high
  - Disabled KeyboardAvoidingView for Android (enabled only for iOS) to prevent double adjustment
  - Android now relies entirely on manual keyboard height tracking for precise control
  - Added dynamic marginBottom styling for Android input container based on keyboard height
  - Fixed second keyboard open issue where input would move twice as high with blank space
  - Ensured consistent behavior across multiple keyboard open/close cycles
  - Maintained iOS KeyboardAvoidingView behavior while giving Android full manual control
- **Development Mode Login Buttons**: Added development convenience features for testing
  - Added environment variable support in app.json with EXPO_DEV_MODE configuration
  - Implemented development mode detection using expo-constants
  - Added two development login buttons with test credentials (tylerpohn@gmail.com, moblingoblin64@gmail.com)
  - Created visually distinct styling for development features (yellow container, colored buttons)
  - Added proper error handling and loading states for development login attempts
  - Development buttons only appear when EXPO_DEV_MODE=true environment variable is set
- **Chat Title Regression Fix**: Resolved critical issue where chat titles showed UUIDs instead of display names
  - Fixed getConversationTitle() function in individual chat screen to resolve participant IDs to display names
  - Updated conversation loading logic to load participant profiles for all conversations (not just groups)
  - Ensured consistent chat title logic between chat list and individual chat screens
  - Added proper fallback handling for missing display names ("Unknown User")
  - Enhanced group chat fallback to show participant count (e.g., "Group (3)")
  - Created comprehensive documentation of expected chat title UI behavior
- **Logout Button Implementation**: Successfully implemented user-facing logout functionality
  - Added logout button to Messages page header next to existing "Test" and "+" buttons
  - Implemented confirmation dialog with user's display name and clear Cancel/Sign Out options
  - Red-styled button (#FF3B30) to clearly indicate logout action
  - Integrated with existing AuthContext logout function for proper cleanup
  - Added comprehensive error handling with user feedback for failed logout attempts
  - Logout button provides complete user experience for secure account sign-out
- **Group Chat Implementation (PR1 Item 6)**: Implemented comprehensive group chat functionality with automatic naming
  - Added multi-select UI to new conversation screen with checkboxes and group mode toggle
  - Implemented group creation flow with 2+ participant validation (reduced from 3+ for better UX)
  - Created group name modal with validation (later removed for automatic naming)
  - Added getConversation and getConversationParticipants methods to MessagingService
  - Updated chat list to display comma-separated participant names for groups
  - Enhanced chat screen with sender name/avatar display for group messages
  - Implemented conditional sender info display (only when sender changes between messages)
  - Added automatic group naming using participant display names (comma-separated format)
  - Removed group title input requirement for streamlined user experience
  - Enhanced avatar display for groups using first participant's initial
  - Added comprehensive error handling and loading states for group creation
  - Integrated with existing offline queue and real-time delivery systems
  - Added logout redirect handling to all chat screens for security
- **Image Messaging Implementation (PR2 Item 1)**: ✅ COMPLETED - Full image messaging system working
  - Added expo-image-picker, expo-image-manipulator, expo-file-system dependencies with proper permissions
  - Created ImageService with camera/gallery access, compression (1920x1080, 80% quality), and thumbnail generation (200x200)
  - Implemented Firebase Storage integration with secure rules (membership validation, 5MB limit, image types only)
  - Enhanced Message type with thumbnailURL and imageMetadata fields for proper image handling
  - Updated MessagingService to support image uploads with progress tracking and thumbnail storage
  - Enhanced OfflineQueueService to handle local image URIs and upload on reconnection
  - Created ImageCacheService with LRU caching (50MB limit) for downloaded images
  - Built ImageViewer component with full-screen modal and sender info display
  - Added image picker button to chat screen with camera/gallery selection and image preview
  - Implemented image message rendering with thumbnails and tap-to-view functionality
  - Updated conversation list to show "📷 Photo" indicator for image messages
  - Added upload progress indicators and offline image queueing with local preview
  - Integrated with existing offline queue, real-time delivery, and presence systems
  - **Fixed Issues**: Resolved useAnimatedGestureHandler error, FileSystem deprecation warnings, and Firebase Storage setup
  - **Status**: All features working - users can select, compress, upload, view, and cache images successfully

## Current State

### ✅ Completed

- Environment setup (Node.js, Expo CLI, Firebase CLI)
- Expo project initialization
- Firebase project setup (Auth, Firestore, Functions, Storage)
- Dependencies installed (firebase, react-native-gifted-chat, @tanstack/react-query, etc.)
- Authentication system (AuthContext, Login/Signup screens, user profiles)
- Project reset and authentication system rebuild
- **Basic Chat Structure (PR1 Item 3)**:
  - Firestore offline persistence enabled
  - Data models and types created (Conversation, Message, Membership)
  - MessagingService with full CRUD operations
  - ChatListScreen with real-time conversation updates
  - ChatScreen with real-time messaging and optimistic UI
  - Message status indicators (sending/sent/delivered/read)
  - Test conversation creation utility
- **Real-Time Delivery System (PR1 Item 4)**:
  - OfflineQueueService with AsyncStorage persistence
  - NetworkService with connectivity monitoring
  - Enhanced MessagingService with retry logic
  - Delivered status tracking implementation
  - Network status indicators in UI
  - Exponential backoff retry mechanism
- **Presence & Read Receipts System (PR1 Item 5)**:
  - PresenceService with RTDB integration and onDisconnect handlers
  - Real-time presence tracking with app state listeners
  - Presence indicators in conversation list and chat headers
  - Enhanced read receipt UI with "Seen" text indicators
  - Secure RTDB rules for presence data access
- **Group Chat System (PR1 Item 6)**:
  - Multi-user selection with checkbox UI and group mode toggle
  - Group creation with 2+ participant validation and automatic naming
  - Comma-separated participant names for group titles (e.g., "Alice, Bob, Charlie")
  - Enhanced message display with sender names/avatars for group messages
  - Conditional sender info display (only when sender changes)
  - Integration with offline queue and real-time delivery systems
  - Comprehensive error handling and loading states

### 🔄 In Progress

- Memory bank structure implementation
- Documentation workflow transition

### ⏳ Next Steps

- PR1 Item 7: Notifications (Expo push notifications)

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
