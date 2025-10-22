import { auth, db } from '@/firebaseConfig'
import { notificationService } from '@/services/notificationService'
import { PresenceService } from '@/services/presenceService'
import { UserProfile } from '@/types/messaging'
import * as Localization from 'expo-localization'
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Create or update user profile in Firestore
  const createUserProfile = async (
    user: User,
    additionalData?: Partial<UserProfile>
  ) => {
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = user
      const createdAt = new Date()
      const lastSeen = new Date()

      // Get device language for default language preference
      const deviceLanguage = Localization.locale?.split('-')[0] || 'en'

      try {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: displayName || additionalData?.displayName || '',
          email,
          photoURL: photoURL || additionalData?.photoURL || '',
          status: additionalData?.status || '',
          lastSeen,
          createdAt,
          preferredLanguage:
            additionalData?.preferredLanguage || deviceLanguage,
          autoTranslate: additionalData?.autoTranslate || false
        })
      } catch (error) {
        console.error('Error creating user profile:', error)
      }
    }
  }

  // Fetch user profile from Firestore
  const fetchUserProfile = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const profileData = userSnap.data()
        setUserProfile({
          uid: profileData.uid,
          email: profileData.email,
          displayName: profileData.displayName,
          photoURL: profileData.photoURL,
          status: profileData.status,
          statusUpdatedAt: profileData.statusUpdatedAt?.toDate(),
          lastSeen: profileData.lastSeen?.toDate() || new Date(),
          createdAt: profileData.createdAt?.toDate() || new Date(),
          preferredLanguage: profileData.preferredLanguage || 'en',
          autoTranslate: profileData.autoTranslate || false
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )

      // Update the user's display name
      await updateProfile(user, { displayName })

      // Create user profile in Firestore
      await createUserProfile(user, { displayName })
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Set user offline before signing out
      if (user) {
        await PresenceService.setUserOffline(user.uid)
        PresenceService.stopHeartbeat()
        PresenceService.cleanup()

        // Clean up notifications
        await notificationService.cleanupUserNotifications()
        await notificationService.cleanup()
      }
      await signOut(auth)
      setUserProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return

    try {
      const userRef = doc(db, 'users', user.uid)
      await setDoc(userRef, updates, { merge: true })

      // Update local state
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null))
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        await fetchUserProfile(user)
        // Initialize presence tracking when user logs in
        PresenceService.initialize(user.uid)
        // Start heartbeat to keep presence fresh
        PresenceService.startHeartbeat(user.uid)

        // Initialize notification service
        await notificationService.initialize(user.uid)
      } else {
        setUserProfile(null)
        // Stop heartbeat and clean up presence tracking when user logs out
        PresenceService.stopHeartbeat()
        PresenceService.cleanup()

        // Clean up notification service
        await notificationService.cleanup()
      }

      setLoading(false)
    })

    return () => {
      unsubscribe()
      // Stop heartbeat and clean up presence tracking on unmount
      PresenceService.stopHeartbeat()
      PresenceService.cleanup()
    }
  }, [])

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    logout,
    updateUserProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
