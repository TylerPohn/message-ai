# Airplane Mode Detection - Testing Guide

## Problem Fixed

**Issue**: When a user goes into airplane mode, other users don't see them as offline because:

1. onDisconnect handlers can't fire when already offline
2. Presence data doesn't get updated to "offline" status
3. Time-based detection was only running every 5 seconds

## Solution Implemented

### 1. **Immediate Stale Data Detection**

- Added immediate `isUserOffline()` check when presence data is received
- Reduced OFFLINE_THRESHOLD from 60 seconds to 30 seconds
- Added comprehensive debugging logs

### 2. **Enhanced Debugging**

- Added detailed console logs for presence updates
- Track presence data age and offline detection
- Monitor presence listener lifecycle

## Testing Steps

### Test 1: Basic Airplane Mode Detection

1. **Open two devices** with different users in a conversation
2. **Check console logs** for presence listener setup:

   ```
   [ChatList] Setting up presence listeners for X participants
   [PresenceService] Heartbeat sent for user: user1
   ```

3. **Enable airplane mode** on Device A
4. **Wait 30 seconds** on Device B
5. **Check console logs** on Device B:

   ```
   [ChatList] Received presence update for user1: {
     status: "online",
     lastSeen: "2024-01-15T10:30:00.000Z",
     age: 35
   }
   [ChatList] Presence check for user1: {
     isActuallyOffline: true,
     willShowAs: "offline"
   }
   ```

6. **Verify** Device B shows Device A as "Last seen X minutes ago"

### Test 2: Real-time Detection

1. **Monitor console logs** on Device B while Device A is in airplane mode
2. **Look for**:

   ```
   [ChatList] Refreshing presence data...
   [PresenceService] Checking offline status: { isOffline: true }
   ```

3. **Verify** presence status updates within 30 seconds

### Test 3: Reconnection Test

1. **Disable airplane mode** on Device A
2. **Check console logs** on Device A:

   ```
   [PresenceService] Heartbeat sent for user: user1
   ```

3. **Check console logs** on Device B:

   ```
   [ChatList] Received presence update for user1: {
     status: "online",
     lastSeen: "2024-01-15T10:35:00.000Z",
     age: 2
   }
   [ChatList] Presence check for user1: {
     isActuallyOffline: false,
     willShowAs: "online"
   }
   ```

4. **Verify** Device B shows Device A as "Online"

## Expected Console Logs

### Normal Operation

```
[PresenceService] Heartbeat sent for user: user1
[ChatList] Received presence update for user1: {
  status: "online",
  lastSeen: "2024-01-15T10:30:00.000Z",
  age: 5
}
[ChatList] Presence check for user1: {
  isActuallyOffline: false,
  willShowAs: "online"
}
```

### Airplane Mode Detection

```
[ChatList] Received presence update for user1: {
  status: "online",
  lastSeen: "2024-01-15T10:30:00.000Z",
  age: 35
}
[ChatList] Presence check for user1: {
  isActuallyOffline: true,
  willShowAs: "offline"
}
```

### Periodic Refresh

```
[ChatList] Refreshing presence data...
[PresenceService] Checking offline status: {
  status: "online",
  lastSeen: "2024-01-15T10:30:00.000Z",
  timeDiff: 35,
  threshold: 30,
  isOffline: true
}
```

## Key Improvements

1. **30-second threshold** instead of 60 seconds
2. **Immediate detection** when presence data is received
3. **Comprehensive logging** for debugging
4. **Real-time updates** on both Messages page and chat screen

## Troubleshooting

### Still not detecting offline status

- Check if OFFLINE_THRESHOLD is 30 seconds (30000ms)
- Verify presence data age is being calculated correctly
- Check if `isUserOffline()` is being called
- Monitor console logs for presence updates

### Presence updates not received

- Check if presence listeners are set up correctly
- Verify RTDB connection is working
- Check if heartbeat is running on the other device

### Memory leaks

- Check if old presence listeners are being cleaned up
- Verify unsubscribers are being called
- Monitor for accumulating listeners

## Performance Notes

- **30-second threshold** balances responsiveness with false positives
- **Immediate detection** prevents delays in offline status
- **5-second refresh** catches cases where presence events are missed
- **Debug logs** can be removed in production
