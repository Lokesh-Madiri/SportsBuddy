import React, { useEffect } from 'react';
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
import { GlassCard } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { neonShadow } from '../utils/platform';
import { subscribeToUserChats } from '../firebase/firestore';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { notificationService } from '../services/notifications';
import { timeAgo } from '../utils/helpers';
import type { Chat } from '../utils/types';
import { SPORTS } from '../constants';

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;
};

function sportEmoji(eventTitle: string): string {
  const title = eventTitle.toLowerCase();
  const match = SPORTS.find((s) => title.includes(s.name.toLowerCase()));
  return match?.icon ?? '💬';
}

export function ChatListScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const { chats, setChats, getTotalUnread } = useChatStore();
  const lastMessageIds = React.useRef<Record<string, string>>({});

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToUserChats(user.uid, (liveChats) => {
      liveChats.forEach((chat) => {
        const message = chat.lastMessage;
        const previousId = lastMessageIds.current[chat.id];
        if (
          message?.id &&
          previousId &&
          previousId !== message.id &&
          message.senderId !== user.uid
        ) {
          notificationService.notifyChatMessage({
            chatId: chat.id,
            eventTitle: chat.eventTitle,
            senderName: message.senderName,
            messagePreview: message.text,
          });
        }
        if (message?.id) {
          lastMessageIds.current[chat.id] = message.id;
        }
      });
      setChats(liveChats);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  function renderChat({ item }: { item: Chat }) {
    const lastText = item.lastMessage?.text ?? 'No messages yet';
    const lastTime = item.lastMessage?.createdAt
      ? timeAgo(new Date(item.lastMessage.createdAt))
      : '';

    return (
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
            <Text style={styles.chatSportIcon}>{sportEmoji(item.eventTitle)}</Text>
          </View>
          <View style={styles.chatContent}>
            <View style={styles.chatTop}>
              <Text style={styles.chatTitle} numberOfLines={1}>{item.eventTitle}</Text>
              <Text style={styles.chatTime}>{lastTime}</Text>
            </View>
            <View style={styles.chatBottom}>
              <Text style={styles.chatLastMessage} numberOfLines={1}>{lastText}</Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.chatParticipants}>
              {item.participants.length} participant{item.participants.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          {getTotalUnread() > 0 && (
            <View style={styles.totalUnread}>
              <Text style={styles.totalUnreadText}>{getTotalUnread()}</Text>
            </View>
          )}
        </View>

        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderChat}
          ListHeaderComponent={
            <TouchableOpacity onPress={() => navigation.navigate('AIChat')} activeOpacity={0.86}>
              <GlassCard style={styles.aiCard} neonBorder>
                <View style={styles.aiIcon}>
                  <Text style={styles.aiIconText}>AI</Text>
                </View>
                <View style={styles.aiContent}>
                  <Text style={styles.aiTitle}>SportsBuddy AI Assistant</Text>
                  <Text style={styles.aiSubtitle} numberOfLines={2}>
                    Find matches, teammates, training ideas, rules, and event plans.
                  </Text>
                </View>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>Smart</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          }
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
  title: { fontSize: 26, fontWeight: '700', color: Colors.foreground },
  totalUnread: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  totalUnreadText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: 10 },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  aiIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...neonShadow(Colors.primary, 12, 0.35),
  },
  aiIconText: { fontSize: 15, fontWeight: '900', color: Colors.primaryForeground },
  aiContent: { flex: 1 },
  aiTitle: { fontSize: 15, fontWeight: '900', color: Colors.foreground },
  aiSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, color: Colors.mutedForeground },
  aiBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '900', color: Colors.primary },
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
  chatSportIcon: { fontSize: 22 },
  chatContent: { flex: 1 },
  chatTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: { fontSize: 15, fontWeight: '600', color: Colors.foreground, flex: 1, marginRight: 8 },
  chatTime: { fontSize: 11, color: Colors.mutedForeground },
  chatBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  chatLastMessage: { fontSize: 13, color: Colors.mutedForeground, flex: 1, marginRight: 8 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { fontSize: 10, fontWeight: '700', color: Colors.primaryForeground },
  chatParticipants: { fontSize: 11, color: Colors.mutedForeground + '70' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.foreground },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
