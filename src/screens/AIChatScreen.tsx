import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatBubble, RecommendationCards, SuggestedPrompts, TypingIndicator } from '../components/ai';
import { GlassCard } from '../components/common';
import { chatService } from '../services/aiService';
import type { AIChatMessage, AssistantContext } from '../services/aiService';
import { useAuthStore } from '../store/authStore';
import { BorderRadius, Colors, Spacing } from '../theme';
import type { ChatStackParamList } from '../utils/types';
import { neonShadow } from '../utils/platform';

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, 'AIChat'>;
};

const WELCOME_MESSAGE: AIChatMessage = {
  id: 'welcome',
  chatId: 'local',
  role: 'assistant',
  content:
    'Hey, I am SportsBuddy AI. I can help you find matches, compare teammates, plan training, explain rules, or organize your next game.',
  createdAt: new Date(),
  status: 'sent',
  metadata: { provider: 'local', model: 'welcome' },
};

export function AIChatScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<AssistantContext | null>(null);
  const flatListRef = useRef<FlatList<AIChatMessage>>(null);

  const prompts = useMemo(() => [
    'Find matches near me',
    'Who should I team up with?',
    'Create a basketball event',
    'Give me a training plan',
    'Explain volleyball rules',
  ], []);

  useEffect(() => {
    let unsubscribe: undefined | (() => void);
    let mounted = true;
    if (!user?.uid) return;

    async function bootstrap() {
      try {
        const id = await chatService.getOrCreateAssistantChat(user!.uid);
        if (!mounted) return;
        setChatId(id);
        unsubscribe = chatService.subscribeToMessages(id, (liveMessages: AIChatMessage[]) => {
          setMessages(liveMessages.length ? liveMessages : [WELCOME_MESSAGE]);
        });
      } catch {
        Alert.alert('AI chat unavailable', 'Could not load your AI chat history.');
      }
    }

    bootstrap();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;
    if (!user?.uid) return;

    chatService.buildAssistantContext(user).then((nextContext: AssistantContext) => {
      if (mounted) setContext(nextContext);
    }).catch(() => {
      if (mounted) setContext(null);
    });

    return () => {
      mounted = false;
    };
  }, [user]);

  const sendPrompt = useCallback(async (text: string) => {
    if (!user || !chatId || !text.trim() || isTyping) return;
    const content = text.trim();
    setInput('');
    setIsTyping(true);

    const optimistic: AIChatMessage = {
      id: `local-${Date.now()}`,
      chatId,
      role: 'user',
      content,
      createdAt: new Date(),
      status: 'sending',
    };
    setMessages((current) => [...current.filter((message) => message.id !== 'welcome'), optimistic]);

    try {
      await chatService.sendAssistantMessage({
        chatId,
        user,
        content,
        history: messages.filter((message) => message.id !== 'welcome'),
      });
    } catch {
      Alert.alert('AI error', 'Could not send your message. Try again.');
    } finally {
      setIsTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatId, isTyping, messages, user]);

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <GlassCard style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>SportsBuddy AI</Text>
              <View style={styles.liveBadge}>
                <Ionicons name="sparkles" size={11} color={Colors.primary} />
                <Text style={styles.liveText}>Smart</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Events, teammates, coaching, and coordination</Text>
          </View>
        </GlassCard>

        <View style={styles.recommendationBand}>
          <RecommendationCards
            events={context?.nearbyEvents || []}
            teammates={context?.teammateRecommendations || []}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboard}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
            removeClippedSubviews
            initialNumToRender={14}
            maxToRenderPerBatch={12}
            windowSize={9}
          />

          <SuggestedPrompts prompts={prompts} onSelect={sendPrompt} />

          <GlassCard style={styles.inputArea}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about games, teammates, rules..."
              placeholderTextColor={Colors.mutedForeground + '80'}
              style={styles.input}
              multiline
              maxLength={800}
            />
            <TouchableOpacity
              onPress={() => sendPrompt(input)}
              disabled={!input.trim() || isTyping || !chatId}
              style={[styles.sendButton, (!input.trim() || isTyping || !chatId) && styles.sendButtonDisabled]}
            >
              <Ionicons name="send" size={17} color={Colors.primaryForeground} />
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
  },
  recommendationBand: {
    paddingVertical: 12,
  },
  keyboard: { flex: 1 },
  messages: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    gap: 15,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderRadius: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 108,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(24,24,30,0.55)',
    color: Colors.foreground,
    paddingHorizontal: 15,
    paddingVertical: 11,
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...neonShadow(Colors.primary, 10, 0.35),
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
