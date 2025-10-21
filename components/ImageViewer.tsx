import { Image } from 'expo-image'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface ImageViewerProps {
  visible: boolean
  imageURL: string
  senderName: string
  timestamp: Date
  onClose: () => void
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export default function ImageViewer({
  visible,
  imageURL,
  senderName,
  timestamp,
  onClose
}: ImageViewerProps) {
  const [loading, setLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleImageLoad = () => {
    setLoading(false)
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setLoading(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.senderName}>{senderName}</Text>
            <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
          </View>
        </View>

        {/* Image Container */}
        <View style={styles.imageContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='large' color='#FFFFFF' />
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          )}

          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: imageURL }}
              style={styles.image}
              contentFit='contain'
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </View>
        </View>

        {/* Instructions */}
        {imageLoaded && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>Tap ✕ to close</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)'
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  headerInfo: {
    flex: 1
  },
  senderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  timestamp: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageWrapper: {
    width: screenWidth,
    height: screenHeight - 120, // Account for header
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: {
    width: screenWidth,
    height: screenHeight - 120
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 20
  }
})
