import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../utils/types';
import { useAuthStore } from '../store/authStore';
import { subscribeToMessages, sendMessage } from '../firebase/firestore';
import { GlassCard } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { timeAgo } from '../utils/helpers';
import type { Message } from '../utils/types';

// Mock messages for demo
const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    chatId: 'mock',
    senderId: 'user_1',
    senderName: 'Marcus T.',
    text: 'Hey everyone! Court is reserved for 6 PM. See you all there! 🏀',
    type: 'text',
    createdAt: new Date(Date.now() - 30 * 60000),
    readBy: [],
  },
  {
    id: '2',
    chatId: 'mock',
    senderId: 'user_2',
    senderName: 'Alex C.',
    text: "Perfect! I'll bring some extra water bottles",
    type: 'text',
    createdAt: new Date(Date.now() - 28 * 60000),
    readBy: [],
  },
  {
    id: '3',
    chatId: 'mock',
    senderId: 'user_3',
    senderName: 'Sarah K.',
    text: 'That would be helpful! The court balls are usually flat',
    type: 'text',
    createdAt: new Date(Date.now() - 24 * 60000),
    readBy: [],
  },
  {
    id: '4',
    chatId: 'mock',
    senderId: 'user_1',
    senderName: 'Marcus T.',
    text: 'Yes please! I have one but better to have backup. Also, teams will be picked when everyone arrives',
    type: 'text',
    createdAt: new Date(Date.now() - 22 * 60000),
    readBy: [],
  },
];

const ONLINE_USERS = [
  { id: '1', name: 'Marcus T.', online: true },
  { id: '2', name: 'Alex C.', online: true },
  { id: '3', name: 'Sarah K.', online: true },
  { id: '4', name: 'James W.', online: false },
];

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'ChatScreen'>;
  route: RouteProp<HomeStackParamList, 'ChatScreen'>;
};

export function ChatScreen({ navigation, route }: Props) {
  const { chatId, eventTitle } = route.params;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to real messages if not mock
    if (!chatId.startsWith('mock') && !chatId.startsWith('chat_mock')) {
      const unsubscribe = subscribeToMessages(chatId, (liveMessages) => {
        if (liveMessages.length > 0) setMessages(liveMessages);
      });
      return unsubscribe;
    }
  }, [chatId]);

  // Typing indicator animation
  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  async function handleSend() {
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');

    const optimisticMsg: Message = {
      id: Date.now().toString(),
      chatId,
      senderId: user.uid,
      senderName: user.displayName,
      text,
      type: 'text',
      createdAt: new Date(),
      readBy: [user.uid],
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await sendMessage(chatId, {
        chatId,
        senderId: user.uid,
        senderName: user.displayName,
        text,
        type: 'text',
        readBy: [user.uid],
      });
    } catch {
      // Message already shown optimistically
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.senderId === user?.uid;
    const initials = item.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.senderAvatar}>
            <Text style={styles.senderAvatarText}>{initials}</Text>
          </View>
        )}
        <View style={[styles.messageBubbleContainer, isMe && styles.messageBubbleContainerMe]}>
          {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
          </View>
          <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <GlassCard style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineAvatars}>
                {ONLINE_USERS.slice(0, 3).map((u) => (
                  <View key={u.id} style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarText}>{u.name.slice(0, 2)}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.onlineCount}>
                {ONLINE_USERS.filter((u) => u.online).length} online
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Text style={styles.moreText}>⋮</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Online users strip */}
        <View style={styles.onlineStrip}>
          {ONLINE_USERS.map((u) => (
            <View key={u.id} style={styles.onlineUser}>
              <View style={styles.onlineUserAvatar}>
                <View
                  style={[
                    styles.onlineAvatarCircle,
                    u.online ? styles.onlineAvatarActive : styles.onlineAvatarInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.onlineAvatarText,
                      u.online ? styles.onlineAvatarTextActive : null,
                    ]}
                  >
                    {u.name.slice(0, 2)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: u.online ? Colors.success : Colors.mutedForeground + '80' },
                  ]}
                />
              </View>
              <Text style={styles.onlineUserName} numberOfLines={1}>{u.name}</Text>
            </View>
          ))}
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={
              isTyping ? (
                <View style={styles.typingRow}>
                  <View style={styles.senderAvatar}>
                    <Text style={styles.senderAvatarText}>MT</Text>
                  </View>
                  <GlassCard style={styles.typingBubble}>
                    <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
                    <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
                    <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
                  </GlassCard>
                </View>
              ) : null
            }
          />

          {/* Input */}
          <GlassCard style={styles.inputArea}>
            <TouchableOpacity style={styles.attachButton}>
              <Text style={styles.attachIcon}>🖼️</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.mutedForeground + '80'}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiIcon}>😊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!newMessage.trim()}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </GlassCard>
        </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    gap: 12,
    borderRadius: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: Colors.foreground,
    fontSize: 20,
    fontWeight: '600',
  },
  headerInfo: { flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineAvatars: {
    flexDirection: 'row',
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  miniAvatarText: {
    fontSize: 7,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  onlineCount: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: Colors.mutedForeground,
    fontSize: 20,
    lineHeight: 24,
  },
  onlineStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  onlineUser: {
    alignItems: 'center',
    gap: 4,
  },
  onlineUserAvatar: { position: 'relative' },
  onlineAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  onlineAvatarActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  onlineAvatarInactive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.border,
  },
  onlineAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  onlineAvatarTextActive: {
    color: Colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  onlineUserName: {
    fontSize: 10,
    color: Colors.mutedForeground,
    maxWidth: 44,
  },
  keyboardView: { flex: 1 },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    flexDirection: 'row-reverse',
  },
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  senderAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  messageBubbleContainer: {
    maxWidth: '75%',
    gap: 4,
  },
  messageBubbleContainerMe: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 11,
    color: Colors.mutedForeground,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: Colors.primaryForeground,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.mutedForeground,
    marginLeft: 4,
  },
  messageTimeMe: {
    marginLeft: 0,
    marginRight: 4,
  },
  typingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    marginTop: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    alignItems: 'center',
    borderBottomLeftRadius: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.mutedForeground + '80',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    gap: 8,
    borderRadius: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: { fontSize: 18 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.foreground,
    fontSize: 14,
    maxHeight: 100,
  },
  emojiButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: { fontSize: 20 },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  sendIcon: {
    color: Colors.primaryForeground,
    fontSize: 16,
    fontWeight: '700',
  },
});
