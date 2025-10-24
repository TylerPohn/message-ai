# RAG Implementation with Context Windows

## Overview

This implementation adds RAG (Retrieval-Augmented Generation) capabilities to MessageAI, allowing every message to be embedded with conversation context and stored in Pinecone for semantic search.

## What Was Implemented

### 1. RAG Service (`services/ragService.ts`)
- **Purpose**: Handles communication with the n8n webhook for RAG operations
- **Features**:
  - `storeMessage()`: Stores messages with conversation context in the vector database
  - `query()`: Queries the RAG system for semantic search
  - Includes conversation context (last 3 messages) for better embeddings
  - Non-blocking, error-tolerant design

### 2. MessagingService Updates
- **New Method**: `getRecentMessagesForContext()`
  - Fetches the last N messages from a conversation
  - Returns them in chronological order (oldest first) for context building

- **Enhanced Method**: `sendMessage()`
  - Automatically stores every message in RAG after successful send
  - Non-blocking: RAG storage failure won't break messaging
  - Includes conversation participants and recent context

- **New Private Method**: `storeMessageInRAG()`
  - Gets conversation details
  - Finds recipient information
  - Fetches recent messages for context window
  - Calls RAGService to store the message

### 3. Environment Configuration
- Added `EXPO_PUBLIC_N8N_WEBHOOK_URL` to `.env` and `.env.sample`
- Default: `https://dcf84376d188.ngrok-free.app/webhook/rag`
- You'll need to update this with your actual n8n webhook URL

## How It Works

### Message Flow

```
User sends message
  ↓
MessagingService.sendMessage()
  ↓
1. Save to Firestore (existing functionality)
2. Update conversation
3. Call storeMessageInRAG() (async, non-blocking)
  ↓
storeMessageInRAG()
  ↓
1. Get conversation details
2. Find recipient (other participant)
3. Get recent 3 messages for context
4. Call RAGService.storeMessage()
  ↓
RAGService.storeMessage()
  ↓
Send to n8n webhook with payload:
{
  "type": "store_message",
  "messageId": "msg123",
  "chatId": "chat456",
  "senderId": "user1",
  "senderName": "Maria",
  "recipientId": "user2",
  "recipientName": "Tyler",
  "currentMessage": "La boda es el 15 de julio",
  "language": "es",
  "timestamp": "2025-01-24T10:30:00Z",
  "conversationContext": [
    {
      "sender": "Tyler",
      "text": "When is your sister's wedding?",
      "timestamp": "2025-01-24T10:29:00Z"
    },
    {
      "sender": "Maria",
      "text": "La boda es el 15 de julio",
      "timestamp": "2025-01-24T10:30:00Z"
    }
  ]
}
```

### n8n Workflow (What You Need to Configure)

Your n8n workflow should:

1. **Receive webhook** with the payload above
2. **Check request type**:
   - If `type === "store_message"` → embedding flow
   - If `type === "rag_query"` → query flow
3. **Build context text**:
   ```javascript
   const contextText = conversationContext
     .map(msg => `${msg.sender}: ${msg.text}`)
     .join('\n');
   ```
4. **Generate embedding** using OpenAI Embeddings (text-embedding-3-small)
5. **Store in Pinecone** with metadata:
   ```json
   {
     "text": "Tyler: When is your sister's wedding?\nMaria: La boda es el 15 de julio",
     "message_id": "msg123",
     "chat_id": "chat456",
     "sender_id": "user1",
     "sender_name": "Maria",
     "recipient_id": "user2",
     "recipient_name": "Tyler",
     "current_message": "La boda es el 15 de julio",
     "language": "es",
     "timestamp": "2025-01-24T10:30:00Z",
     "date": "2025-01-24",
     "month": "2025-01"
   }
   ```

## Configuration

### 1. Update your .env file

```bash
# Update this with your actual n8n webhook URL
EXPO_PUBLIC_N8N_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/webhook/rag
```

### 2. Configure your n8n workflow

**Webhook URL**: Use the URL from your .env file

**Workflow nodes**:
1. Webhook (trigger)
2. IF node (check type === "store_message")
3. Code node (build context text)
4. OpenAI Embeddings node (text-embedding-3-small, dimension: 1536)
5. Pinecone Default Data Loader (store with metadata)

See the conversation transcript for detailed n8n node configurations.

### 3. Set up Pinecone

- **Index name**: `babel-events` (or your choice)
- **Dimension**: `1536` (for OpenAI text-embedding-3-small)
- **Metric**: `cosine`
- **Manage your own embeddings**: Enabled (NOT integrated embedding)

## What Gets Stored

**Every message** sent through MessageAI will be:
1. Embedded with conversation context (last 3 messages)
2. Stored in Pinecone with full metadata
3. Searchable by semantic meaning

**Context Window**: 3 messages
- Provides enough context for understanding
- Balances cost and quality
- Can be adjusted in `MessagingService.getRecentMessagesForContext()`

## Benefits

### 1. Semantic Search
- "What did Maria say about her family?" → finds relevant messages
- Works across all languages
- Understands context and meaning

### 2. Full Conversation History
- Every message is searchable
- No information loss
- Timeline of all interactions

### 3. Better Embeddings
**Before (no context)**:
```
Embedded: "La boda es el 15 de julio"
```
Limited understanding without context.

**After (with context)**:
```
Embedded:
"Tyler: When is your sister's wedding?
Maria: La boda es el 15 de julio"
```
The embedding now understands it's about a wedding, Maria's sister, and the date.

## Usage

### Automatic Storage
Every message is automatically stored - no code changes needed in your app!

### Querying (Future Enhancement)
```typescript
import { RAGService } from '@/services/ragService'

// Query the RAG system
const results = await RAGService.query(
  "When is Maria's sister's wedding?",
  chatId,  // optional: limit to specific chat
  userId   // optional: limit to specific user
)
```

## Error Handling

- **Non-blocking**: RAG failures won't break messaging
- **Graceful degradation**: If n8n is down, messages still send normally
- **Logging**: All errors are logged for debugging
- **Retry-safe**: Messages can be re-processed if needed

## Performance

- **Async storage**: Doesn't slow down message sending
- **Context caching**: Recent messages are fetched efficiently
- **Batch-friendly**: Can process offline queue when reconnected

## Cost Estimation

**Per message**:
- 1 embedding call (~$0.0001)
- 1 Pinecone upsert (~$0.00001)
- **Total**: ~$0.00011 per message

**1000 messages/day**:
- Daily cost: ~$0.11
- Monthly cost: ~$3.30

Very affordable for a demo!

## Testing

### 1. Manual Test
1. Send a message in MessageAI
2. Check n8n execution log (should see webhook triggered)
3. Check Pinecone console (should see new vector added)
4. Check MessageAI console logs for RAG storage confirmation

### 2. Test Payload
```json
{
  "type": "store_message",
  "messageId": "test123",
  "chatId": "chat456",
  "senderId": "user1",
  "senderName": "Test User",
  "recipientId": "user2",
  "recipientName": "Recipient",
  "currentMessage": "Hello, how are you?",
  "language": "en",
  "timestamp": "2025-01-24T10:30:00Z",
  "conversationContext": [
    {
      "sender": "Test User",
      "text": "Hello, how are you?",
      "timestamp": "2025-01-24T10:30:00Z"
    }
  ]
}
```

## Troubleshooting

### Messages not being stored in RAG

**Check**:
1. Is `EXPO_PUBLIC_N8N_WEBHOOK_URL` set in .env?
2. Is n8n workflow active?
3. Check MessageAI console logs for errors
4. Check n8n execution log

**Common issues**:
- Ngrok URL expired → update .env
- n8n workflow not active → activate it
- Pinecone API key invalid → regenerate

### Embeddings failing

**Check**:
1. OpenAI API key is valid
2. Pinecone index dimension is 1536
3. n8n OpenAI node is configured correctly

### Storage but no search results

**Check**:
1. Pinecone index exists
2. Vectors are being stored (check Pinecone console)
3. Query workflow is implemented

## Next Steps

### Phase 1: Query Interface (Recommended)
Build the query workflow in n8n:
1. Webhook receives `rag_query` type
2. Embed the query text
3. Search Pinecone for similar vectors
4. Return top K results with metadata

### Phase 2: UI Integration
Add search interface to MessageAI:
- Search bar in chat screen
- "Search conversations" feature
- Timeline view of events

### Phase 3: Advanced Features
- Life event extraction (original plan)
- Smart summaries
- Reminder system
- Export conversations

## Files Modified

1. **services/ragService.ts** (NEW)
   - RAG integration service

2. **services/messagingService.ts**
   - Added RAG storage integration
   - Added context fetching helper

3. **.env**
   - Added `EXPO_PUBLIC_N8N_WEBHOOK_URL`

4. **.env.sample**
   - Added example RAG webhook URL

## Architecture Decisions

### Why Context Windows?
- Provides semantic context for better embeddings
- Minimal overhead (only 3 messages)
- Balances cost and quality

### Why Non-blocking?
- RAG storage shouldn't slow down messaging
- Graceful degradation if RAG is unavailable
- User experience is paramount

### Why Store Everything?
- Demo app doesn't need optimization
- Full conversation history is impressive
- Can add smart filtering later

### Why Pinecone?
- Easy integration with n8n
- Good free tier
- Fast vector search
- Good documentation

## Support

If you encounter issues:
1. Check the console logs (MessageAI app)
2. Check n8n execution logs
3. Check Pinecone console
4. Review this document

For n8n workflow configuration, refer to the conversation transcript where detailed node configurations were provided.

---

**Implementation Date**: January 24, 2025
**Version**: 1.0.0
**Status**: ✅ Complete - Ready for testing
