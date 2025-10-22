import { useAuth } from '@/contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'
import { t, Locale, isSupportedLocale } from '@/locales/translations'

export default function TabLayout() {
  const { userProfile } = useAuth()
  // Use user's preferred language if available and supported, otherwise default to English
  const locale: Locale = (
    userProfile?.preferredLanguage && isSupportedLocale(userProfile.preferredLanguage)
      ? (userProfile.preferredLanguage as Locale)
      : 'en'
  )

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00A884',
        tabBarInactiveTintColor: '#8696A0',
        tabBarStyle: {
          backgroundColor: '#1F2C34',
          borderTopColor: '#2A3942',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10
        },
        headerShown: false // Hide headers since we have custom headers in each screen
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: t(locale, 'navigation.chatsTab'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={size}
              color={color}
            />
          )
        }}
      />
      <Tabs.Screen
        name='contacts'
        options={{
          title: t(locale, 'navigation.contactsTab'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color}
            />
          )
        }}
      />
      <Tabs.Screen
        name='settings'
        options={{
          title: t(locale, 'navigation.settingsTab'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings-sharp' : 'settings-outline'}
              size={size}
              color={color}
            />
          )
        }}
      />
    </Tabs>
  )
}
