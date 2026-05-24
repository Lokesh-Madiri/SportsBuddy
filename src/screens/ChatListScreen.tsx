import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../utils/types';
import { GlassCard, Avatar } from '../components/common';
import { Colors, Spacing } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;
};

const MOCK_CHATS = [
  {
    id: 'chat_1',
    eventTitle: '5v5 Pickup Game',
    lastMessage: 'On my way now 🏃',
    time: '5:45 PM',
    unread: 3,
    participants: ['Marcus T.', 'Alex C.', 'Sarah K.'],
    sport: '🏀',
  },
  {
    id: 'chat_2',
    eventTitle: 'Weekend Soccer',
    lastMessage: 'See you at the field!',
    time: '2:30 PM',
    unread: 0,
    participants: ['James W.', 'Emily R.'],
    sport: '⚽',
  },
  {
    id: 'chat_3',
    eventTitle: 'Tennis Doubles',
    lastMessage: 'Great match everyone',
    time: 'Yesterday',
    unread: 1,
    participants: ['David L.', 'Anna M.'],
    sport: '🎾',
  },
];

export function ChatListScreen({ navigation }: Props) {
  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <TouchableOpacity style={styles.newChatButton}>
            <Text style={styles.newChatIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={MOCK_CHATS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ChatScreen', {
                  chatId: item.id,
                  eventTitle: item.eventTitle,
                })
              }
              activeOpacity={0.85}
            >
              <GlassCard style={styles.chatItem}>
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatSportIcon}>{item.sport}</Text>
                </View>
                <View style={styles.chatContent}>
                  <View style={styles.chatTop}>
                    <Text style={styles.chatTitle} numberOfLines={1}>{item.eventTitle}</Text>
                    <Text style={styles.chatTime}>{item.time}</Text>
                  </View>
                  <View style={styles.chatBottom}>
                    <Text style={styles.chatLastMessage} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                    {item.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.chatParticipants}>
                    {item.participants.join(', ')}
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySubtitle}>Join a game to start chatting with teammates</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.foreground,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatIcon: { fontSize: 18 },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: 10,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSportIcon: { fontSize: 24 },
  chatContent: { flex: 1 },
  chatTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  chatBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatLastMessage: {
    fontSize: 13,
    color: Colors.mutedForeground,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryForeground,
  },
  chatParticipants: {
    fontSize: 11,
    color: Colors.mutedForeground + '80',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
