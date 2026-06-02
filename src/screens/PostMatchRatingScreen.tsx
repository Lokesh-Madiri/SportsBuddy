import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, GlassCard, LoadingScreen, PrimaryButton } from '../components/common';
import { StarRating } from '../components/ratings';
import { getEventById } from '../firebase/firestore';
import { reputationService } from '../services/reputationService';
import { useAuthStore } from '../store/authStore';
import { BorderRadius, Colors, Spacing } from '../theme';
import type { EventParticipant, HomeStackParamList, ReviewRole, SportEvent } from '../utils/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'PostMatchRating'>;
  route: RouteProp<HomeStackParamList, 'PostMatchRating'>;
};

const REVIEW_TAGS = [
  'Great communication',
  'Fair play',
  'On time',
  'Positive energy',
  'Reliable teammate',
  'Organized well',
];

const MOCK_EVENT: SportEvent = {
  id: 'mock_1',
  title: '5v5 Pickup Game',
  sport: 'Basketball',
  location: { name: 'Central Park Basketball Court' },
  date: new Date(),
  time: '6:00 PM',
  skillLevel: 'Intermediate',
  maxPlayers: 10,
  currentPlayers: 6,
  participants: [
    { uid: '1', displayName: 'Marcus T.', confirmed: true, joinedAt: new Date() },
    { uid: '2', displayName: 'Alex C.', confirmed: true, joinedAt: new Date() },
    { uid: '3', displayName: 'Sarah K.', confirmed: true, joinedAt: new Date() },
  ],
  organizerId: 'org_1',
  organizerName: 'Marcus Thompson',
  organizerRating: 4.9,
  status: 'completed',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function PostMatchRatingScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { user } = useAuthStore();
  const [event, setEvent] = useState<SportEvent | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [role, setRole] = useState<ReviewRole>('teammate');
  const [rating, setRating] = useState(5);
  const [sportsmanship, setSportsmanship] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>(['Fair play', 'Reliable teammate']);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reviewTargets = useMemo(() => {
    if (!event || !user) return [];
    const participants = event.participants.filter((participant) => participant.uid !== user.uid);
    const organizer: EventParticipant = {
      uid: event.organizerId,
      displayName: event.organizerName,
      avatar: event.organizerAvatar,
      confirmed: true,
      joinedAt: event.createdAt,
    };
    const merged = event.organizerId === user.uid ? participants : [organizer, ...participants];
    return dedupeParticipants(merged);
  }, [event, user]);

  const selectedTarget = reviewTargets.find((target) => target.uid === selectedUserId);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    try {
      const data = eventId.startsWith('mock_') ? MOCK_EVENT : await getEventById(eventId);
      const nextEvent = data || MOCK_EVENT;
      setEvent(nextEvent);
      const firstTarget = dedupeParticipants([
        {
          uid: nextEvent.organizerId,
          displayName: nextEvent.organizerName,
          avatar: nextEvent.organizerAvatar,
          confirmed: true,
          joinedAt: nextEvent.createdAt,
        },
        ...nextEvent.participants,
      ]).find((participant) => participant.uid !== user?.uid);
      setSelectedUserId(firstTarget?.uid || '');
      setRole(firstTarget?.uid === nextEvent.organizerId ? 'organizer' : 'teammate');
    } catch {
      setEvent(MOCK_EVENT);
    } finally {
      setLoading(false);
    }
  }, [eventId, user?.uid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvent();
  }, [loadEvent]);

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  function selectTarget(target: EventParticipant) {
    setSelectedUserId(target.uid);
    setRole(target.uid === event?.organizerId ? 'organizer' : 'teammate');
  }

  async function handleSubmit() {
    if (!user || !event || !selectedTarget) return;
    setSubmitting(true);
    try {
      await reputationService.submitReview({
        matchId: event.id,
        reviewerId: user.uid,
        reviewerName: user.displayName,
        reviewerAvatar: user.photoURL,
        revieweeId: selectedTarget.uid,
        revieweeName: selectedTarget.displayName,
        role,
        rating,
        sportsmanship: sportsmanship * 20,
        punctuality: punctuality * 20,
        comment: comment.trim(),
        tags,
      });
      Alert.alert('Review submitted', 'Thanks for keeping the community signal strong.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not submit this review. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen message="Preparing ratings..." />;

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Post-match rating</Text>
            <Text style={styles.subtitle}>{event?.title || 'SportsBuddy match'}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <GlassCard style={styles.card} neonBorder>
            <Text style={styles.sectionTitle}>Who are you reviewing?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerRow}>
              {reviewTargets.map((target) => {
                const selected = target.uid === selectedUserId;
                return (
                  <TouchableOpacity
                    key={target.uid}
                    onPress={() => selectTarget(target)}
                    style={[styles.playerPill, selected && styles.playerPillSelected]}
                  >
                    <Avatar name={target.displayName} photoURL={target.avatar} size={34} />
                    <Text style={[styles.playerName, selected && styles.playerNameSelected]} numberOfLines={1}>
                      {target.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </GlassCard>

          <GlassCard style={styles.card}>
            <RatingRow label="Overall rating" value={rating} onChange={setRating} />
            <RatingRow label="Sportsmanship" value={sportsmanship} onChange={setSportsmanship} />
            <RatingRow label="Punctuality" value={punctuality} onChange={setPunctuality} />
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Review type</Text>
            <View style={styles.segmented}>
              {(['teammate', 'organizer'] as ReviewRole[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setRole(item)}
                  style={[styles.segment, role === item && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, role === item && styles.segmentTextActive]}>
                    {item === 'organizer' ? 'Organizer' : 'Teammate'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>What stood out?</Text>
            <View style={styles.tagGrid}>
              {REVIEW_TAGS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tag, selected && styles.tagSelected]}
                  >
                    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Add a quick note"
              placeholderTextColor={Colors.mutedForeground}
              multiline
              style={styles.input}
              maxLength={240}
            />
          </GlassCard>

          <PrimaryButton
            title="Submit Review"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!selectedTarget}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <StarRating value={value} onChange={onChange} size={24} />
    </View>
  );
}

function dedupeParticipants(participants: EventParticipant[]): EventParticipant[] {
  const seen = new Set<string>();
  return participants.filter((participant) => {
    if (seen.has(participant.uid)) return false;
    seen.add(participant.uid);
    return true;
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    padding: Spacing.lg,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.foreground,
  },
  playerRow: {
    gap: 10,
  },
  playerPill: {
    width: 116,
    minHeight: 86,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 8,
  },
  playerPillSelected: {
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryDim,
  },
  playerName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.mutedForeground,
  },
  playerNameSelected: {
    color: Colors.primary,
  },
  ratingRow: {
    gap: 8,
    paddingVertical: 4,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.foreground,
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.mutedForeground,
  },
  segmentTextActive: {
    color: Colors.primaryForeground,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagSelected: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mutedForeground,
  },
  tagTextSelected: {
    color: Colors.primary,
  },
  input: {
    minHeight: 92,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.035)',
    color: Colors.foreground,
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 14,
  },
});
