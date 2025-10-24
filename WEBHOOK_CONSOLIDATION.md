# n8n Webhook Consolidation - Complete ✅

## Overview
Consolidated all n8n requests (translation + RAG) to use a **single webhook endpoint** with type-based routing.

---

## Changes Made

### 1. **services/translateService.ts**
- ✅ Changed `EXPO_PUBLIC_TRANSLATION_ENDPOINT` → `EXPO_PUBLIC_N8N_WEBHOOK_URL`
- ✅ Added `type: "translate"` to all request payloads:
  - `detectLanguage()` → `{ type: "translate", action: "detect", message: ... }`
  - `translateMessage()` → `{ type: "translate", message: ..., target_lang: ... }`

### 2. **app.json**
- ✅ Updated `extra` configuration:
  - Removed: `EXPO_PUBLIC_TRANSLATION_ENDPOINT`
  - Added: `EXPO_PUBLIC_N8N_WEBHOOK_URL`

### 3. **services/ragService.ts** (no changes needed)
- ✅ Already uses `EXPO_PUBLIC_N8N_WEBHOOK_URL`
- ✅ Already sends `type: "store_message"` and `type: "rag_query"`

---

## Request Types

All requests now go to `EXPO_PUBLIC_N8N_WEBHOOK_URL` with different `type` values:

### **Translation Requests**
```json
{
  "type": "translate",
  "message": "Hello, how are you?",
  "target_lang": "es"
}
```

or for language detection:
```json
{
  "type": "translate",
  "action": "detect",
  "message": "Hola, ¿cómo estás?"
}
```

### **RAG Storage Requests**
```json
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
  "conversationContext": [...]
}
```

### **RAG Query Requests**
```json
{
  "type": "rag_query",
  "query": "When is Maria's sister's wedding?",
  "chatId": "chat456",
  "userId": "user1"
}
```

---

## n8n IF Node Configuration

Your n8n webhook should route based on `$json.type`:

```
IF {{ $json.type }} is equal to "translate"
  → Translation flow (existing)

IF {{ $json.type }} is equal to "store_message"
  → RAG storage flow (new)

IF {{ $json.type }} is equal to "rag_query"
  → RAG query flow (future)
```

### Screenshot Reference
Based on your image, the IF node conditions should be:
- **Condition 1**: `{{ $json.type }}` is equal to `translate`
- **Condition 2**: `{{ $json.type }}` is equal to `rag_query` (or `store_message`)

---

## Environment Variables

### **.env** (user should configure)
```bash
# Single n8n webhook endpoint for all requests
EXPO_PUBLIC_N8N_WEBHOOK_URL=https://dcf84376d188.ngrok-free.app/webhook/6892b11f-2744-49b2-99c6-03d5ed31c822
```

### **app.json**
```json
{
  "extra": {
    "EXPO_PUBLIC_N8N_WEBHOOK_URL": "http://localhost:5678/webhook-test/6892b11f-2744-49b2-99c6-03d5ed31c822"
  }
}
```

---

## Benefits

✅ **Single endpoint** - Easier to manage and update
✅ **Type-based routing** - Clean separation of concerns
✅ **Centralized logging** - All requests flow through one webhook
✅ **Easier debugging** - One place to check for issues
✅ **Consistent error handling** - Shared webhook infrastructure

---

## Testing

### 1. **Test Translation** (existing functionality)
Send a message in MessageAI and it should translate as before.

**Expected n8n payload:**
```json
{
  "type": "translate",
  "message": "Hello",
  "target_lang": "es"
}
```

### 2. **Test RAG Storage** (new functionality)
Send a message and check n8n execution logs.

**Expected n8n payload:**
```json
{
  "type": "store_message",
  "messageId": "...",
  "currentMessage": "...",
  "conversationContext": [...]
}
```

### 3. **Check n8n Routing**
In n8n execution logs, you should see:
- Translation requests routed to translation flow
- RAG requests routed to RAG flow

---

## Troubleshooting

### Translation not working
**Check:**
1. Is `EXPO_PUBLIC_N8N_WEBHOOK_URL` set in .env?
2. Does the n8n IF node check for `type === "translate"`?
3. Is the translation flow connected to the correct IF output?

### RAG storage not working
**Check:**
1. Does the n8n IF node check for `type === "store_message"`?
2. Is the RAG flow connected to the correct IF output?
3. Check n8n execution logs for routing

### Requests not reaching n8n
**Check:**
1. Is the ngrok URL still valid?
2. Is n8n workflow active?
3. Check MessageAI console logs for errors

---

## Migration Notes

**Old way (deprecated):**
- ❌ `EXPO_PUBLIC_TRANSLATION_ENDPOINT` for translations
- ❌ `EXPO_PUBLIC_N8N_WEBHOOK_URL` for RAG
- ❌ Two separate endpoints

**New way (current):**
- ✅ `EXPO_PUBLIC_N8N_WEBHOOK_URL` for everything
- ✅ `type` field routes to correct flow
- ✅ Single unified endpoint

---

## Files Modified

1. **services/translateService.ts**
   - Updated endpoint variable name
   - Added `type: "translate"` to all requests
   - Updated error messages

2. **app.json**
   - Changed `EXPO_PUBLIC_TRANSLATION_ENDPOINT` → `EXPO_PUBLIC_N8N_WEBHOOK_URL`

3. **No changes to:**
   - `.env` (user manages this)
   - `.env.sample` (already updated in previous implementation)
   - `services/ragService.ts` (already correct)

---

**Status**: ✅ Complete - Ready for testing
**Date**: January 24, 2025
**Version**: 2.0.0 (Webhook Consolidation)
