import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

type Props = {
  content: string;
  isUser?: boolean;
};

export function AIMessageCard({ content, isUser = false }: Props) {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  return (
    <View style={[styles.card, isUser ? styles.userCard : styles.assistantCard]}>
      {lines.map((line, index) => {
        const bullet = line.trim().match(/^[-*]\s+(.*)$/);
        const heading = line.trim().replace(/\*\*/g, '');
        return (
          <Text
            key={`${line}-${index}`}
            style={[
              styles.text,
              isUser && styles.userText,
              line.includes('**') && styles.heading,
            ]}
          >
            {bullet ? `• ${bullet[1].replace(/\*\*/g, '')}` : heading}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  assistantCard: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderBottomLeftRadius: 4,
  },
  userCard: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.foreground,
  },
  userText: {
    color: Colors.primaryForeground,
    fontWeight: '600',
  },
  heading: {
    fontWeight: '800',
    color: Colors.primary,
  },
});
