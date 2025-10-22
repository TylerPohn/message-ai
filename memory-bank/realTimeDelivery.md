# Real-Time Delivery System Documentation

## Overview

The MessageAI real-time delivery system provides robust offline support with automatic retry, comprehensive delivery status tracking, and seamless user experience across network conditions.

## Architecture

### Core Components

1. **OfflineQueueService** - Manages failed message queue with AsyncStorage persistence
2. **NetworkService** - Monitors connectivity and triggers queue processing
3. **MessagingService** - Enhanced with offline detection and retry logic
4. **UI Components** - Display network status and queued messages

### Message Status Flow

```
sending → sent → delivered → read
   ⏳       ✓        ✓        ✓
  Orange   Gray     Gray    Green
```

## Implementation Details

### 1. Offline Queue Management

**File**: `services/offlineQueueService.ts`

- **Storage**: AsyncStorage for persistence across app restarts
- **Retry Logic**: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- **Max Retries**: 5 attempts before giving up
- **Queue Processing**: Automatic retry when coming back online

```typescript
// Add message to queue when offline
const queuedId = await OfflineQueueService.addToQueue(
  conversationId,
  senderId,
  senderName,
  text,
  type,
  imageURL,
  replyTo
)

// Process queue when online
await OfflineQueueService.processQueue(sendMessageCallback)
```

### 2. Network State Monitoring

**File**: `services/networkService.ts`

- **Connectivity Detection**: Uses `@react-native-community/netinfo`
- **State Changes**: Automatically triggers queue processing
- **UI Updates**: Real-time network status display

```typescript
// Monitor network state
NetworkService.subscribe((state) => {
  setNetworkState(state)
})

// Check if online
if (!NetworkService.isOnline()) {
  // Add to queue instead of sending
}
```

### 3. Enhanced Message Sending

**File**: `services/messagingService.ts`

- **Offline Detection**: Checks network state before sending
- **Error Handling**: Detects network errors vs other failures
- **Queue Integration**: Automatically queues failed messages
- **Status Tracking**: Updates message status through delivery pipeline

```typescript
// Enhanced sendMessage with offline support
static async sendMessage(...) {
  if (!NetworkService.isOnline()) {
    return await OfflineQueueService.addToQueue(...)
  }

  try {
    // Send to Firestore
  } catch (error) {
    if (this.isNetworkError(error)) {
      return await OfflineQueueService.addToQueue(...)
    }
    throw error
  }
}
```

### 4. UI Integration

**Files**: `app/chat/[id].tsx`, `app/chat/index.tsx`

- **Queued Message Display**: Shows offline messages in chat
- **Status Indicators**: Visual feedback for message states
- **Network Status**: Header indicators for connectivity
- **Queue Information**: Shows pending message count

```typescript
// Merge Firestore and queued messages
const getAllMessages = (): Message[] => {
  const queuedAsMessages = queuedMessages.map((queued) => ({
    ...queued,
    status: 'sending' as const
  }))

  return [...messages, ...queuedAsMessages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )
}
```

## Message Status System

### Status Indicators

| Status    | Icon | Color  | Description                        |
| --------- | ---- | ------ | ---------------------------------- |
| Sending   | ⏳   | Orange | Message being sent or queued       |
| Sent      | ✓    | Gray   | Message sent to server             |
| Delivered | ✓    | Gray   | Message reached recipient's device |
| Read      | ✓    | Green  | Message read by recipient          |

### Message Deduplication

The system handles two types of messages:

1. **Queued Messages** (Offline Queue):

   - Have `queue_` prefix IDs (e.g., `queue_1234567890_abc123`)
   - Stored in AsyncStorage for persistence
   - Show as "sending" status with ⏳ spinner
   - Automatically sent to Firestore when network is restored

2. **Firestore Messages** (Real Messages):
   - Have Firestore document IDs (e.g., `abc123def456`)
   - Stored in Firestore database
   - Show proper status progression (sent → delivered → read)
   - Real-time synchronized across all devices

**Deduplication Logic**:

- When merging queued and Firestore messages, the system deduplicates based on:
  - Same text content
  - Same sender ID
  - Timestamp within 5 seconds
- **Priority**: Firestore messages take precedence over queued messages
- Queued messages are removed from AsyncStorage after successful Firestore send

### Status Display Rules

- **Most Recent Only**: Status indicators show only on the latest message sent by the user
- **Color Persistence**: Green checkmarks stay green forever once read
- **Queue Indicators**: Offline messages show spinner (⏳) with orange color
- **Visual Hierarchy**: Clean, simple status system without clutter

## Offline Behavior

### When Offline

1. **Message Sending**: Messages automatically added to queue
2. **UI Display**: Queued messages appear in chat with queue indicators
3. **Status**: Messages show as "sending" with spinner icon
4. **Persistence**: Queue survives app restarts via AsyncStorage

### When Coming Back Online

1. **Automatic Processing**: Queue automatically processes when connectivity restored
2. **Retry Logic**: Failed messages retry with exponential backoff
3. **Message Transition**: Queued messages (queue\_ IDs) are sent to Firestore and get new document IDs
4. **Deduplication**: System merges queued and Firestore messages, removing duplicates
5. **Status Updates**: Messages transition from queued to sent/delivered/read
6. **UI Sync**: Real-time updates reflect new message states

## Network State Indicators

### Header Display

- **Online**: No indicator (normal state)
- **Offline**: "No Connection" in red
- **No Internet**: "No Internet" in orange
- **Connecting**: "Connecting..." in orange

### Queue Information

- **Pending Count**: Shows number of queued messages
- **Per Conversation**: Queue status specific to each chat
- **Visual Feedback**: Orange indicators for queued messages

## Error Handling

### Network Errors

- **Detection**: Identifies network-related failures
- **Automatic Queue**: Failed sends automatically queued
- **Retry Logic**: Exponential backoff prevents server overload
- **User Feedback**: Clear visual indicators for offline state

### Retry Mechanism

- **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s delays
- **Max Attempts**: 5 retries before giving up
- **Automatic Processing**: Triggers when network restored
- **Queue Management**: Removes successful messages, keeps failed ones

## Testing Scenarios

### Airplane Mode Testing

1. **Send Online**: Message shows as sent with gray checkmark
2. **Go Offline**: Send message → shows as queued with spinner
3. **Come Online**: Queued message automatically sends
4. **Status Updates**: Message transitions through status pipeline

### App Restart Testing

1. **Send Offline**: Message queued in AsyncStorage
2. **Restart App**: Queue persists across restarts
3. **Come Online**: Queue processes automatically
4. **Message Delivery**: Queued messages send successfully

## Queued Message Lifecycle

### Message Creation Flow

1. **User Sends Message** → Check network status
2. **If Offline** → Add to queue with `queue_` prefix ID
3. **If Online** → Send directly to Firestore with document ID
4. **Network Error** → Fallback to queue with `queue_` prefix ID

### Queue Processing Flow

1. **Network Restored** → Queue processing triggered
2. **Retry Logic** → Exponential backoff for failed messages
3. **Successful Send** → Message gets Firestore document ID
4. **Deduplication** → Remove queued message, keep Firestore message
5. **Status Update** → UI shows proper status progression

### Message State Transitions

```
Queued Message (queue_123) → Firestore Send → Real Message (abc123)
     ↓                              ↓
AsyncStorage                    Firestore
     ↓                              ↓
UI: ⏳ (Orange)              UI: ✓ (Gray/Green)
```

## Performance Considerations

### Queue Management

- **Efficient Storage**: AsyncStorage for queue persistence
- **Memory Usage**: Queue limited to reasonable size
- **Cleanup**: Successful messages removed from queue
- **Batch Processing**: Multiple messages processed efficiently

### Network Optimization

- **State Monitoring**: Efficient connectivity detection
- **Retry Logic**: Prevents server overload with backoff
- **UI Updates**: Minimal re-renders with proper state management
- **Real-time Sync**: Leverages Firestore's built-in offline support

## Dependencies

- `@react-native-community/netinfo` - Network connectivity monitoring
- `@react-native-async-storage/async-storage` - Queue persistence
- `firebase/firestore` - Real-time message synchronization

## Future Enhancements

- **Message Priority**: High-priority messages sent first
- **Batch Sending**: Group multiple messages for efficiency
- **Compression**: Reduce data usage for offline messages
- **Analytics**: Track delivery success rates and retry patterns
