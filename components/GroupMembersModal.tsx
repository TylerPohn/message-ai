import React from 'react'
import { View, Text, Modal, TouchableOpacity, FlatList, Image, SafeAreaView } from 'react-native'
import { UserProfile } from '@/types/messaging'
import { Ionicons } from '@expo/vector-icons'

interface GroupMembersModalProps {
  visible: boolean
  onClose: () => void
  members: UserProfile[]
  title?: string
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  visible,
  onClose,
  members,
  title = 'Group Members'
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B141A' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2A3942'
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#E9EDEF' }}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#E9EDEF" />
          </TouchableOpacity>
        </View>

        {/* Members List */}
        <FlatList
          data={members}
          keyExtractor={(item) => item.uid}
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
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#2A3942',
                  marginRight: 12,
                  overflow: 'hidden',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {item.photoURL ? (
                  <Image
                    source={{ uri: item.photoURL }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#00A884' }}>
                    {item.displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#E9EDEF' }}>
                  {item.displayName}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: '#8A92A0',
                    marginTop: 2
                  }}
                  numberOfLines={1}
                >
                  {item.email}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 40
              }}
            >
              <Text style={{ color: '#8A92A0', fontSize: 14 }}>
                No members found
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  )
}
