# RAG Storage Testing Guide

## Quick Test

Run this command to test your RAG storage workflow:

```bash
npx tsx test-rag-storage.ts
```

---

## What This Test Does

The test script sends a realistic payload to your n8n webhook, simulating exactly what MessageAI would send:

```json
{
  "type": "store_message",
  "messageId": "test_123456789",
  "chatId": "test_chat_456",
  "senderId": "test_user1",
  "senderName": "Maria",
  "recipientId": "test_user2",
  "recipientName": "Tyler",
  "currentMessage": "La boda de mi hermana es el 15 de julio en Barcelona",
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
      "text": "La boda de mi hermana es el 15 de julio en Barcelona",
      "timestamp": "2025-01-24T10:30:00Z"
    }
  ]
}
```

---

## Expected Flow

### 1. **Webhook Receives Request**
- n8n webhook should accept the POST request
- Status: 200 OK

### 2. **IF Node Routes Correctly**
- First IF node checks `$json.type`
- Should route to **false** branch (not translation)
- Second IF1 node checks `$json.type === "store_message"`
- Should route to **true** branch (RAG extraction)

### 3. **LLM Extracts Events**
- "Message a model1" node processes the conversation
- Should extract:
  ```json
  {
    "events": [
      {
        "event_type": "relationship_change" or "milestone",
        "person": "Maria's sister",
        "date": "2025-07-15",
        "details": "Wedding in Barcelona",
        "sentiment": "positive",
        "language": "es"
      }
    ]
  }
  ```

### 4. **Code Node Processes**
- Parses LLM response
- Creates individual items for each event
- Adds metadata (chatId, timestamps, etc.)
- Generates `text` field for embedding

### 5. **Embeddings Created**
- Embeddings OpenAI node converts text to vector
- Dimension: 1536 (for text-embedding-3-small)

### 6. **Pinecone Storage**
- Vector stored with metadata
- Check Pinecone console to verify

---

## Interpreting Results

### ✅ **Success Output:**
```
🧪 RAG Storage Test
==================

📡 Webhook URL: https://your-url.ngrok-free.app/webhook/...

📤 Sending test payload:
{...}

⏳ Waiting for response...

📥 Response received in 1234ms
Status: 200 OK

✅ Success! Response data:
{...}

📊 Test Summary:
================
✅ Webhook reachable: Yes
✅ Request accepted: Yes (200)
✅ Response time: 1234ms
✅ Message ID: test_123456789
```

### ❌ **Failure Scenarios:**

**1. Webhook not reachable**
```
❌ Test failed!
Error: fetch failed
```
**Fix**: Check that n8n is running and ngrok URL is valid

**2. Wrong routing (goes to translation)**
```
Status: 200 OK
Response: (translation response instead of RAG)
```
**Fix**: Check IF node condition (`type === "store_message"`)

**3. LLM extraction fails**
```
Status: 500 Internal Server Error
```
**Fix**: Check "Message a model1" system prompt and user message format

**4. Code node error**
```
Error in Code node
```
**Fix**: Check JavaScript code syntax and variable names

**5. Pinecone connection fails**
```
Error: Pinecone authentication failed
```
**Fix**: Check Pinecone API key and index name

---

## Verification Steps

### 1. Check n8n Execution Logs

Go to n8n → Executions tab → Find your test execution

**Verify each node:**
- ✅ **Webhook**: Shows incoming payload
- ✅ **IF**: Routes to false branch
- ✅ **IF1**: Routes to true branch (store_message)
- ✅ **Message a model1**: Shows LLM response with extracted events
- ✅ **Code in JavaScript**: Shows processed events array
- ✅ **Pinecone Vector Store**: Shows successful insertion

### 2. Check Pinecone Console

1. Go to https://app.pinecone.io
2. Select your "babel-events" index
3. Click **"Query"** tab
4. Look for recent vectors

**Verify metadata:**
- `event_type`: "relationship_change" or similar
- `person`: "Maria's sister"
- `details`: Contains wedding information
- `chatId`: "test_chat_456"
- `language`: "es"

### 3. Test from MessageAI

If test script succeeds:
1. Open MessageAI app
2. Send a real message with life event information
3. Check that it appears in Pinecone

---

## Troubleshooting

### Problem: Test runs but nothing in Pinecone

**Check:**
1. Pinecone API key is valid
2. Index name matches exactly ("babel-events")
3. Index dimension is 1536
4. n8n execution log shows successful storage

### Problem: Wrong data extracted

**Check:**
1. System prompt in "Message a model1" is correct
2. User message references correct fields (`$json.conversationContext`)
3. LLM is returning valid JSON

### Problem: Code node fails

**Check:**
1. Code expects correct input structure
2. Variables match incoming data
3. No syntax errors in JavaScript

### Problem: Slow response (> 10 seconds)

**This is normal!** The workflow:
- Calls OpenAI LLM for extraction (~2-3s)
- Generates embeddings (~1-2s)
- Stores in Pinecone (~1s)

Total: 4-6 seconds is typical

---

## Advanced Testing

### Test Multiple Messages

Modify `test-rag-storage.ts` to send multiple messages:

```typescript
const messages = [
  {
    currentMessage: "Got promoted to Senior Engineer!",
    conversationContext: [...]
  },
  {
    currentMessage: "Moving to Barcelona next month",
    conversationContext: [...]
  },
  {
    currentMessage: "Baby girl born on March 15th!",
    conversationContext: [...]
  }
]

for (const msg of messages) {
  await testRAGStorage(msg)
  await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2s between
}
```

### Test Query Flow (Future)

Once you implement the query workflow:

```bash
npx tsx test-rag-query.ts
```

---

## Success Checklist

Before moving to production testing:

- [ ] Test script runs without errors
- [ ] n8n execution log shows all nodes succeeded
- [ ] Pinecone console shows new vectors
- [ ] Metadata is populated correctly
- [ ] Response time is acceptable (< 10s)
- [ ] Can reproduce success multiple times

---

## Next Steps After Successful Test

1. ✅ Test with MessageAI app (send real message)
2. ✅ Verify automatic storage on every message
3. ✅ Check Pinecone index grows with messages
4. ✅ Build query workflow (rag_query type)
5. ✅ Add UI for searching conversations

---

**Good luck testing!** 🚀
