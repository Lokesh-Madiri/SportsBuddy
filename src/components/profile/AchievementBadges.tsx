import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors } from '../../theme';
import type { AchievementBadge } from '../../utils/types';

type Props = {
  badges: AchievementBadge[];
};

export function AchievementBadges({ badges }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {badges.map((badge) => (
        <View key={badge.id} style={[styles.card, !badge.earned && styles.locked]}>
          <View style={[styles.iconBox, badge.earned && styles.iconBoxEarned]}>
            <Ionicons
              name={badge.icon as React.ComponentProps<typeof Ionicons>['name']}
              size={22}
              color={badge.earned ? Colors.primary : Colors.mutedForeground + '60'}
            />
          </View>
          <Text style={[styles.name, !badge.earned && styles.lockedText]} numberOfLines={2}>
            {badge.name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingRight: 4 },
  card: {
    width: 98,
    minHeight: 98,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: 10,
  },
  locked: {
    borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxEarned: {
    backgroundColor: Colors.primaryDim,
  },
  name: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.foreground,
    textAlign: 'center',
  },
  lockedText: {
    color: Colors.mutedForeground + '80',
  },
});
