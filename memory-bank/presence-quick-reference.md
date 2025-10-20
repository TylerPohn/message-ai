# Presence System - Quick Reference

## Key Files

| File                          | Purpose                | Key Functions                                            |
| ----------------------------- | ---------------------- | -------------------------------------------------------- |
| `services/presenceService.ts` | Core presence logic    | `setUserOnline()`, `startHeartbeat()`, `isUserOffline()` |
| `contexts/AuthContext.tsx`    | Auth integration       | Heartbeat start/stop on login/logout                     |
| `app/chat/index.tsx`          | Messages page presence | Presence listeners, UI indicators                        |
| `app/chat/[id].tsx`           | Chat screen presence   | Header status, read receipts                             |
| `database.rules.json`         | RTDB security          | User can only write own presence                         |

## Configuration

```typescript
// Heartbeat interval (30 seconds)
HEARTBEAT_INTERVAL = 30000

// Offline detection threshold (30 seconds)
OFFLINE_THRESHOLD = 30000

// UI refresh interval (5 seconds)
REFRESH_INTERVAL = 5000
```

## Common Operations

### Start Presence Tracking

```typescript
// In AuthContext
PresenceService.initialize(user.uid)
PresenceService.startHeartbeat(user.uid)
```

### Listen to User Presence

```typescript
// In UI components
const unsubscribe = PresenceService.listenToUserPresence(userId, (presence) => {
  const isOffline = PresenceService.isUserOffline(presence)
  // Update UI based on presence
})
```

### Check if User is Offline

```typescript
// Time-based detection
const isOffline = PresenceService.isUserOffline(presence)
if (isOffline) {
  // Show offline status
}
```

## Debug Console Logs

### Normal Operation

```
[PresenceService] Heartbeat sent for user: user1
[ChatList] Received presence update for user1: { status: "online", age: 5 }
[ChatList] Presence check for user1: { isActuallyOffline: false }
```

### Airplane Mode Detection

```
[ChatList] Received presence update for user1: { status: "online", age: 35 }
[ChatList] Presence check for user1: { isActuallyOffline: true, willShowAs: "offline" }
[PresenceService] Checking offline status: { isOffline: true }
```

### Periodic Refresh

```
[ChatList] Refreshing presence data...
[PresenceService] Checking offline status: { timeDiff: 35, threshold: 30, isOffline: true }
```

## Troubleshooting

| Issue                     | Check                      | Solution                        |
| ------------------------- | -------------------------- | ------------------------------- |
| Presence not updating     | Console logs for heartbeat | Verify network connection       |
| Users stuck online        | Time-based detection logs  | Check OFFLINE_THRESHOLD         |
| Memory leaks              | Listener cleanup logs      | Verify unsubscribers are called |
| Airplane mode not working | Presence data age          | Check immediate detection       |

## Testing Checklist

- [ ] Heartbeat runs every 30 seconds when online
- [ ] Users appear offline within 30 seconds of airplane mode
- [ ] Presence updates work on Messages page without navigation
- [ ] Read receipts show "Seen" when messages are read
- [ ] Memory cleanup works on logout
- [ ] Network drops are handled gracefully

## Performance Tips

1. **Heartbeat Throttling**: Only runs when network is available
2. **Efficient Updates**: Only re-renders when presence actually changes
3. **Memory Management**: Clean up listeners before setting up new ones
4. **Network Awareness**: Skip heartbeats when offline

## Security Notes

- Users can only write their own presence data
- All authenticated users can read presence data
- RTDB rules enforce access control
- No sensitive data in presence objects

This quick reference provides essential information for working with the presence system.
