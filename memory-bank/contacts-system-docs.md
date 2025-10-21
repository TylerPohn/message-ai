# Contacts System Documentation

## Overview

The Contacts System provides users with the ability to save frequently contacted people for quick access. Contacts are displayed first in the new conversation flow and accessible via a dedicated Contacts screen.

## Architecture

### Data Model

**Firestore Collection: `contacts`**

```typescript
interface Contact {
  id: string
  userId: string // Owner of the contact
  contactUserId: string // The user being saved as contact
  addedAt: Date
  addedFrom: 'manual' | 'conversation' // How contact was added
}
```

### Service Layer

**ContactsService** (`services/contactsService.ts`)

```typescript
class ContactsService {
  // Add a contact
  static async addContact(
    userId: string,
    contactUserId: string,
    source: 'manual' | 'conversation'
  ): Promise<void>

  // Remove a contact
  static async removeContact(
    userId: string,
    contactUserId: string
  ): Promise<void>

  // Get all contacts for a user with their profiles
  static async getUserContacts(userId: string): Promise<UserProfile[]>

  // Check if a user is a contact
  static async isContact(
    userId: string,
    contactUserId: string
  ): Promise<boolean>

  // Listen to user contacts in real-time
  static listenToUserContacts(
    userId: string,
    callback: (contacts: UserProfile[]) => void
  ): () => void
}
```

## User Interface

### Dedicated Contacts Screen

**File**: `app/contacts/index.tsx`

**Features**:

- List of saved contacts with presence indicators
- Search functionality for filtering contacts
- Tap contact to start/open conversation
- Remove contact with confirmation dialog
- Real-time updates when contacts are added/removed
- Empty state with helpful message

**UI Elements**:

- Contact avatar with online indicator
- Display name and email
- Status message (if available)
- Presence info (online/last seen)
- Remove button with confirmation

### Enhanced New Conversation Screen

**File**: `app/chat/new.tsx`

**Layout**:

```
[Header: New Message]
[Mode Toggle: Direct | Group]

--- Contacts (3) ---
[Contact 1] [★]  ← Orange badge, filled star
[Contact 2] [★]
[Contact 3] [★]

--- All Users ---
[User 1] [☆]  ← Empty star, add contact
[User 2] [☆]
[User 3] [☆]
```

**Features**:

- Contacts section at top (max 200px height)
- All Users section below
- Star icons for add/remove contact actions
- Contact badges for visual distinction
- Search filters both contacts and users
- Maintains existing group creation functionality

### Navigation Integration

**Messages Page Header**:

- Added "Contacts" button with orange styling
- Route: `/contacts`
- Positioned between Status and Profile buttons

## Security

### Firestore Rules

```javascript
match /contacts/{contactId} {
  allow read: if request.auth != null &&
    resource.data.userId == request.auth.uid;
  allow create: if request.auth != null &&
    request.resource.data.userId == request.auth.uid;
  allow delete: if request.auth != null &&
    resource.data.userId == request.auth.uid;
}
```

**Security Features**:

- Users can only read/write their own contacts
- No approval flow needed (direct add/remove)
- Contact data is user-scoped and private

## Integration

### Real-time Synchronization

- **ContactsService**: Real-time listeners for contact changes
- **Presence Integration**: Contact presence indicators on contacts screen
- **User Management**: Seamless integration with UserService and UserCacheService
- **Messaging Integration**: Direct conversation creation from contacts

### Data Flow

```
User Action → ContactsService → Firestore → Real-time Sync → UI Update
     ↓
Contact Management → Presence Updates → UI Refresh
```

## User Experience

### Contact Management Flow

1. **Add Contact**: Tap ☆ icon on user in new conversation screen
2. **Remove Contact**: Tap ★ icon or use remove button in contacts screen
3. **View Contacts**: Access via "Contacts" button in Messages page
4. **Start Conversation**: Tap any contact to open/create conversation

### Visual Design

- **Contact Badges**: Orange circular badges on contact avatars
- **Star Icons**: ☆ (empty) for add, ★ (filled) for remove
- **Section Headers**: Clear separation between Contacts and All Users
- **Confirmation Dialogs**: Remove contact requires confirmation
- **Presence Indicators**: Green dots for online contacts

## Testing Checklist

- [x] Add contact manually from new conversation screen
- [x] Remove contact with confirmation
- [x] Contacts appear at top of new conversation screen
- [x] Dedicated contacts screen shows all contacts
- [x] Tap contact opens/creates conversation
- [x] Search filters contacts and users
- [x] Real-time updates when contacts added/removed
- [x] Presence indicators work on contacts screen
- [x] Group creation still works with contacts
- [x] Security rules prevent unauthorized access

## Implementation Status

✅ **COMPLETED** - Full contacts system implementation

**Files Created**:

- `services/contactsService.ts` - Contact management service
- `app/contacts/index.tsx` - Dedicated contacts screen

**Files Modified**:

- `types/messaging.ts` - Added Contact interface and CONTACTS collection
- `firestore.rules` - Added security rules for contacts collection
- `app/chat/index.tsx` - Added Contacts button to header
- `app/chat/new.tsx` - Enhanced with contacts section and management

**Features Implemented**:

- Manual contact adding/removing
- Real-time contact synchronization
- Presence indicators on contacts screen
- Search functionality for both contacts and users
- Visual distinction with contact badges and star icons
- Confirmation dialogs for contact removal
- Seamless integration with existing messaging system

## Future Enhancements

- **Automatic Contact Creation**: Add contacts automatically after first message exchange
- **Contact Groups**: Organize contacts into custom groups
- **Contact Import**: Import contacts from device address book
- **Contact Sharing**: Share contact information with other users
- **Contact Notes**: Add personal notes to contacts
