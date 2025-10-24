/**
 * RAG Query Test Script
 *
 * Tests the n8n webhook endpoint to verify:
 * - Request routing (type: "rag_query")
 * - Pinecone vector search
 * - Semantic similarity matching
 * - Result formatting
 *
 * Run with: npx tsx test-rag-query.ts
 */

import 'dotenv/config'

// Get webhook URL from environment
const WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL

if (!WEBHOOK_URL) {
  console.error('❌ EXPO_PUBLIC_N8N_WEBHOOK_URL not set in .env')
  console.error('Please add it to your .env file')
  process.exit(1)
}

console.log('🔍 RAG Query Test')
console.log('=================\n')
console.log(`📡 Webhook URL: ${WEBHOOK_URL}\n`)

// Test payload - simulates what MessageAI will send
const testPayload = {
  type: 'rag_query',
  query: "When is Maria's sister's wedding?",
  chatId: 'test_chat_456',
  userId: 'test_user1',
  limit: 5,
  target_lang: 'ja' // Language for the LLM answer (Japanese)
}

console.log('📤 Sending query:')
console.log(`   "${testPayload.query}"`)
console.log(`   Chat ID: ${testPayload.chatId}`)
console.log(`   Limit: ${testPayload.limit}`)
console.log(`   Answer language: ${testPayload.target_lang}`)
console.log('\n⏳ Waiting for response...\n')

// Send request
async function testRAGQuery() {
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
    console.log('')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Request failed!')
      console.error('Response body:', errorText)
      process.exit(1)
    }

    // Parse JSON response
    const contentType = response.headers.get('content-type')
    let responseData

    if (contentType?.includes('application/json')) {
      responseData = await response.json()
    } else {
      const textData = await response.text()
      console.log('⚠️  Non-JSON response:')
      console.log(textData)
      process.exit(1)
    }

    // Display results
    console.log('✅ Query completed successfully!\n')

    // Debug: log full response
    console.log('🔍 Full Response (Debug):')
    console.log(JSON.stringify(responseData, null, 2))
    console.log('')

    if (responseData.success) {
      // Display LLM-generated answer prominently
      // Handle both nested and direct answer formats
      const answer = responseData.answer?.answer || responseData.answer

      if (answer) {
        console.log('💬 Answer:')
        console.log('==========')
        console.log(`"${answer}"`)
        console.log('')
      }

      console.log('📊 Results Summary:')
      console.log('==================')
      console.log(`Query: "${responseData.query}"`)
      console.log(`Found: ${responseData.count} relevant event(s)`)
      console.log('')

      if (responseData.results && responseData.results.length > 0) {
        console.log('🎯 Matching Events (Structured Data):')
        console.log('=====================================\n')

        responseData.results.forEach((result: any, i: number) => {
          const relevancePercent = ((result.score || 0) * 100).toFixed(1)

          console.log(`${i + 1}. ${result.event_type.toUpperCase()}: ${result.person}`)
          console.log(`   📅 Date: ${result.date}`)
          console.log(`   📝 Details: ${result.details}`)
          console.log(`   💬 Language: ${result.language}`)
          console.log(`   😊 Sentiment: ${result.sentiment}`)
          console.log(`   🎯 Relevance: ${relevancePercent}%`)
          console.log('')
        })
      } else {
        console.log('⚠️  No matching events found')
        console.log('   This could mean:')
        console.log('   - No events stored in Pinecone yet')
        console.log('   - Query didn\'t match any stored events')
        console.log('   - Try running test-rag-storage.ts first')
      }
    } else {
      console.log('⚠️  Response indicates failure:')
      console.log(JSON.stringify(responseData, null, 2))
    }

    console.log('\n📊 Test Summary:')
    console.log('================')
    console.log(`✅ Webhook reachable: Yes`)
    console.log(`✅ Request accepted: Yes (${response.status})`)
    console.log(`✅ Response time: ${duration}ms`)
    console.log(`✅ Results returned: ${responseData.count || 0}`)

    console.log('\n🔍 Next Steps:')
    console.log('==============')
    console.log('1. Check n8n execution logs to verify:')
    console.log('   - IF node routed to rag_query branch')
    console.log('   - IF1 node routed to query flow (false branch)')
    console.log('   - Pinecone retrieval succeeded')
    console.log('   - Code node formatted results')
    console.log('   - LLM generated natural language answer')
    console.log('')
    console.log('2. If no results found:')
    console.log('   - Run test-rag-storage.ts to store test data first')
    console.log('   - Check Pinecone console for stored vectors')
    console.log('   - Verify query matches stored event details')
    console.log('')
    console.log('3. Test different languages:')
    console.log('   - Change testPayload.language to "es", "fr", etc.')
    console.log('   - Verify LLM answers in requested language')
    console.log('')
    console.log('4. If successful, implement query UI in MessageAI!')

  } catch (error) {
    console.error('❌ Test failed!')
    console.error('Error:', error)

    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('\n💡 Possible issues:')
      console.error('- Webhook URL is incorrect')
      console.error('- n8n is not running')
      console.error('- Network connectivity issue')
      console.error('- CORS issue (if testing from browser)')
    } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.error('\n💡 Possible issues:')
      console.error('- n8n workflow not returning JSON')
      console.error('- Missing "Respond to Webhook" node in query flow')
      console.error('- Check n8n execution logs for errors')
    }

    process.exit(1)
  }
}

// Run the test
testRAGQuery()
