import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Modal, FlatList, SafeAreaView } from 'react-native'
import { ReadReceipt } from '@/types/messaging'
import { Ionicons } from '@expo/vector-icons'

interface ReadReceiptIndicatorProps {
  readBy: ReadReceipt[]
  isGroupChat: boolean
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

export const ReadReceiptIndicator: React.FC<ReadReceiptIndicatorProps> = ({
  readBy,
  isGroupChat,
  status
}) => {
  const [showModal, setShowModal] = useState(false)

  // For direct chats, just show the status icon
  if (!isGroupChat) {
    return (
      <View style={{ marginLeft: 4 }}>
        {status === 'sending' && <Text style={{ fontSize: 12, color: '#FF9500' }}>◆</Text>}
        {status === 'sent' && <Text style={{ fontSize: 12, color: '#8E8E93' }}>✓</Text>}
        {status === 'delivered' && <Text style={{ fontSize: 12, color: '#8E8E93' }}>✓✓</Text>}
        {status === 'read' && <Text style={{ fontSize: 12, color: '#31A24C' }}>✓✓</Text>}
        {status === 'failed' && <Text style={{ fontSize: 12, color: '#FF3B30' }}>✗</Text>}
      </View>
    )
  }

  // For group chats, show read count
  if (!readBy || readBy.length === 0) {
    return (
      <View style={{ marginLeft: 4 }}>
        {status === 'sending' && <Text style={{ fontSize: 12, color: '#FF9500' }}>◆</Text>}
        {status === 'sent' && <Text style={{ fontSize: 12, color: '#8E8E93' }}>✓</Text>}
        {status === 'delivered' && <Text style={{ fontSize: 12, color: '#8E8E93' }}>✓✓</Text>}
        {status === 'failed' && <Text style={{ fontSize: 12, color: '#FF3B30' }}>✗</Text>}
      </View>
    )
  }

  return (
    <View style={{ marginLeft: 4 }}>
      <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* Avatar stack - show first 2 avatars */}
          {readBy.slice(0, 2).map((receipt, index) => (
            <View
              key={receipt.userId}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#2A3942',
                marginLeft: index > 0 ? -6 : 0,
                zIndex: 2 - index,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#1F2C34'
              }}
            >
              {receipt.senderPhotoURL && (
                <Image
                  source={{ uri: receipt.senderPhotoURL }}
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </View>
          ))}

          {/* Show count if more than 2 */}
          {readBy.length > 2 && (
            <Text style={{ fontSize: 10, color: '#8A92A0', marginLeft: 2 }}>
              +{readBy.length - 2}
            </Text>
          )}

          {/* "Read by X" text */}
          <Text style={{ fontSize: 11, color: '#8A92A0', marginLeft: 4 }}>
            Read by {readBy.length}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal showing full list */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View
              style={{
                backgroundColor: '#1F2C34',
                borderRadius: 12,
                width: '100%',
                maxHeight: '80%',
                overflow: 'hidden'
              }}
            >
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A3942', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#E9EDEF' }}>
                  Read by {readBy.length}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#8A92A0" />
                </TouchableOpacity>
              </View>

              <FlatList
              data={readBy}
              keyExtractor={(item) => item.userId}
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#2A3942'
                  }}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#2A3942',
                      marginRight: 12,
                      overflow: 'hidden',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    {item.senderPhotoURL ? (
                      <Image
                        source={{ uri: item.senderPhotoURL }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#00A884' }}>
                        {item.senderName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>

                  {/* Name and time */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#E9EDEF' }}>
                      {item.senderName}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#8A92A0', marginTop: 2 }}>
                      {item.readAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              )}
              />
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  )
}
