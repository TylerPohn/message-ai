import { storage } from '@/firebaseConfig'
import * as FileSystem from 'expo-file-system/legacy'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  UploadTaskSnapshot
} from 'firebase/storage'

export interface ImageMetadata {
  width: number
  height: number
  size: number
}

export interface ImageUploadResult {
  imageURL: string
  thumbnailURL: string
  metadata: ImageMetadata
}

export class ImageService {
  // Request camera and gallery permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
      const galleryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync()

      return (
        cameraPermission.status === 'granted' &&
        galleryPermission.status === 'granted'
      )
    } catch (error) {
      console.error('Error requesting permissions:', error)
      return false
    }
  }

  // Pick image from gallery
  static async pickImageFromGallery(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        throw new Error('Camera and gallery permissions are required')
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1
      })

      return result.canceled ? null : result
    } catch (error) {
      console.error('Error picking image from gallery:', error)
      throw error
    }
  }

  // Pick image from camera
  static async pickImageFromCamera(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        throw new Error('Camera permission is required')
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1
      })

      return result.canceled ? null : result
    } catch (error) {
      console.error('Error taking photo:', error)
      throw error
    }
  }

  // Compress image to reduce file size
  static async compressImage(
    imageUri: string,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<{ uri: string; metadata: ImageMetadata }> {
    try {
      const manipulatorResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight
            }
          }
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG
        }
      )

      // Get file info for metadata
      const fileInfo = await FileSystem.getInfoAsync(manipulatorResult.uri)
      const size = fileInfo.exists ? fileInfo.size || 0 : 0

      return {
        uri: manipulatorResult.uri,
        metadata: {
          width: manipulatorResult.width,
          height: manipulatorResult.height,
          size
        }
      }
    } catch (error) {
      console.error('Error compressing image:', error)
      throw error
    }
  }

  // Generate thumbnail for chat list preview
  static async generateThumbnail(
    imageUri: string,
    size: number = 200,
    quality: number = 0.7
  ): Promise<{ uri: string; metadata: ImageMetadata }> {
    try {
      const manipulatorResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: size,
              height: size
            }
          }
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG
        }
      )

      // Get file info for metadata
      const fileInfo = await FileSystem.getInfoAsync(manipulatorResult.uri)
      const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0

      return {
        uri: manipulatorResult.uri,
        metadata: {
          width: manipulatorResult.width,
          height: manipulatorResult.height,
          size: fileSize
        }
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error)
      throw error
    }
  }

  // Upload image to Firebase Storage
  static async uploadImage(
    imageUri: string,
    conversationId: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      console.log('Starting image upload:', {
        imageUri,
        conversationId,
        userId
      })

      // Read the file as blob
      const response = await fetch(imageUri)
      const blob = await response.blob()
      console.log('Blob created:', { size: blob.size, type: blob.type })

      // Create storage reference
      const timestamp = Date.now()
      const fileName = `${timestamp}_${userId}.jpg`
      const storageRef = ref(storage, `images/${conversationId}/${fileName}`)
      console.log('Storage reference created:', storageRef.fullPath)

      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, blob)

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            onProgress?.(progress)
          },
          (error) => {
            console.error('Upload error:', error)
            reject(error)
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
              resolve(downloadURL)
            } catch (error) {
              console.error('Error getting download URL:', error)
              reject(error)
            }
          }
        )
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  // Upload thumbnail to Firebase Storage
  static async uploadThumbnail(
    thumbnailUri: string,
    conversationId: string,
    userId: string
  ): Promise<string> {
    try {
      console.log('Starting thumbnail upload:', {
        thumbnailUri,
        conversationId,
        userId
      })

      // Read the file as blob
      const response = await fetch(thumbnailUri)
      const blob = await response.blob()
      console.log('Thumbnail blob created:', {
        size: blob.size,
        type: blob.type
      })

      // Create storage reference
      const timestamp = Date.now()
      const fileName = `${timestamp}_${userId}.jpg`
      const storageRef = ref(
        storage,
        `thumbnails/${conversationId}/${fileName}`
      )
      console.log('Thumbnail storage reference created:', storageRef.fullPath)

      // Upload thumbnail
      await uploadBytesResumable(storageRef, blob)
      const downloadURL = await getDownloadURL(storageRef)
      console.log('Thumbnail upload successful:', downloadURL)

      return downloadURL
    } catch (error) {
      console.error('Error uploading thumbnail:', error)
      throw error
    }
  }

  // Download image with caching
  static async downloadImage(
    imageURL: string,
    cacheKey: string
  ): Promise<string> {
    try {
      // Check if image is already cached
      const cacheDir = FileSystem.cacheDirectory + 'images/'
      const cachedPath = cacheDir + cacheKey + '.jpg'

      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(cacheDir)
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true })
      }

      // Check if file is already cached
      const cachedFileInfo = await FileSystem.getInfoAsync(cachedPath)
      if (cachedFileInfo.exists) {
        return cachedPath
      }

      // Download and cache the image
      const downloadResult = await FileSystem.downloadAsync(
        imageURL,
        cachedPath
      )
      return downloadResult.uri
    } catch (error) {
      console.error('Error downloading image:', error)
      throw error
    }
  }

  // Get image URL from storage path
  static async getImageURL(storagePath: string): Promise<string> {
    try {
      const storageRef = ref(storage, storagePath)
      return await getDownloadURL(storageRef)
    } catch (error) {
      console.error('Error getting image URL:', error)
      throw error
    }
  }

  // Process and upload image with thumbnail
  static async processAndUploadImage(
    imageUri: string,
    conversationId: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResult> {
    try {
      // Compress the main image
      const compressedImage = await this.compressImage(imageUri)

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(imageUri)

      // Upload both images in parallel
      const [imageURL, thumbnailURL] = await Promise.all([
        this.uploadImage(
          compressedImage.uri,
          conversationId,
          userId,
          onProgress
        ),
        this.uploadThumbnail(thumbnail.uri, conversationId, userId)
      ])

      return {
        imageURL,
        thumbnailURL,
        metadata: compressedImage.metadata
      }
    } catch (error) {
      console.error('Error processing and uploading image:', error)
      throw error
    }
  }

  // Clean up local files
  static async cleanupLocalFiles(uris: string[]): Promise<void> {
    try {
      for (const uri of uris) {
        if (uri.startsWith('file://')) {
          await FileSystem.deleteAsync(uri, { idempotent: true })
        }
      }
    } catch (error) {
      console.error('Error cleaning up local files:', error)
    }
  }
}
