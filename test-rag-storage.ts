/**
 * RAG Storage Test Script
 *
 * Tests the n8n webhook endpoint to verify:
 * - Request routing (type: "store_message")
 * - Life event extraction
 * - Embedding generation
 * - Pinecone storage
 *
 * Run with: npx tsx test-rag-storage.ts
 */

import 'dotenv/config'

// Get webhook URL from environment
const WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL

if (!WEBHOOK_URL) {
  console.error('❌ EXPO_PUBLIC_N8N_WEBHOOK_URL not set in .env')
  console.error('Please add it to your .env file')
  process.exit(1)
}

console.log('🧪 RAG Storage Test')
console.log('==================\n')
console.log(`📡 Webhook URL: ${WEBHOOK_URL}\n`)

// Test payload - simulates what MessageAI sends
const testPayload = {
  type: 'store_message',
  messageId: 'test_' + Date.now(),
  chatId: 'test_chat_456',
  senderId: 'test_user1',
  senderName: 'Maria',
  recipientId: 'test_user2',
  recipientName: 'Tyler',
  currentMessage: 'La boda de mi hermana es el 15 de julio en Barcelona',
  language: 'es',
  timestamp: new Date().toISOString(),
  conversationContext: [
    {
      sender: 'Tyler',
      text: 'When is your sister\'s wedding?',
      timestamp: new Date(Date.now() - 60000).toISOString() // 1 minute ago
    },
    {
      sender: 'Maria',
      text: 'La boda de mi hermana es el 15 de julio en Barcelona',
      timestamp: new Date().toISOString()
    }
  ]
}

console.log('📤 Sending test payload:')
console.log(JSON.stringify(testPayload, null, 2))
console.log('\n⏳ Waiting for response...\n')

// Send request
async function testRAGStorage() {
  try {
    const startTime = Date.now()

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`📥 Response received in ${duration}ms`)
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()))
    console.log('')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Request failed!')
      console.error('Response body:', errorText)
      process.exit(1)
    }

    // Try to parse JSON response
    const contentType = response.headers.get('content-type')
    let responseData

    if (contentType?.includes('application/json')) {
      responseData = await response.json()
      console.log('✅ Success! Response data:')
      console.log(JSON.stringify(responseData, null, 2))
    } else {
      const textData = await response.text()
      console.log('✅ Success! Response (text):')
      console.log(textData)
    }

    console.log('\n📊 Test Summary:')
    console.log('================')
    console.log(`✅ Webhook reachable: Yes`)
    console.log(`✅ Request accepted: Yes (${response.status})`)
    console.log(`✅ Response time: ${duration}ms`)
    console.log(`✅ Message ID: ${testPayload.messageId}`)

    console.log('\n🔍 Next Steps:')
    console.log('==============')
    console.log('1. Check n8n execution logs to verify:')
    console.log('   - IF node routed to store_message branch')
    console.log('   - LLM extracted life events')
    console.log('   - Code node processed events')
    console.log('   - Pinecone storage succeeded')
    console.log('')
    console.log('2. Check Pinecone console:')
    console.log('   - Go to your "babel-events" index')
    console.log('   - Look for new vectors with metadata')
    console.log('   - Verify event_type, person, details are stored')
    console.log('')
    console.log('3. If successful, test from MessageAI app!')

  } catch (error) {
    console.error('❌ Test failed!')
    console.error('Error:', error)

    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('\n💡 Possible issues:')
      console.error('- Webhook URL is incorrect')
      console.error('- n8n is not running')
      console.error('- Network connectivity issue')
      console.error('- CORS issue (if testing from browser)')
    }

    process.exit(1)
  }
}

// Run the test
testRAGStorage()
