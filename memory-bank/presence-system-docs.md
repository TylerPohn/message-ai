# Presence & Read Receipts System Documentation

## Overview

The MessageAI presence system provides real-time user status tracking with automatic offline detection, read receipts, and comprehensive airplane mode handling. The system uses Firebase Realtime Database for presence tracking and Firestore for read status persistence.

## Architecture

### Core Components

1. **PresenceService** - RTDB-based presence tracking with heartbeat system
2. **AuthContext Integration** - Automatic presence management on login/logout
3. **UI Components** - Real-time presence indicators and read receipts
4. **Time-based Detection** - Automatic offline detection for stale presence data

### Data Flow

```
User Action → PresenceService → RTDB → Real-time Listeners → UI Update
     ↓
Heartbeat System → Network Detection → Time-based Offline Detection
```

## Implementation Details

### 1. PresenceService (`services/presenceService.ts`)

The core service managing user presence with heartbeat and time-based detection.

#### Key Features

- **Heartbeat System**: Sends presence updates every 30 seconds when online
- **Time-based Detection**: Marks users offline after 30 seconds of no updates
- **Network Awareness**: Only sends heartbeats when network is available
- **Automatic Cleanup**: Proper cleanup on logout and app state changes

#### Code Snippets

```typescript
export class PresenceService {
  private static readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private static readonly OFFLINE_THRESHOLD = 30000 // 30 seconds

  // Set user as online with heartbeat
  static async setUserOnline(userId: string): Promise<void> {
    const presenceRef = ref(rtdb, `presence/${userId}`)
    await set(presenceRef, {
      status: 'online',
      lastSeen: serverTimestamp()
    })
  }

  // Start heartbeat to keep presence fresh
  static startHeartbeat(userId: string): void {
    this.heartbeatInterval = setInterval(async () => {
      const { NetworkService } = await import('./networkService')
      if (NetworkService.getCurrentState().isOnline) {
        await this.setUserOnline(userId)
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  // Check if user should be considered offline based on timestamp
  static isUserOffline(presence: PresenceData): boolean {
    if (presence.status === 'offline') return true

    const now = Date.now()
    const lastSeen = presence.lastSeen
    const timeDiff = now - lastSeen

    return timeDiff > this.OFFLINE_THRESHOLD
  }
}
```

#### Data Structure

```typescript
export interface PresenceData {
  status: 'online' | 'offline'
  lastSeen: number // Unix timestamp
}
```

### 2. AuthContext Integration (`contexts/AuthContext.tsx`)

Automatic presence management integrated with authentication lifecycle.

```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      await fetchUserProfile(user)
      PresenceService.initialize(user.uid)
      PresenceService.startHeartbeat(user.uid) // Start heartbeat
    } else {
      PresenceService.stopHeartbeat()
      PresenceService.cleanup()
    }
  })

  return () => {
    unsubscribe()
    PresenceService.stopHeartbeat()
    PresenceService.cleanup()
  }
}, [])
```

### 3. Messages Page Presence (`app/chat/index.tsx`)

Real-time presence indicators in the conversation list with automatic refresh.

#### Presence Listener Setup

```typescript
// Set up presence listeners for all participants
for (const participantId of allParticipantIds) {
  const unsubscribe = PresenceService.listenToUserPresence(
    participantId,
    (presence) => {
      if (presence) {
        // Check if user should be considered offline based on time
        const isActuallyOffline = PresenceService.isUserOffline(presence)

        setPresenceData((prev) => {
          const newMap = new Map(prev)
          if (isActuallyOffline) {
            // Show as offline even if status says "online"
            newMap.set(participantId, {
              status: 'offline',
              lastSeen: presence.lastSeen
            })
          } else {
            newMap.set(participantId, presence)
          }
          return newMap
        })
      }
    }
  )
  presenceUnsubscribers.push(unsubscribe)
}
```

#### Periodic Refresh

```typescript
// Periodic presence data refresh to update stale status
useEffect(() => {
  const refreshPresenceData = () => {
    setPresenceData((prev) => {
      const newMap = new Map()
      let hasChanges = false

      prev.forEach((presence, userId) => {
        const isActuallyOffline = PresenceService.isUserOffline(presence)

        if (isActuallyOffline && presence.status === 'online') {
          newMap.set(userId, {
            status: 'offline',
            lastSeen: presence.lastSeen
          })
          hasChanges = true
        } else {
          newMap.set(userId, presence)
        }
      })

      return hasChanges ? newMap : prev
    })
  }

  // Refresh every 5 seconds to catch stale presence
  const interval = setInterval(refreshPresenceData, 5000)
  return () => clearInterval(interval)
}, [])
```

#### UI Rendering

```typescript
const renderConversation = ({ item }: { item: Conversation }) => {
  const presenceStatus = getPresenceStatus(item)
  const isOnline = presenceStatus === 'Online'

  return (
    <TouchableOpacity style={styles.conversationItem}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getConversationTitle(item).charAt(0).toUpperCase()}
          </Text>
        </View>
        {isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <Text style={styles.conversationTitle}>
          {getConversationTitle(item)}
        </Text>

        {presenceStatus && (
          <Text style={styles.presenceStatus}>{presenceStatus}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}
```

### 4. Chat Screen Presence (`app/chat/[id].tsx`)

Real-time presence status in chat headers with enhanced read receipts.

#### Presence Tracking Setup

```typescript
// Set up presence tracking for direct conversations
useEffect(() => {
  const setupPresenceTracking = async () => {
    const conversationData = await MessagingService.getConversation(id)
    if (conversationData && conversationData.type === 'direct') {
      const otherParticipant = conversationData.participants.find(
        (participantId: string) => participantId !== user.uid
      )

      if (otherParticipant) {
        presenceUnsubscribe = PresenceService.listenToUserPresence(
          otherParticipant,
          (presence) => {
            if (presence) {
              const isActuallyOffline = PresenceService.isUserOffline(presence)

              if (isActuallyOffline) {
                setPresenceData({
                  status: 'offline',
                  lastSeen: presence.lastSeen
                })
              } else {
                setPresenceData(presence)
              }
            }
          }
        )
      }
    }
  }

  setupPresenceTracking()
}, [user, id])
```

#### Header Display

```typescript
<View style={styles.headerCenter}>
  <Text style={styles.headerTitle}>{getConversationTitle()}</Text>
  {presenceData && (
    <Text style={styles.presenceStatus}>
      {presenceData.status === 'online'
        ? 'Online'
        : `Last seen ${PresenceService.formatLastSeen(presenceData.lastSeen)}`}
    </Text>
  )}
</View>
```

#### Enhanced Read Receipts

```typescript
const renderMessage = ({ item }: { item: Message }) => {
  const isOwnMessage = item.senderId === user?.uid
  const isMostRecentUserMessage = /* logic to determine if most recent */

  return (
    <View style={styles.messageContainer}>
      <View style={styles.messageBubble}>
        <Text style={styles.messageText}>{item.text}</Text>
        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>{messageTime}</Text>
          {isOwnMessage && isMostRecentUserMessage && (
            <Text style={styles.statusIcon}>
              {getStatusIcon(item.status)}
            </Text>
          )}
        </View>
      </View>

      {/* Show "Seen" indicator for read messages */}
      {isOwnMessage && isMostRecentUserMessage &&
       item.status === 'read' &&
       otherUserMembership &&
       otherUserMembership.lastReadMessageId === item.id && (
        <Text style={styles.seenIndicator}>Seen</Text>
      )}
    </View>
  )
}
```

### 5. Database Security (`database.rules.json`)

Secure RTDB presence data with proper access controls.

```json
{
  "rules": {
    "presence": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid"
      }
    }
  }
}
```

## Key Features

### 1. Heartbeat System

- **Interval**: 30 seconds
- **Network Aware**: Only sends when online
- **Automatic Cleanup**: Stops on logout

### 2. Time-based Offline Detection

- **Threshold**: 30 seconds
- **Immediate Detection**: Checks when presence data is received
- **Periodic Refresh**: 5-second interval for stale data

### 3. Airplane Mode Handling

- **Problem**: onDisconnect handlers can't fire when already offline
- **Solution**: Time-based detection with immediate stale data checking
- **Result**: Users appear offline within 30 seconds of airplane mode

### 4. Real-time Updates

- **Messages Page**: Presence indicators update without navigation
- **Chat Screen**: Header shows real-time presence status
- **Read Receipts**: "Seen" indicators appear when messages are read

## Performance Optimizations

### 1. Memory Management

```typescript
// Clean up existing presence listeners before setting up new ones
if ((window as any).presenceUnsubscribers) {
  ;(window as any).presenceUnsubscribers.forEach((unsub: () => void) => unsub())
  ;(window as any).presenceUnsubscribers = []
}
```

### 2. Efficient Updates

```typescript
// Only trigger re-renders when presence status actually changes
const hasChanges = false
prev.forEach((presence, userId) => {
  const isActuallyOffline = PresenceService.isUserOffline(presence)
  if (isActuallyOffline && presence.status === 'online') {
    hasChanges = true
  }
})
return hasChanges ? newMap : prev
```

### 3. Network Awareness

```typescript
// Only send heartbeat when network is available
if (NetworkService.getCurrentState().isOnline) {
  await this.setUserOnline(userId)
}
```

## Debugging

### Console Logs

The system includes comprehensive debugging logs:

```typescript
console.log(`[PresenceService] Heartbeat check:`, {
  userId,
  isOnline: networkState.isOnline,
  connectionType: networkState.connectionType
})

console.log(`[PresenceService] Checking offline status:`, {
  status: presence.status,
  lastSeen: new Date(lastSeen).toISOString(),
  timeDiff: Math.round(timeDiff / 1000),
  threshold: Math.round(this.OFFLINE_THRESHOLD / 1000),
  isOffline: timeDiff > this.OFFLINE_THRESHOLD
})
```

### Testing Scenarios

1. **Normal Operation**: Heartbeat every 30 seconds
2. **Airplane Mode**: Offline detection within 30 seconds
3. **Network Drops**: Time-based detection catches stale data
4. **App Background**: Heartbeat continues, presence maintained
5. **Reconnection**: Immediate online status when network returns

## Troubleshooting

### Common Issues

1. **Presence not updating**: Check if heartbeat is running and listeners are set up
2. **Memory leaks**: Verify presence listeners are being cleaned up properly
3. **Stale data**: Check if periodic refresh is running and time-based detection is working
4. **Airplane mode**: Ensure immediate stale data detection is implemented

### Debug Steps

1. Check console logs for presence listener setup
2. Verify heartbeat is running (should see logs every 30 seconds)
3. Monitor presence data age and offline detection
4. Test with airplane mode and network drops

## Future Enhancements

1. **Typing Indicators**: Real-time typing status using RTDB
2. **Last Seen Granularity**: More precise last seen timestamps
3. **Presence History**: Track presence changes over time
4. **Custom Status**: User-defined status messages
5. **Group Presence**: Presence indicators for group conversations

## Security Considerations

1. **RTDB Rules**: Users can only write their own presence data
2. **Read Access**: All authenticated users can read presence data
3. **Data Validation**: Server-side validation of presence data format
4. **Rate Limiting**: Heartbeat throttling to prevent abuse

This documentation provides a comprehensive overview of the presence and read receipts system, including implementation details, code snippets, and troubleshooting guidance.
