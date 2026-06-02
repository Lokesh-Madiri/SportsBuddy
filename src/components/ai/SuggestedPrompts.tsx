import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

type Props = {
  prompts: string[];
  onSelect: (prompt: string) => void;
};

export function SuggestedPrompts({ prompts, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {prompts.map((prompt) => (
        <TouchableOpacity key={prompt} onPress={() => onSelect(prompt)} style={styles.chip}>
          <Text style={styles.text}>{prompt}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
});
