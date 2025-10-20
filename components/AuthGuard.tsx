import { ThemedText } from '@/components/themed-text'
import { useAuth } from '@/contexts/AuthContext'
import { Redirect } from 'expo-router'
import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    )
  }

  if (!user) {
    return <Redirect href='/auth/login' />
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7
  }
})
