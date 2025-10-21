import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

export default function ProfileScreen() {
  const { user, userProfile, updateUserProfile } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState(userProfile?.status || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      await updateUserProfile({ status: status.trim() })
      Alert.alert('Success', 'Status updated successfully!')
      router.back()
    } catch (error) {
      console.error('Error updating status:', error)
      Alert.alert('Error', 'Failed to update status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setStatus('')
  }

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
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

          {/* Status Section */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Status Message</Text>
            <Text style={styles.sectionDescription}>
              Let others know what you're up to
            </Text>

            <View style={styles.statusInputContainer}>
              <TextInput
                style={styles.statusInput}
                value={status}
                onChangeText={setStatus}
                placeholder="What's on your mind?"
                placeholderTextColor='#8E8E93'
                multiline
                maxLength={140}
                textAlignVertical='top'
              />
              <View style={styles.statusFooter}>
                <Text style={styles.characterCount}>{status.length}/140</Text>
                {status.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClear}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size='small' color='#FFFFFF' />
              ) : (
                <Text style={styles.saveButtonText}>Save Status</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  keyboardAvoidingView: {
    flex: 1
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
  statusSection: {
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
    color: '#8E8E93',
    marginBottom: 16
  },
  statusInputContainer: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    backgroundColor: '#F8F9FA'
  },
  statusInput: {
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 100,
    maxHeight: 120
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7'
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93'
  },
  clearButton: {
    padding: 4
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500'
  },
  actionButtons: {
    gap: 12
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: '#8E8E93'
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500'
  }
})

