import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'expo-router'
import React from 'react'
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

export default function ProfileScreen() {
  const { userProfile } = useAuth()
  const router = useRouter()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Profile Content */}
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(userProfile?.displayName || 'User')}
            </Text>
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>
            {userProfile?.displayName || 'Unknown User'}
          </Text>
          <Text style={styles.email}>{userProfile?.email || ''}</Text>
        </View>

        {/* Profile Actions */}
        <View style={styles.profileActions}>
          <Text style={styles.sectionTitle}>Profile Settings</Text>
          <Text style={styles.sectionDescription}>
            Manage your account settings and preferences
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7'
  },
  backButton: {
    padding: 8
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500'
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  content: {
    flex: 1,
    padding: 20
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold'
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32
  },
  displayName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4
  },
  email: {
    fontSize: 16,
    color: '#8E8E93'
  },
  profileActions: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93'
  }
})
