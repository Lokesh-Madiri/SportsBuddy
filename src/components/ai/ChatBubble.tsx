import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIMessageCard } from './AIMessageCard';
import { Colors } from '../../theme';
import { timeAgo } from '../../utils/helpers';
import type { AIChatMessage } from '../../services/aiService';

type Props = {
  message: AIChatMessage;
};

export function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={15} color={Colors.primary} />
        </View>
      )}
      <View style={[styles.content, isUser && styles.contentUser]}>
        <AIMessageCard content={message.content} isUser={isUser} />
        <Text style={[styles.time, isUser && styles.timeUser]}>
          {timeAgo(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  content: {
    maxWidth: '78%',
    gap: 4,
  },
  contentUser: {
    alignItems: 'flex-end',
  },
  time: {
    marginLeft: 4,
    fontSize: 10,
    color: Colors.mutedForeground,
  },
  timeUser: {
    marginRight: 4,
  },
});
