import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-gesture-handler'
import 'react-native-reanimated'

import InAppBanner from '@/components/InAppBanner'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { useColorScheme } from '@/hooks/use-color-scheme'

// Removed tabs anchor - not needed for current structure

export default function RootLayout() {
  const colorScheme = useColorScheme()

  return (
    <AuthProvider>
      <NotificationProvider>
        <ThemeProvider
          value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: '#0B141A' }
            }}
          >
            <Stack.Screen
              name='index'
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B141A' }
              }}
            />
            <Stack.Screen
              name='(tabs)'
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B141A' }
              }}
            />
            <Stack.Screen
              name='chat'
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B141A' }
              }}
            />
            <Stack.Screen
              name='profile'
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B141A' }
              }}
            />
            <Stack.Screen
              name='contacts'
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B141A' }
              }}
            />
            <Stack.Screen
              name='auth'
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B141A' }
              }}
            />
          </Stack>
          <InAppBanner />
          <StatusBar style='auto' />
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}
