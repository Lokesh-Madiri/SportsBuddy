import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { neonShadow, nativeDriver } from '../utils/platform';
import { HomeStackParamList } from '../utils/types';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import {
  subscribeToMessages,
  sendMessage,
  subscribeToTyping,
  setTypingIndicator,
  setUserOnlineStatus,
} from '../firebase/firestore';
import { GlassCard } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { timeAgo } from '../utils/helpers';
import type { Message } from '../utils/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'ChatScreen'>;
  route: RouteProp<HomeStackParamList, 'ChatScreen'>;
};

export function ChatScreen({ navigation, route }: Props) {
  const { chatId, eventTitle } = route.params;
  const { user } = useAuthStore();
  const { setTypingUser } = useChatStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dot1] = useState(() => new Animated.Value(0));
  const [dot2] = useState(() => new Animated.Value(0));
  const [dot3] = useState(() => new Animated.Value(0));

  // ─── Set online, subscribe messages + typing ────────────────────────────────
  useEffect(() => {
    if (user?.uid) setUserOnlineStatus(user.uid, true);

    const unsubMessages = subscribeToMessages(chatId, (liveMessages) => {
      setMessages(liveMessages);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    });

    const unsubTyping = subscribeToTyping(chatId, user?.uid ?? '', (names) => {
      setTypingNames(names);
      if (user?.uid) setTypingUser(chatId, user.uid, false);
    });

    return () => {
      unsubMessages();
      unsubTyping();
      if (user?.uid) {
        setUserOnlineStatus(user.uid, false);
        setTypingIndicator(chatId, user.uid, user.displayName, false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, user?.uid]);

  // ─── Typing animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typingNames.length === 0) return;

    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: nativeDriver }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: nativeDriver }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingNames.length > 0]);

  // ─── Handle text input with typing indicator ───────────────────────────────
  const handleInputChange = useCallback(
    (text: string) => {
      setNewMessage(text);
      if (!user) return;

      if (text.length > 0) {
        setTypingIndicator(chatId, user.uid, user.displayName, true);
        // Debounce stop-typing
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingIndicator(chatId, user.uid, user.displayName, false);
        }, 3000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTypingIndicator(chatId, user.uid, user.displayName, false);
      }
    },
    [chatId, user]
  );

  // ─── Send message ────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !user || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Stop typing indicator immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingIndicator(chatId, user.uid, user.displayName, false);

    // Optimistic update
    const optimisticMsg: Message = {
      id: `opt_${Date.now()}`,
      chatId,
      senderId: user.uid,
      senderName: user.displayName,
      text,
      type: 'text',
      createdAt: new Date(),
      readBy: [user.uid],
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

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
      // Optimistic message shown; real-time listener will reconcile
    } finally {
      setSending(false);
    }
  }, [chatId, newMessage, sending, user]);

  // ─── Render message ────────────────────────────────────────────────────────
  function renderMessage({ item, index }: { item: Message; index: number }) {
    const isMe = item.senderId === user?.uid;
    const initials = item.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    // Group: show date separator if day changed
    const showDate =
      index === 0 ||
      new Date(item.createdAt).toDateString() !==
        new Date(messages[index - 1].createdAt).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.dateLine} />
          </View>
        )}
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
      </>
    );
  }

  const typingLabel =
    typingNames.length === 1
      ? `${typingNames[0]} is typing...`
      : typingNames.length > 1
      ? `${typingNames.join(', ')} are typing...`
      : '';

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <GlassCard style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDotGreen} />
              <Text style={styles.onlineCount}>Game Chat</Text>
            </View>
          </View>
        </GlassCard>

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
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatIcon}>💬</Text>
                <Text style={styles.emptyChatText}>No messages yet</Text>
                <Text style={styles.emptyChatSub}>Be the first to say something!</Text>
              </View>
            }
            ListFooterComponent={
              typingNames.length > 0 ? (
                <View style={styles.typingRow}>
                  <View style={styles.senderAvatar}>
                    <Text style={styles.senderAvatarText}>
                      {typingNames[0].slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <GlassCard style={styles.typingBubble}>
                    <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
                    <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
                    <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
                    <Text style={styles.typingLabel}>{typingLabel}</Text>
                  </GlassCard>
                </View>
              ) : null
            }
          />

          {/* Input */}
          <GlassCard style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.mutedForeground + '80'}
              value={newMessage}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              <Ionicons name="send" size={16} color={Colors.primaryForeground} />
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
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  onlineDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  onlineCount: { fontSize: 11, color: Colors.mutedForeground },
  keyboardView: { flex: 1 },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    gap: 10,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border + '60' },
  dateText: { fontSize: 11, color: Colors.mutedForeground, fontWeight: '500' },
  messageRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  messageRowMe: { flexDirection: 'row-reverse' },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  senderAvatarText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  messageBubbleContainer: { maxWidth: '75%', gap: 3 },
  messageBubbleContainerMe: { alignItems: 'flex-end' },
  senderName: { fontSize: 10, color: Colors.mutedForeground, marginLeft: 4 },
  bubble: { borderRadius: BorderRadius.xl, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, color: Colors.foreground, lineHeight: 20 },
  bubbleTextMe: { color: Colors.primaryForeground },
  messageTime: { fontSize: 10, color: Colors.mutedForeground, marginLeft: 4 },
  messageTimeMe: { marginLeft: 0, marginRight: 4 },
  typingRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 4 },
  typingBubble: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    alignItems: 'center',
    borderBottomLeftRadius: 4,
    flexWrap: 'wrap',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.mutedForeground + '80',
  },
  typingLabel: { fontSize: 11, color: Colors.mutedForeground, marginLeft: 4 },
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
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...neonShadow(Colors.primary, 8, 0.4),
  },
  sendButtonDisabled: { opacity: 0.45 },
  emptyChat: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyChatIcon: { fontSize: 40 },
  emptyChatText: { fontSize: 16, fontWeight: '600', color: Colors.foreground },
  emptyChatSub: { fontSize: 13, color: Colors.mutedForeground },
});
