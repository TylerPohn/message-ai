import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Modal, FlatList } from 'react-native'
import { ReadReceipt } from '@/types/messaging'

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
        {status === 'read' && <Text style={{ fontSize: 12, color: '#34C759' }}>✓✓</Text>}
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
                backgroundColor: '#E5E5EA',
                marginLeft: index > 0 ? -6 : 0,
                zIndex: 2 - index,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#FFF'
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
            <Text style={{ fontSize: 10, color: '#8E8E93', marginLeft: 2 }}>
              +{readBy.length - 2}
            </Text>
          )}

          {/* "Read by X" text */}
          <Text style={{ fontSize: 11, color: '#8E8E93', marginLeft: 4 }}>
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
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View
            style={{
              backgroundColor: '#FFF',
              borderRadius: 12,
              width: '80%',
              maxHeight: '60%',
              overflow: 'hidden'
            }}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
                Read by {readBy.length}
              </Text>
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
                    borderBottomColor: '#F2F2F7'
                  }}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#E5E5EA',
                      marginRight: 12,
                      overflow: 'hidden'
                    }}
                  >
                    {item.senderPhotoURL && (
                      <Image
                        source={{ uri: item.senderPhotoURL }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </View>

                  {/* Name and time */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#000' }}>
                      {item.senderName}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
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
      </Modal>
    </View>
  )
}
