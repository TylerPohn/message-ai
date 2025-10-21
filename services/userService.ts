import { db } from '@/firebaseConfig'
import { UserProfile } from '@/types/messaging'
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where
} from 'firebase/firestore'

export class UserService {
  // Get all users except the current user
  static async getAllUsers(currentUserId: string): Promise<UserProfile[]> {
    try {
      // Get all users and filter out current user
      const usersSnapshot = await getDocs(collection(db, 'users'))

      const allUsers = usersSnapshot.docs.map((doc) => ({
        uid: doc.data().uid,
        email: doc.data().email,
        displayName: doc.data().displayName,
        photoURL: doc.data().photoURL,
        status: doc.data().status,
        lastSeen: doc.data().lastSeen?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as UserProfile[]

      // Filter out current user
      return allUsers.filter((user) => user.uid !== currentUserId)
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  }

  // Search users by name or email
  static async searchUsers(
    currentUserId: string,
    searchTerm: string
  ): Promise<UserProfile[]> {
    try {
      const allUsers = await this.getAllUsers(currentUserId)

      if (!searchTerm.trim()) {
        return allUsers
      }

      const searchLower = searchTerm.toLowerCase()
      return allUsers.filter(
        (user) =>
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      )
    } catch (error) {
      console.error('Error searching users:', error)
      throw error
    }
  }

  // Get user profile by ID
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId)
      )

      const usersSnapshot = await getDocs(usersQuery)
      if (usersSnapshot.empty) {
        return null
      }

      const userData = usersSnapshot.docs[0].data()
      return {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        status: userData.status,
        lastSeen: userData.lastSeen?.toDate() || new Date(),
        createdAt: userData.createdAt?.toDate() || new Date()
      } as UserProfile
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  // Update user status
  static async updateUserStatus(userId: string, status: string): Promise<void> {
    try {
      // Validate status length
      if (status.length > 140) {
        throw new Error('Status message cannot exceed 140 characters')
      }

      // Find the user document by uid
      const usersQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId)
      )

      const usersSnapshot = await getDocs(usersQuery)
      if (usersSnapshot.empty) {
        throw new Error('User not found')
      }

      const userDoc = usersSnapshot.docs[0]
      const userRef = doc(db, 'users', userDoc.id)

      // Update the status field
      await updateDoc(userRef, {
        status: status.trim(),
        updatedAt: new Date()
      })

      console.log('User status updated successfully:', userId)
    } catch (error) {
      console.error('Error updating user status:', error)
      throw error
    }
  }
}
