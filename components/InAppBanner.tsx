import { useNotifications } from '@/contexts/NotificationContext'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function InAppBanner() {
  const { currentBanner, dismissBanner, navigateToConversation } =
    useNotifications()
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current
  const autoDismissTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (currentBanner) {
      showBanner()
    } else {
      hideBanner()
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current)
      }
    }
  }, [currentBanner])

  const showBanner = () => {
    // Clear any existing timer
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current)
    }

    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start()

    // Auto dismiss after 4 seconds
    autoDismissTimer.current = setTimeout(() => {
      dismissBanner()
    }, 4000)
  }

  const hideBanner = () => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current)
      autoDismissTimer.current = null
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start()
  }

  const handlePress = () => {
    if (currentBanner) {
      navigateToConversation(currentBanner.conversationId)
      dismissBanner()
    }
  }

  if (!currentBanner) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const formatMessageText = (text: string, type: string) => {
    if (type === 'image') {
      return '📷 Photo'
    }
    return text.length > 50 ? text.substring(0, 50) + '...' : text
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity
        }
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* WhatsApp-style green background */}
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {currentBanner.senderAvatar ? (
              <Image
                source={{ uri: currentBanner.senderAvatar }}
                style={styles.avatar}
                contentFit='cover'
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(currentBanner.senderName)}
                </Text>
              </View>
            )}
          </View>

          {/* Message content */}
          <View style={styles.messageContainer}>
            <View style={styles.header}>
              <Text style={styles.senderName} numberOfLines={1}>
                {currentBanner.senderName}
              </Text>
              <Text style={styles.timestamp}>
                {new Date(currentBanner.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            <Text style={styles.messageText} numberOfLines={2}>
              {formatMessageText(
                currentBanner.messageText,
                currentBanner.messageType
              )}
            </Text>
          </View>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={dismissBanner}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name='close' size={20} color='#FFFFFF' />
          </TouchableOpacity>
        </View>

        {/* Swipe indicator */}
        <View style={styles.swipeIndicator} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000
  },
  banner: {
    backgroundColor: '#075E54', // WhatsApp green
    marginHorizontal: 12,
    marginTop: 50, // Account for status bar
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  avatarContainer: {
    marginRight: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  messageContainer: {
    flex: 1,
    marginRight: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  senderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  },
  timestamp: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 18
  },
  dismissButton: {
    padding: 4
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
    borderRadius: 1.5
  }
})
