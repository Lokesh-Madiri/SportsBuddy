import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, GlassCard } from '../common';
import { BorderRadius, Colors, Spacing } from '../../theme';
import type { UserReview } from '../../utils/types';
import { StarRating } from './StarRating';

type ReviewCardProps = {
  review: UserReview;
};

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Avatar name={review.reviewerName} photoURL={review.reviewerAvatar} size={36} />
        <View style={styles.author}>
          <Text style={styles.name}>{review.reviewerName}</Text>
          <Text style={styles.meta}>{review.role === 'organizer' ? 'Organizer review' : 'Teammate review'}</Text>
        </View>
        <StarRating value={review.rating} readonly size={14} />
      </View>

      {!!review.comment && <Text style={styles.comment}>{review.comment}</Text>}

      <View style={styles.tagRow}>
        {review.tags.slice(0, 3).map((tag) => (
          <View key={tag} style={styles.tag}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.base,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  author: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
  },
  meta: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  comment: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.foreground,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
});
