import { Image } from 'expo-image'
import { Link, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'

import AuthGuard from '@/components/AuthGuard'
import { HelloWave } from '@/components/hello-wave'
import ParallaxScrollView from '@/components/parallax-scroll-view'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useAuth } from '@/contexts/AuthContext'

export default function HomeScreen() {
  const { user, userProfile, logout } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to chat list
  useEffect(() => {
    if (user && userProfile) {
      router.replace('/chat/')
    }
  }, [user, userProfile, router])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <AuthGuard>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.reactLogo}
          />
        }
      >
        <ThemedView style={styles.titleContainer}>
          <ThemedText type='title'>Welcome to MessageAI!</ThemedText>
          <HelloWave />
        </ThemedView>

        <ThemedView style={styles.stepContainer}>
          <ThemedText type='subtitle'>
            Welcome, {userProfile?.displayName || user?.email}!
          </ThemedText>
          <ThemedText>
            You&apos;re successfully authenticated and ready to start messaging.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.stepContainer}>
          <ThemedText type='subtitle'>Authentication Complete</ThemedText>
          <ThemedText>
            Your user profile has been created in Firestore at /users/
            {user?.uid}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.stepContainer}>
          <Link href='/chat/'>
            <Link.Trigger>
              <ThemedText type='subtitle'>Step 2: Start Messaging</ThemedText>
            </Link.Trigger>
            <Link.Preview />
            <Link.Menu>
              <Link.MenuAction
                title='New Chat'
                icon='plus.message'
                onPress={() => alert('New chat pressed')}
              />
              <Link.MenuAction
                title='Share'
                icon='square.and.arrow.up'
                onPress={() => alert('Share pressed')}
              />
              <Link.Menu title='More' icon='ellipsis'>
                <Link.MenuAction
                  title='Logout'
                  icon='trash'
                  destructive
                  onPress={handleLogout}
                />
              </Link.Menu>
            </Link.Menu>
          </Link>

          <ThemedText>
            {`Tap to start messaging and explore your conversations.`}
          </ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    </AuthGuard>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute'
  }
})
