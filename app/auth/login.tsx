import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useAuth } from '@/contexts/AuthContext'
import Constants from 'expo-constants'
import { Link, router } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  // Check if development mode is enabled
  const isDevMode = Constants.expoConfig?.extra?.EXPO_ENVIRONMENT === 'dev'

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      router.replace('/chat/')
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'An error occurred during login'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDevLogin = async (devEmail: string, devPassword: string) => {
    setEmail(devEmail)
    setPassword(devPassword)
    setLoading(true)
    try {
      await signIn(devEmail, devPassword)
      router.replace('/chat/')
    } catch (error: any) {
      Alert.alert(
        'Dev Login Failed',
        error.message || 'An error occurred during dev login'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.formContainer}>
          <ThemedText type='title' style={styles.title}>
            Welcome Back
          </ThemedText>

          <ThemedText style={styles.subtitle}>
            Sign in to your MessageAI account
          </ThemedText>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter your email'
              placeholderTextColor='#999'
              value={email}
              onChangeText={setEmail}
              keyboardType='email-address'
              autoCapitalize='none'
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder='Enter your password'
              placeholderTextColor='#999'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize='none'
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <ThemedText style={styles.linkText}>
              Don't have an account?{' '}
            </ThemedText>
            <Link href='/auth/signup' asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Development Mode Login Buttons */}
          {isDevMode && (
            <View style={styles.devContainer}>
              <ThemedText style={styles.devTitle}>Development Mode</ThemedText>
              <ThemedText style={styles.devSubtitle}>
                Quick login for testing
              </ThemedText>

              <TouchableOpacity
                style={[
                  styles.devButton,
                  styles.devButton1,
                  loading && styles.devButtonDisabled
                ]}
                onPress={() => handleDevLogin('tylerpohn@gmail.com', 'Abc123')}
                disabled={loading}
              >
                <Text style={styles.devButtonText}>
                  {loading ? 'Signing In...' : 'Login as Tyler'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.devButton,
                  styles.devButton2,
                  loading && styles.devButtonDisabled
                ]}
                onPress={() =>
                  handleDevLogin('moblingoblin64@gmail.com', 'Abc123')
                }
                disabled={loading}
              >
                <Text style={styles.devButtonText}>
                  {loading ? 'Signing In...' : 'Login as Moblin'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.devButton,
                  styles.devButton3,
                  loading && styles.devButtonDisabled
                ]}
                onPress={() => handleDevLogin('daihorusu@gmail.com', 'Abc123')}
                disabled={loading}
              >
                <Text style={styles.devButtonText}>
                  {loading ? 'Signing In...' : 'Login as Daihorusu'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center'
  },
  title: {
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7
  },
  inputContainer: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    backgroundColor: '#ccc'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  linkText: {
    fontSize: 16
  },
  link: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  },
  // Development mode styles
  devContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7'
  },
  devTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#856404',
    textAlign: 'center',
    marginBottom: 4
  },
  devSubtitle: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8
  },
  devButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8
  },
  devButton1: {
    backgroundColor: '#ff6b6b'
  },
  devButton2: {
    backgroundColor: '#4ecdc4'
  },
  devButton3: {
    backgroundColor: '#9b59b6'
  },
  devButtonDisabled: {
    backgroundColor: '#ccc'
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
})
