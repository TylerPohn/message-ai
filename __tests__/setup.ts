/**
 * Test setup and mocks for translation service tests
 */

// Mock Firebase Firestore
export const mockFirestore = {
  collection: () => mockFirestore,
  doc: () => mockFirestore,
  getDoc: async () => ({
    exists: () => true,
    data: () => ({})
  }),
  setDoc: async () => {},
  updateDoc: async () => {},
  getDocs: async () => ({
    docs: []
  })
}

// Mock fetch for API calls
export const mockFetch = (responseData: any, ok: boolean = true) => {
  global.fetch = async () =>
    ({
      ok,
      status: ok ? 200 : 500,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData)
    } as Response)
}

// Test assertion helper
export class TestAssertion {
  static assertEquals(actual: any, expected: any, message?: string) {
    const actualStr = JSON.stringify(actual, null, 2)
    const expectedStr = JSON.stringify(expected, null, 2)

    if (actualStr !== expectedStr) {
      throw new Error(
        `Assertion failed${message ? `: ${message}` : ''}\nExpected: ${expectedStr}\nActual: ${actualStr}`
      )
    }
  }

  static assertTrue(condition: boolean, message?: string) {
    if (!condition) {
      throw new Error(`Assertion failed${message ? `: ${message}` : ''}`)
    }
  }

  static assertType(value: any, expectedType: string, message?: string) {
    const actualType = typeof value
    if (actualType !== expectedType) {
      throw new Error(
        `Type assertion failed${message ? `: ${message}` : ''}\nExpected type: ${expectedType}\nActual type: ${actualType}`
      )
    }
  }

  static assertNotNull(value: any, message?: string) {
    if (value === null || value === undefined) {
      throw new Error(`Value should not be null${message ? `: ${message}` : ''}`)
    }
  }
}

// Simple test runner
export class TestRunner {
  private tests: Map<string, () => Promise<void> | void> = new Map()
  private passedCount = 0
  private failedCount = 0

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.set(name, fn)
  }

  async run() {
    console.log(`\n🧪 Running ${this.tests.size} tests...\n`)

    for (const [name, fn] of this.tests) {
      try {
        await fn()
        console.log(`✅ PASS: ${name}`)
        this.passedCount++
      } catch (error) {
        console.error(`❌ FAIL: ${name}`)
        console.error(`   ${error instanceof Error ? error.message : error}`)
        this.failedCount++
      }
    }

    console.log(`\n📊 Results: ${this.passedCount} passed, ${this.failedCount} failed\n`)

    if (this.failedCount > 0) {
      process.exit(1)
    }
  }
}
