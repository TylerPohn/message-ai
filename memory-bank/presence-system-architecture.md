# Presence System Architecture

## System Overview

```mermaid
graph TB
    subgraph "Client A"
        A1[AuthContext] --> A2[PresenceService]
        A2 --> A3[Heartbeat System]
        A3 --> A4[RTDB Presence]
        A2 --> A5[Network Detection]
    end

    subgraph "Firebase"
        B1[Realtime Database]
        B2[Firestore]
        B3[Auth]
    end

    subgraph "Client B"
        C1[AuthContext] --> C2[PresenceService]
        C2 --> C3[Presence Listeners]
        C3 --> C4[UI Components]
        C2 --> C5[Time-based Detection]
    end

    A4 --> B1
    B1 --> C3
    A1 --> B3
    C1 --> B3
    A2 --> B2
    C2 --> B2
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant UserA as User A
    participant AuthA as AuthContext A
    participant PS as PresenceService
    participant RTDB as Realtime DB
    participant UserB as User B
    participant UI as UI Components

    UserA->>AuthA: Login
    AuthA->>PS: Initialize & Start Heartbeat
    PS->>RTDB: Set Online Status
    PS->>PS: Start 30s Heartbeat

    loop Every 30 seconds
        PS->>RTDB: Update Presence
    end

    UserB->>UI: Open Messages
    UI->>PS: Listen to User A Presence
    PS->>RTDB: Subscribe to User A
    RTDB->>PS: Presence Data
    PS->>UI: Update Status

    Note over UserA: Airplane Mode
    UserA->>PS: Network Lost
    PS->>PS: Heartbeat Stops

    Note over PS: 30s Threshold
    PS->>PS: Detect Stale Data
    PS->>UI: Mark Offline
    UI->>UserB: Show "Last seen"
```

## Component Interaction

```mermaid
graph LR
    subgraph "PresenceService"
        P1[setUserOnline]
        P2[setUserOffline]
        P3[startHeartbeat]
        P4[listenToUserPresence]
        P5[isUserOffline]
    end

    subgraph "UI Components"
        U1[Messages Page]
        U2[Chat Screen]
        U3[Presence Indicators]
        U4[Read Receipts]
    end

    subgraph "Data Sources"
        D1[RTDB Presence]
        D2[Firestore Memberships]
        D3[Network State]
    end

    P1 --> D1
    P2 --> D1
    P3 --> P1
    P4 --> D1
    P5 --> U1
    P5 --> U2
    D1 --> U3
    D2 --> U4
    D3 --> P3
```

## Heartbeat System Flow

```mermaid
flowchart TD
    A[User Login] --> B[Start Heartbeat]
    B --> C{Network Online?}
    C -->|Yes| D[Send Heartbeat]
    C -->|No| E[Skip Heartbeat]
    D --> F[Wait 30s]
    E --> F
    F --> C

    G[User Logout] --> H[Stop Heartbeat]
    H --> I[Cleanup Listeners]

    J[App Background] --> K[Continue Heartbeat]
    K --> C
```

## Time-based Detection Flow

```mermaid
flowchart TD
    A[Receive Presence Data] --> B[Check Data Age]
    B --> C{Age > 30s?}
    C -->|Yes| D[Mark as Offline]
    C -->|No| E[Keep Online Status]
    D --> F[Update UI]
    E --> F

    G[Periodic Refresh] --> H[Check All Presence]
    H --> I[Update Stale Data]
    I --> F
```

## Error Handling

```mermaid
graph TD
    A[Network Error] --> B[Retry Logic]
    B --> C{Max Retries?}
    C -->|No| D[Exponential Backoff]
    C -->|Yes| E[Mark Offline]
    D --> B

    F[RTDB Error] --> G[Fallback to Time-based]
    G --> H[Show Last Known Status]

    I[Auth Error] --> J[Stop Heartbeat]
    J --> K[Cleanup Listeners]
```

## Performance Monitoring

```mermaid
graph LR
    A[Heartbeat Metrics] --> B[Network Usage]
    C[Presence Updates] --> D[UI Performance]
    E[Memory Usage] --> F[Listener Cleanup]
    G[Error Rates] --> H[Debug Logging]
```

This architecture documentation provides a comprehensive view of how the presence system works, including data flow, component interactions, and error handling scenarios.
