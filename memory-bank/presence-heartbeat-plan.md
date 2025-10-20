# Presence Heartbeat & Time-Based Offline Detection

## Problem Statement

Current presence system has a critical flaw: when users turn on airplane mode, they appear online to other users indefinitely because:

- onDisconnect handlers can't fire (no network connection)
- AppState listeners can't update presence (no network)
- No time-based detection for stale presence data

## Solution: Heartbeat + Time-Based Offline Detection

Implement a heartbeat system that keeps presence fresh and time-based detection that marks users offline after a reasonable timeout.

## Implementation Tasks

### Phase 1: Core Heartbeat System

#### Task 1.1: Add Heartbeat Infrastructure to PresenceService

- [ ] Add heartbeat interval property to PresenceService class
- [ ] Add HEARTBEAT_INTERVAL constant (30 seconds)
- [ ] Add OFFLINE_THRESHOLD constant (60 seconds)
- [ ] Add startHeartbeat(userId) method
- [ ] Add stopHeartbeat() method
- [ ] Add isUserOffline(presence) method for time-based detection

#### Task 1.2: Update Presence Data Structure

- [ ] Ensure presence data includes accurate timestamps
- [ ] Add time-based offline detection logic
- [ ] Update formatLastSeen to handle stale presence

### Phase 2: Integration with Existing System

#### Task 2.1: Integrate Heartbeat with AuthContext

- [ ] Start heartbeat when user logs in
- [ ] Stop heartbeat when user logs out
- [ ] Add heartbeat cleanup on app unmount

#### Task 2.2: Update Presence Listening Logic

- [ ] Modify presence listeners to check time-based offline status
- [ ] Update conversation list to show time-based offline status
- [ ] Update chat screen header to show time-based offline status

### Phase 3: Network-Aware Heartbeat

#### Task 3.1: Network Integration

- [ ] Only send heartbeat when network is online
- [ ] Stop heartbeat when network goes offline
- [ ] Resume heartbeat when network comes back online

#### Task 3.2: Optimize Heartbeat Performance

- [ ] Add heartbeat throttling to prevent excessive updates
- [ ] Implement smart heartbeat (only when app is active)
- [ ] Add heartbeat cleanup on app background

### Phase 4: Testing & Validation

#### Task 4.1: Test Airplane Mode Scenario

- [ ] Test user goes offline when airplane mode enabled
- [ ] Verify other users see offline status within 60 seconds
- [ ] Test reconnection after airplane mode disabled

#### Task 4.2: Test Edge Cases

- [ ] Test app crash scenario
- [ ] Test network drop scenario
- [ ] Test multiple device scenario
- [ ] Test rapid connect/disconnect cycles

## Technical Implementation Details

### Heartbeat System

```typescript
// Heartbeat every 30 seconds when online
private static readonly HEARTBEAT_INTERVAL = 30000

// Mark offline if no update for 60 seconds
private static readonly OFFLINE_THRESHOLD = 60000

// Start heartbeat on login
static startHeartbeat(userId: string): void

// Stop heartbeat on logout
static stopHeartbeat(): void

// Check if user should be considered offline
static isUserOffline(presence: PresenceData): boolean
```

### Time-Based Detection

```typescript
// In presence listeners
const isActuallyOffline = PresenceService.isUserOffline(presence)
if (isActuallyOffline) {
  // Show as offline even if status says "online"
  setPresenceData({
    status: 'offline',
    lastSeen: presence.lastSeen
  })
}
```

### Network Integration

```typescript
// Only heartbeat when network is available
if (NetworkService.getCurrentState().isOnline) {
  await this.setUserOnline(userId)
}
```

## Files to Modify

1. **services/presenceService.ts** - Add heartbeat system
2. **contexts/AuthContext.tsx** - Integrate heartbeat with auth
3. **app/chat/index.tsx** - Update presence listening logic
4. **app/chat/[id].tsx** - Update presence listening logic

## Success Criteria

- [ ] Users appear offline within 60 seconds of airplane mode
- [ ] Heartbeat only runs when network is available
- [ ] No performance impact from excessive heartbeats
- [ ] Proper cleanup prevents memory leaks
- [ ] Works across all edge cases (crash, network drop, etc.)

## Testing Checklist

- [ ] Airplane mode → offline within 60 seconds
- [ ] App crash → offline within 60 seconds
- [ ] Network drop → offline within 60 seconds
- [ ] Reconnection → online immediately
- [ ] Multiple devices → each manages own heartbeat
- [ ] App background → heartbeat continues
- [ ] App foreground → heartbeat continues
- [ ] Logout → heartbeat stops immediately
