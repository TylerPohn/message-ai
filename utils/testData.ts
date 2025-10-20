import { MessagingService } from '@/services/messagingService'

// Utility functions for creating test data
export class TestDataUtils {
  // Create a test conversation between two users
  static async createTestConversation(
    user1Id: string,
    user2Id: string,
    user1Name: string,
    user2Name: string
  ): Promise<string> {
    const conversationId = await MessagingService.createConversation(
      [user1Id, user2Id],
      'direct'
    )

    // Send some test messages
    await MessagingService.sendMessage(
      conversationId,
      user1Id,
      user1Name,
      'Hello! This is a test message.'
    )

    await MessagingService.sendMessage(
      conversationId,
      user2Id,
      user2Name,
      'Hi there! How are you?'
    )

    await MessagingService.sendMessage(
      conversationId,
      user1Id,
      user1Name,
      "I'm doing great! Thanks for asking. This is testing message persistence."
    )

    return conversationId
  }

  // Create a test group conversation
  static async createTestGroupConversation(
    participants: string[],
    adminId: string,
    title: string = 'Test Group Chat'
  ): Promise<string> {
    const conversationId = await MessagingService.createConversation(
      participants,
      'group',
      title,
      adminId
    )

    // Send a welcome message
    await MessagingService.sendMessage(
      conversationId,
      adminId,
      'Admin',
      `Welcome to ${title}! This is a test group conversation.`
    )

    return conversationId
  }
}
