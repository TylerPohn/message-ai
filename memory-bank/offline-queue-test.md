# Offline Queue Testing Guide

## Test Scenarios

### 1. Basic Offline Message Queueing

1. **Setup**: Ensure app is connected to internet
2. **Action**: Send a few messages to verify normal operation
3. **Disconnect**: Turn off WiFi/cellular data
4. **Send Messages**: Send 3-5 messages while offline
5. **Verify**: Messages should appear in chat with queue indicators (⏳)
6. **Reconnect**: Turn on internet connection
7. **Verify**: Queued messages should be sent automatically

### 2. App Restart with Offline Messages

1. **Setup**: Send messages while offline (as above)
2. **Force Close**: Completely close the app (swipe up and close)
3. **Restart**: Open the app again
4. **Verify**: Queued messages should still be visible
5. **Reconnect**: Turn on internet
6. **Verify**: Messages should be sent automatically after reconnection

### 3. Mixed Message Types

1. **Offline**: Send text and image messages while offline
2. **Restart**: Force close and restart app
3. **Verify**: Both text and image messages should be queued
4. **Reconnect**: Turn on internet
5. **Verify**: All message types should be sent successfully

### 4. Multiple Conversations

1. **Setup**: Create multiple conversations
2. **Offline**: Send messages to different conversations while offline
3. **Restart**: Force close and restart app
4. **Verify**: Messages should be queued per conversation
5. **Reconnect**: Turn on internet
6. **Verify**: All messages should be sent to correct conversations

## Expected Behavior

### Queue Indicators

- **⏳ Spinner**: Message is queued and waiting to be sent
- **Orange Color**: Indicates offline/queued status
- **Queue Status**: Should show in conversation list and chat

### After Reconnection

- **Automatic Processing**: Queued messages should be sent automatically
- **Status Updates**: Queue indicators should change to sent/delivered
- **No Duplicates**: Messages should not be duplicated
- **Proper Ordering**: Messages should maintain chronological order

### App Restart Persistence

- **AsyncStorage**: Messages should persist in AsyncStorage
- **Queue Restoration**: Messages should be restored on app restart
- **Retry Logic**: Exponential backoff should continue working
- **Status Preservation**: Queue status should be maintained

## Testing Commands

### Check Queue Status

```javascript
// In browser console or React Native debugger
import { OfflineQueueService } from './services/offlineQueueService'
console.log(OfflineQueueService.getQueueStats())
```

### Manual Queue Processing

```javascript
// Force process queue (for testing)
import { OfflineQueueService } from './services/offlineQueueService'
import { MessagingService } from './services/messagingService'

OfflineQueueService.processQueue(async (message) => {
  return await MessagingService.sendMessage(
    message.conversationId,
    message.senderId,
    message.senderName,
    message.text,
    message.type,
    message.imageURL,
    message.thumbnailURL,
    message.imageMetadata,
    message.replyTo
  )
})
```

## Success Criteria

- [ ] Messages are queued when offline
- [ ] Queue indicators are visible in UI
- [ ] Messages persist after app restart
- [ ] Messages are sent automatically on reconnection
- [ ] No message loss or duplication
- [ ] Proper message ordering maintained
- [ ] Works with both text and image messages
- [ ] Works across multiple conversations

## Known Issues to Watch For

- **Memory Leaks**: Ensure queue is properly cleaned up
- **Duplicate Messages**: Check for message deduplication
- **Image Handling**: Verify offline image queueing works
- **Network Detection**: Ensure proper online/offline detection
- **Retry Logic**: Verify exponential backoff works correctly

