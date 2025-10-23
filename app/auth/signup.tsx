import { WhatsAppColors } from '@/constants/theme'
import { useAuth } from '@/contexts/AuthContext'
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

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !displayName) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, displayName)
      router.replace('/(tabs)')
    } catch (error: any) {
      Alert.alert(
        'Signup Failed',
        error.message || 'An error occurred during signup'
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
          <Text style={styles.title}>Create Account</Text>

          <Text style={styles.subtitle}>Join Babel and start chatting</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder='Enter your display name'
              placeholderTextColor={WhatsAppColors.lightText}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize='words'
            />
          </View>

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
              placeholder='Enter your password (min 6 characters)'
              placeholderTextColor={WhatsAppColors.lightText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize='none'
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder='Confirm your password'
              placeholderTextColor={WhatsAppColors.lightText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize='none'
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Already have an account? </Text>
            <Link href='/auth/login' asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
  }
})
