import {
  NotificationBanner,
  notificationService
} from '@/services/notificationService'
import { useRouter } from 'expo-router'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

interface NotificationContextType {
  currentBanner: NotificationBanner | null
  showBanner: (banner: NotificationBanner) => void
  dismissBanner: () => void
  navigateToConversation: (conversationId: string) => void
  isBannerVisible: boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

export function NotificationProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [currentBanner, setCurrentBanner] = useState<NotificationBanner | null>(
    null
  )
  const [isBannerVisible, setIsBannerVisible] = useState(false)
  const router = useRouter()
  const bannerQueue = useRef<NotificationBanner[]>([])
  const isProcessingQueue = useRef(false)

  // Expose showBanner function for external use (like NotificationService)
  const showBannerExternal = useCallback((banner: NotificationBanner) => {
    showBanner(banner)
  }, [])

  const showBanner = useCallback((banner: NotificationBanner) => {
    console.log('Showing banner for:', banner.senderName, banner.messageText)

    // Add to queue
    bannerQueue.current.push(banner)

    // Process queue if not already processing
    if (!isProcessingQueue.current) {
      processBannerQueue()
    }
  }, [])

  const processBannerQueue = useCallback(() => {
    if (bannerQueue.current.length === 0) {
      isProcessingQueue.current = false
      return
    }

    isProcessingQueue.current = true
    const banner = bannerQueue.current.shift()!

    setCurrentBanner(banner)
    setIsBannerVisible(true)
  }, [])

  const dismissBanner = useCallback(() => {
    console.log('Dismissing banner')
    setCurrentBanner(null)
    setIsBannerVisible(false)

    // Process next banner in queue after a short delay
    setTimeout(() => {
      if (bannerQueue.current.length > 0) {
        processBannerQueue()
      } else {
        isProcessingQueue.current = false
      }
    }, 200)
  }, [processBannerQueue])

  const navigateToConversation = useCallback(
    (conversationId: string) => {
      console.log('Navigating to conversation:', conversationId)
      router.push(`/chat/${conversationId}`)
    },
    [router]
  )

  // Set the banner callback in the notification service
  useEffect(() => {
    notificationService.setBannerCallback(showBanner)
  }, [showBanner])

  const value: NotificationContextType = {
    currentBanner,
    showBanner,
    dismissBanner,
    navigateToConversation,
    isBannerVisible
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    )
  }
  return context
}
