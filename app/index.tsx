import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

export default function HomeScreen() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user && userProfile) {
        console.log('Redirecting to tabs...')
        router.replace('/(tabs)')
      } else {
        console.log('Redirecting to login...')
        router.replace('/auth/login')
      }
    }
  }, [user, userProfile, loading, router])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size='large' />
        <Text>Loading...</Text>
      </View>
    )
  }

  return null
}
