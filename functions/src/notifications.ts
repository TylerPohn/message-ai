import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp()
}

interface MessageData {
  conversationId: string
  senderId: string
  text: string
  type: 'text' | 'image'
  timestamp: FieldValue
}

interface ConversationData {
  participants: string[]
  type: 'direct' | 'group'
  title?: string
}

// Trigger when a new message is created
export const onMessageCreated = onDocumentCreated(
  'messages/{messageId}',
  async (event) => {
    const db = admin.database()
    const messageData = event.data?.data() as MessageData
    const messageId = event.params.messageId

    if (!messageData) {
      logger.warn('No message data found')
      return
    }

    logger.info('New message created:', {
      messageId,
      conversationId: messageData.conversationId,
      senderId: messageData.senderId,
      type: messageData.type
    })

    // Debug Firebase Admin project info
    logger.info('Firebase Admin project info:', {
      projectId: admin.app().options.projectId,
      hasCredentials: !!admin.app().options.credential
    })

    try {
      // Test Firestore access first
      try {
        const testDoc = await admin
          .firestore()
          .collection('test')
          .doc('test')
          .get()
        logger.info('Firestore access test:', {
          success: true,
          exists: testDoc.exists
        })
      } catch (error) {
        logger.error('Firestore access test failed:', error)
      }

      // Test RTDB access and get database URL
      try {
        const db = admin.database()
        const dbUrl = db.app.options.databaseURL
        logger.info('RTDB database info:', {
          databaseURL: dbUrl,
          appName: db.app.name
        })

        // Test RTDB write
        const testRef = db.ref('test/connection')
        await testRef.set({ timestamp: Date.now(), test: true })
        logger.info('RTDB write test successful')

        // Clean up test data
        await testRef.remove()
      } catch (error) {
        logger.error('RTDB access test failed:', error)
      }

      // Get conversation data using direct Firestore reference
      logger.info('Attempting to find conversation:', {
        conversationId: messageData.conversationId,
        collection: 'conversations'
      })

      const conversationDoc = await admin
        .firestore()
        .collection('conversations')
        .doc(messageData.conversationId)
        .get()

      logger.info('Conversation lookup result:', {
        exists: conversationDoc.exists,
        id: conversationDoc.id,
        hasData: !!conversationDoc.data(),
        dataKeys: conversationDoc.data()
          ? Object.keys(conversationDoc.data()!)
          : []
      })

      if (!conversationDoc.exists) {
        logger.warn('Conversation not found:', messageData.conversationId)
        return
      }

      const conversationData = conversationDoc.data() as ConversationData
      const participants = conversationData.participants || []

      logger.info('Found conversation with participants:', {
        conversationId: messageData.conversationId,
        participants: participants.length
      })

      // Get sender profile for name using direct Firestore reference
      const senderProfileDoc = await admin
        .firestore()
        .collection('users')
        .doc(messageData.senderId)
        .get()

      const senderName = senderProfileDoc.data()?.displayName || 'Unknown User'

      // Create notifications for all participants except sender
      const notificationPromises = participants
        .filter((participantId) => participantId !== messageData.senderId)
        .map(async (participantId) => {
          const notificationData = {
            conversationId: messageData.conversationId,
            senderId: messageData.senderId,
            senderName,
            messageText: messageData.text,
            messageType: messageData.type,
            timestamp: Date.now(),
            createdAt: FieldValue.serverTimestamp()
          }

          logger.info('Attempting to write notification to RTDB:', {
            participantId,
            notificationData
          })

          try {
            // Write to RTDB notifications path
            const notificationsRef = db.ref(`notifications/${participantId}`)
            const newNotificationRef = await notificationsRef.push(
              notificationData
            )

            logger.info('Successfully created notification for user:', {
              userId: participantId,
              notificationId: newNotificationRef.key,
              conversationId: messageData.conversationId,
              rtdbPath: `notifications/${participantId}/${newNotificationRef.key}`,
              databaseURL: db.app.options.databaseURL
            })

            // Set up auto-cleanup after 24 hours
            setTimeout(async () => {
              try {
                await newNotificationRef.remove()
                logger.info(
                  'Auto-cleaned up notification:',
                  newNotificationRef.key
                )
              } catch (error) {
                logger.error('Failed to auto-cleanup notification:', error)
              }
            }, 24 * 60 * 60 * 1000) // 24 hours

            return newNotificationRef.key
          } catch (rtdbError) {
            logger.error('Failed to write notification to RTDB:', {
              participantId,
              error: rtdbError
            })
            throw rtdbError
          }
        })

      const notificationIds = await Promise.all(notificationPromises)

      logger.info('Created notifications:', {
        count: notificationIds.length,
        notificationIds
      })
    } catch (error) {
      logger.error('Failed to create notifications:', error)
    }
  }
)

// Cleanup function for old notifications (can be called periodically)
export const cleanupOldNotifications = async () => {
  try {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago

    // This would need to be implemented with a scheduled function
    // to iterate through all users and clean up old notifications
    logger.info(
      'Cleanup function called - would clean notifications older than:',
      new Date(cutoffTime)
    )
  } catch (error) {
    logger.error('Failed to cleanup old notifications:', error)
  }
}
