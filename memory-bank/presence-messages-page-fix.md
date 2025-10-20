# Presence Updates on Messages Page - Fix Testing Guide

## Problem Fixed

**Issue**: Presence status only updated when navigating to a specific chat, not on the Messages page (conversation list).

**Root Cause**: Presence listeners were only set up once when conversations were first loaded, but not refreshed when conversation list changed.

## Solution Implemented

### 1. **Presence Listener Refresh**

- Moved presence listener setup inside the conversation update handler
- Added cleanup of existing listeners before setting up new ones
- Ensures presence listeners are refreshed whenever conversations change

### 2. **Periodic Presence Data Refresh**

- Added 30-second interval to refresh presence data
- Re-checks time-based offline status for all users
- Updates stale presence status even without new events

### 3. **Proper Cleanup**

- Clean up old presence listeners before setting up new ones
- Prevent memory leaks from accumulating listeners
- Ensure only current conversation participants are being tracked

## Testing Steps

### Test 1: Basic Presence Updates

1. **Open Messages page** with two users in conversation
2. **Check console logs** for:
   ```
   [ChatList] Setting up presence listeners for X participants
   ```
3. **Verify presence indicators** show correctly (green dots, "Online" status)

### Test 2: Airplane Mode Test

1. **Enable airplane mode** on one device
2. **Wait 60 seconds** on the other device
3. **Check console logs** for:
   ```
   [ChatList] Refreshing presence data...
   [PresenceService] Checking offline status: { isOffline: true }
   ```
4. **Verify** the user appears offline on Messages page without navigation

### Test 3: New Conversation Test

1. **Create a new conversation** with a third user
2. **Check console logs** for:
   ```
   [ChatList] Cleaning up existing presence listeners...
   [ChatList] Setting up presence listeners for X participants
   ```
3. **Verify** presence indicators work for the new user

### Test 4: Periodic Refresh Test

1. **Wait 30 seconds** on Messages page
2. **Check console logs** for:
   ```
   [ChatList] Refreshing presence data...
   ```
3. **Verify** presence status updates even without navigation

## Expected Console Logs

### Normal Operation

```
[ChatList] Setting up presence listeners for 2 participants
[PresenceService] Heartbeat sent for user: user1
[PresenceService] Heartbeat sent for user: user2
```

### Airplane Mode

```
[ChatList] Refreshing presence data...
[PresenceService] Checking offline status: {
  status: "online",
  lastSeen: "2024-01-15T10:30:00.000Z",
  timeDiff: 65,
  threshold: 60,
  isOffline: true
}
```

### New Conversation

```
[ChatList] Cleaning up existing presence listeners...
[ChatList] Setting up presence listeners for 3 participants
```

## Key Improvements

1. **Real-time Updates**: Presence status updates immediately on Messages page
2. **No Navigation Required**: Users see presence changes without clicking into chats
3. **Memory Efficient**: Old listeners are cleaned up before setting up new ones
4. **Stale Data Handling**: Periodic refresh catches cases where presence events are missed
5. **Debug Visibility**: Console logs help track presence listener lifecycle

## Performance Notes

- **30-second refresh interval** balances responsiveness with performance
- **Listener cleanup** prevents memory leaks from accumulating listeners
- **Efficient updates** only trigger re-renders when presence status actually changes
- **Network aware** heartbeat only runs when online

## Troubleshooting

### Presence not updating

- Check console for presence listener setup logs
- Verify heartbeat is running (should see heartbeat logs every 30 seconds)
- Check if periodic refresh is running (should see refresh logs every 30 seconds)

### Memory leaks

- Check console for cleanup logs when conversations change
- Verify old listeners are being removed before setting up new ones
- Monitor for accumulating presence listeners

### Stale presence data

- Check if periodic refresh is running
- Verify time-based offline detection is working
- Check if presence listeners are receiving updates
