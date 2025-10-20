# Presence Heartbeat Testing Guide

## Testing Airplane Mode Scenario

### Setup

1. Open the app on two devices (or use two browser tabs)
2. Log in with different users on each device
3. Create a conversation between the users
4. Open the conversation on both devices

### Test Steps

#### Test 1: Normal Operation

1. **Verify heartbeat is working:**
   - Check console logs for `[PresenceService] Heartbeat sent for user: {userId}`
   - Should see heartbeat every 30 seconds
   - Both users should show as "Online"

#### Test 2: Airplane Mode Test

1. **Enable airplane mode on Device A:**

   - Turn on airplane mode
   - Check console logs - should see `[PresenceService] Skipping heartbeat - no network`
   - Device A should stop sending heartbeats

2. **Check Device B (other user):**

   - Wait 60 seconds (OFFLINE_THRESHOLD)
   - Check console logs for `[PresenceService] Checking offline status`
   - Should see `isOffline: true` after 60 seconds
   - Device B should see Device A as "Last seen X minutes ago"

3. **Disable airplane mode on Device A:**
   - Turn off airplane mode
   - Device A should resume sending heartbeats
   - Device B should see Device A as "Online" again

#### Test 3: App Background Test

1. **Background Device A:**

   - Press home button or switch apps
   - Check console logs - should continue sending heartbeats
   - Device B should still see Device A as "Online"

2. **Force close Device A:**
   - Force close the app (swipe up and swipe away)
   - Wait 60 seconds
   - Device B should see Device A as "Last seen X minutes ago"

#### Test 4: Network Drop Test

1. **Disconnect WiFi on Device A:**
   - Turn off WiFi (but keep cellular if available)
   - Check console logs - should see network state changes
   - If no cellular, should stop sending heartbeats
   - Device B should see Device A as offline after 60 seconds

### Expected Console Logs

#### Normal Operation

```
[PresenceService] Heartbeat check: { userId: "user1", isOnline: true, connectionType: "wifi" }
[PresenceService] Heartbeat sent for user: user1
```

#### Airplane Mode

```
[PresenceService] Heartbeat check: { userId: "user1", isOnline: false, connectionType: "none" }
[PresenceService] Skipping heartbeat - no network for user: user1
```

#### Time-Based Offline Detection

```
[PresenceService] Checking offline status: {
  status: "online",
  lastSeen: "2024-01-15T10:30:00.000Z",
  timeDiff: 65,
  threshold: 60,
  isOffline: true
}
```

### Troubleshooting

#### Heartbeat not starting

- Check if user is logged in
- Check if PresenceService.initialize() is called
- Check if startHeartbeat() is called in AuthContext

#### Time-based detection not working

- Check if isUserOffline() is being called
- Verify OFFLINE_THRESHOLD is 60 seconds
- Check if presence data has correct lastSeen timestamp

#### Network detection issues

- Check NetworkService.getCurrentState()
- Verify network state changes are detected
- Check if heartbeat respects network state

### Performance Notes

- Heartbeat runs every 30 seconds when online
- Time-based detection runs on every presence update
- Debug logs can be removed in production
- Heartbeat automatically stops when user logs out
