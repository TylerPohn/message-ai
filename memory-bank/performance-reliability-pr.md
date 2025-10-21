# Performance & Reliability PR - MessageAI

## Overview

This PR implements critical performance and reliability improvements for the MessageAI messaging app, focusing on chat history pagination, smooth scrolling, offline queue testing, and message ordering verification.

## Background

The current implementation loads all messages at once, which can cause performance issues with long conversations. Additionally, we need to verify that our offline queue works correctly after app restarts and that message ordering is consistent.

## Tasks

### 1. Paginate Chat History (50 messages per load)

**Current State**: All messages are loaded at once when opening a chat
**Target**: Load messages in batches of 50 for better performance

**Implementation Plan**:

- Modify `MessagingService.getMessages()` to support pagination
- Add `limit` and `startAfter` parameters for Firestore queries
- Implement "Load More" functionality in ChatScreen
- Add loading states for pagination

**Files to Modify**:

- `services/messagingService.ts` - Add pagination support
- `app/chat/[id].tsx` - Implement load more functionality
- `types/messaging.ts` - Add pagination types if needed

### 2. Use FlashList for Smooth Scrolling

**Current State**: Using FlatList for message rendering
**Target**: Replace with FlashList for better performance

**Implementation Plan**:

- Install `@shopify/flash-list` dependency
- Replace FlatList with FlashList in ChatScreen
- Configure FlashList for optimal performance
- Test scrolling performance with large message lists

**Files to Modify**:

- `package.json` - Add FlashList dependency
- `app/chat/[id].tsx` - Replace FlatList with FlashList
- Update imports and component usage

### 3. Test Offline Queue After App Restart

**Current State**: Offline queue works during app session
**Target**: Verify offline queue persists and processes after app restart

**Testing Plan**:

- Send messages while offline
- Force close app completely
- Restart app and verify queued messages are processed
- Test with multiple queued messages
- Verify message ordering after restart

**Test Scenarios**:

1. Send 5 messages offline → close app → restart → verify all sent
2. Send mixed text/image messages offline → restart → verify all processed
3. Test with network reconnection during restart

### 4. Verify Ordering by Server `createdAt`

**Current State**: Messages ordered by client timestamps
**Target**: Ensure consistent ordering using server timestamps

**Implementation Plan**:

- Review current message ordering logic
- Verify Firestore queries use `createdAt` for ordering
- Test message ordering across different devices
- Ensure offline messages maintain proper order when synced

**Files to Review**:

- `services/messagingService.ts` - Message ordering queries
- `app/chat/[id].tsx` - Message display ordering
- `services/offlineQueueService.ts` - Offline message ordering

## Technical Implementation

### Pagination Implementation

```typescript
// services/messagingService.ts
interface PaginationOptions {
  limit?: number;
  startAfter?: DocumentSnapshot;
}

async getMessages(
  conversationId: string,
  options: PaginationOptions = {}
): Promise<Message[]> {
  const { limit = 50, startAfter } = options;

  let query = this.db
    .collection('messages')
    .where('conversationId', '==', conversationId)
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (startAfter) {
    query = query.startAfter(startAfter);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Message));
}
```

### FlashList Integration

```typescript
// app/chat/[id].tsx
import { FlashList } from '@shopify/flash-list'

;<FlashList
  data={messages}
  renderItem={renderMessage}
  estimatedItemSize={80}
  onEndReached={loadMoreMessages}
  onEndReachedThreshold={0.5}
/>
```

## Testing Strategy

### Performance Testing

- Load conversation with 1000+ messages
- Test scrolling performance with FlashList vs FlatList
- Measure memory usage with large message lists
- Test pagination loading times

### Offline Queue Testing

- Test offline message queuing
- Verify queue persistence after app restart
- Test mixed message types (text, images)
- Verify message ordering after sync

### Message Ordering Testing

- Send messages from multiple devices
- Test with network delays
- Verify consistent ordering across devices
- Test offline message ordering

## Success Criteria

- [ ] Chat history loads in 50-message batches
- [ ] FlashList provides smooth scrolling performance
- [ ] Offline queue works correctly after app restart
- [ ] Message ordering is consistent using server timestamps
- [ ] Performance improvements are measurable
- [ ] No regression in existing functionality

## Dependencies

- `@shopify/flash-list` - For smooth scrolling performance
- Existing offline queue system
- Firestore pagination capabilities

## Risks & Considerations

- **Breaking Changes**: FlashList API differences from FlatList
- **Performance**: Ensure pagination doesn't impact real-time updates
- **Offline Sync**: Verify offline queue doesn't conflict with pagination
- **Memory Usage**: Monitor memory usage with large message lists

## Timeline

- **Day 1**: Implement pagination and FlashList
- **Day 2**: Testing and verification
- **Day 3**: Performance optimization and final testing

## Related Documentation

- [System Patterns - Performance Optimizations](../systemPatterns.md)
- [Tech Context - Performance Requirements](../techContext.md)
- [Progress - Current Status](../progress.md)
