import { WhatsAppColors } from '@/constants/theme'
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
      router.replace('/(tabs)')
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
      router.replace('/(tabs)')
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
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>

          <Text style={styles.subtitle}>Sign in to your MessageAI account</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder='Enter your email'
              placeholderTextColor={WhatsAppColors.lightText}
              value={email}
              onChangeText={setEmail}
              keyboardType='email-address'
              autoCapitalize='none'
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder='Enter your password'
              placeholderTextColor={WhatsAppColors.lightText}
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
            <Text style={styles.linkText}>Don&apos;t have an account? </Text>
            <Link href='/auth/signup' asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Development Mode Login Buttons */}
          {isDevMode && (
            <View style={styles.devContainer}>
              <Text style={styles.devTitle}>Development Mode</Text>
              <Text style={styles.devSubtitle}>Quick login for testing</Text>

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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WhatsAppColors.background
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
    fontSize: 28,
    fontWeight: '700',
    color: WhatsAppColors.text,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: WhatsAppColors.lightText,
    textAlign: 'center',
    marginBottom: 32
  },
  inputContainer: {
    marginBottom: 20
  },
  input: {
    borderWidth: 1,
    borderColor: WhatsAppColors.border,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    backgroundColor: WhatsAppColors.darkBackground,
    color: WhatsAppColors.text
  },
  button: {
    backgroundColor: WhatsAppColors.secondary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    backgroundColor: WhatsAppColors.secondary,
    opacity: 0.5
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
    fontSize: 16,
    color: WhatsAppColors.lightText
  },
  link: {
    color: WhatsAppColors.secondary,
    fontSize: 16,
    fontWeight: '600'
  },
  // Development mode styles
  devContainer: {
    marginTop: 32,
    padding: 20,
    backgroundColor: WhatsAppColors.darkBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WhatsAppColors.border
  },
  devTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WhatsAppColors.text,
    textAlign: 'center',
    marginBottom: 4
  },
  devSubtitle: {
    fontSize: 14,
    color: WhatsAppColors.lightText,
    textAlign: 'center',
    marginBottom: 16
  },
  devButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
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
    opacity: 0.5
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
})
