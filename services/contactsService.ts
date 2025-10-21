import { db } from '@/firebaseConfig'
import { COLLECTIONS, Contact, UserProfile } from '@/types/messaging'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore'
import { UserService } from './userService'

export class ContactsService {
  // Add a contact
  static async addContact(
    userId: string,
    contactUserId: string,
    source: 'manual' | 'conversation' = 'manual'
  ): Promise<void> {
    try {
      // Check if contact already exists
      const existingContact = await this.isContact(userId, contactUserId)
      if (existingContact) {
        console.log('Contact already exists')
        return
      }

      // Create contact document
      await addDoc(collection(db, COLLECTIONS.CONTACTS), {
        userId,
        contactUserId,
        addedAt: serverTimestamp(),
        addedFrom: source
      })

      console.log(`Contact added: ${contactUserId} to ${userId}`)
    } catch (error) {
      console.error('Error adding contact:', error)
      throw error
    }
  }

  // Remove a contact
  static async removeContact(
    userId: string,
    contactUserId: string
  ): Promise<void> {
    try {
      // Find the contact document
      const contactsQuery = query(
        collection(db, COLLECTIONS.CONTACTS),
        where('userId', '==', userId),
        where('contactUserId', '==', contactUserId)
      )

      const contactsSnapshot = await getDocs(contactsQuery)
      if (contactsSnapshot.empty) {
        console.log('Contact not found')
        return
      }

      // Delete the contact document
      const contactDoc = contactsSnapshot.docs[0]
      await deleteDoc(doc(db, COLLECTIONS.CONTACTS, contactDoc.id))

      console.log(`Contact removed: ${contactUserId} from ${userId}`)
    } catch (error) {
      console.error('Error removing contact:', error)
      throw error
    }
  }

  // Get all contacts for a user with their profiles
  static async getUserContacts(userId: string): Promise<UserProfile[]> {
    try {
      const contactsQuery = query(
        collection(db, COLLECTIONS.CONTACTS),
        where('userId', '==', userId)
      )

      const contactsSnapshot = await getDocs(contactsQuery)
      const contactUserIds = contactsSnapshot.docs.map(
        (doc) => doc.data().contactUserId
      )

      if (contactUserIds.length === 0) {
        return []
      }

      // Get user profiles for all contacts
      const userProfiles = await UserService.searchUsers(userId, '')
      const contactProfiles = userProfiles.filter((profile) =>
        contactUserIds.includes(profile.uid)
      )

      return contactProfiles
    } catch (error) {
      console.error('Error fetching user contacts:', error)
      throw error
    }
  }

  // Check if a user is a contact
  static async isContact(
    userId: string,
    contactUserId: string
  ): Promise<boolean> {
    try {
      const contactsQuery = query(
        collection(db, COLLECTIONS.CONTACTS),
        where('userId', '==', userId),
        where('contactUserId', '==', contactUserId)
      )

      const contactsSnapshot = await getDocs(contactsQuery)
      return !contactsSnapshot.empty
    } catch (error) {
      console.error('Error checking contact status:', error)
      return false
    }
  }

  // Listen to user contacts in real-time
  static listenToUserContacts(
    userId: string,
    callback: (contacts: UserProfile[]) => void
  ): () => void {
    const contactsQuery = query(
      collection(db, COLLECTIONS.CONTACTS),
      where('userId', '==', userId)
    )

    return onSnapshot(contactsQuery, async (contactsSnapshot) => {
      try {
        const contactUserIds = contactsSnapshot.docs.map(
          (doc) => doc.data().contactUserId
        )

        if (contactUserIds.length === 0) {
          callback([])
          return
        }

        // Get user profiles for all contacts
        const userProfiles = await UserService.searchUsers(userId, '')
        const contactProfiles = userProfiles.filter((profile) =>
          contactUserIds.includes(profile.uid)
        )

        callback(contactProfiles)
      } catch (error) {
        console.error('Error in contacts listener:', error)
        callback([])
      }
    })
  }

  // Get contact documents for a user
  static async getUserContactDocuments(userId: string): Promise<Contact[]> {
    try {
      const contactsQuery = query(
        collection(db, COLLECTIONS.CONTACTS),
        where('userId', '==', userId)
      )

      const contactsSnapshot = await getDocs(contactsQuery)
      return contactsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate() || new Date()
      })) as Contact[]
    } catch (error) {
      console.error('Error fetching contact documents:', error)
      throw error
    }
  }
}
