import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../utils/types';
import { neonShadow } from '../utils/platform';
import { useAuthStore } from '../store/authStore';
import {
  subscribeToEvent,
  joinEvent,
  leaveEvent,
  deleteEvent,
  completeEvent,
  ensureChat,
} from '../firebase/firestore';
import { notificationService } from '../services/notifications';
import { GlassCard, Avatar, Badge, PrimaryButton, LoadingScreen } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { formatDate } from '../utils/helpers';
import type { SportEvent } from '../utils/types';

// Mock data for demo
const MOCK_EVENT: SportEvent = {
  id: 'mock_1',
  title: '5v5 Pickup Game',
  sport: 'Basketball',
  description: 'Looking for competitive players for a friendly 5v5 game. All skill levels welcome but intermediate preferred.',
  location: { name: 'Central Park Basketball Court', address: 'East 72nd St, New York, NY' },
  date: new Date(),
  time: '6:00 PM',
  endTime: '8:00 PM',
  skillLevel: 'Intermediate',
  maxPlayers: 10,
  currentPlayers: 6,
  participants: [
    { uid: '1', displayName: 'Marcus T.', confirmed: true, joinedAt: new Date() },
    { uid: '2', displayName: 'Alex C.', confirmed: true, joinedAt: new Date() },
    { uid: '3', displayName: 'Sarah K.', confirmed: true, joinedAt: new Date() },
    { uid: '4', displayName: 'James W.', confirmed: true, joinedAt: new Date() },
    { uid: '5', displayName: 'Emily R.', confirmed: false, joinedAt: new Date() },
    { uid: '6', displayName: 'David L.', confirmed: true, joinedAt: new Date() },
  ],
  organizerId: 'org_1',
  organizerName: 'Marcus Thompson',
  organizerRating: 4.9,
  status: 'upcoming',
  chatId: 'chat_mock_1',
  distance: '0.8 mi',
  createdAt: new Date(),
  updatedAt: new Date(),
};

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'MatchDetails'>;
  route: RouteProp<HomeStackParamList, 'MatchDetails'>;
};

export function MatchDetailsScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { user } = useAuthStore();
  const [event, setEvent] = useState<SportEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const isOrganizer = event?.organizerId === user?.uid;
  const isParticipant = event?.participants.some((p) => p.uid === user?.uid);
  const isFull = (event?.currentPlayers || 0) >= (event?.maxPlayers || 0);

  // ─── Live subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    if (eventId.startsWith('mock_')) {
      // Mock path — schedule state updates asynchronously to satisfy the linter rule
      const t = setTimeout(() => {
        setEvent(MOCK_EVENT);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const unsubscribe = subscribeToEvent(eventId, (liveEvent) => {
      setEvent(liveEvent ?? MOCK_EVENT);
      setLoading(false);
    });

    return unsubscribe;
  }, [eventId]);

  async function handleJoin() {
    if (!user || !event) return;
    setJoining(true);
    try {
      if (isParticipant) {
        await leaveEvent(event.id, user.uid);
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.filter((p) => p.uid !== user.uid),
                currentPlayers: prev.currentPlayers - 1,
              }
            : prev
        );
      } else {
        await joinEvent(event.id, {
          uid: user.uid,
          displayName: user.displayName,
        });
        await notificationService.scheduleAutomaticEventReminders({
          eventId: event.id,
          title: event.title,
          sport: event.sport,
          date: event.date,
          time: event.time,
          location: event.location,
        });
        await notificationService.notifyJoinRequest({
          eventId: event.id,
          eventTitle: event.title,
          requesterName: user.displayName,
          organizerId: event.organizerId,
        });
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                participants: [
                  ...prev.participants,
                  { uid: user.uid, displayName: user.displayName, confirmed: true, joinedAt: new Date() },
                ],
                currentPlayers: prev.currentPlayers + 1,
              }
            : prev
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to update participation. Try again.');
    } finally {
      setJoining(false);
    }
  }

  async function handleShare() {
    if (!event) return;
    await Share.share({
      message: `Join me for ${event.title} - ${event.sport} at ${event.location.name}! Download SportsBuddy to join.`,
    });
  }

  function handleEdit() {
    if (!event) return;
    navigation.navigate('EditGame', { eventId: event.id });
  }

  function handleDelete() {
    Alert.alert(
      'Delete Event',
      'This will permanently delete the event and its chat. Participants will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (event) {
                await notificationService.notifyEventCancelled({
                  eventId: event.id,
                  eventTitle: event.title,
                });
              }
              await deleteEvent(eventId);
              navigation.popToTop();
            } catch {
              Alert.alert('Error', 'Failed to delete event. Try again.');
            }
          },
        },
      ]
    );
  }

  function handleComplete() {
    Alert.alert(
      'Mark as Completed',
      'This will end the event and trigger the post-match rating flow for all participants.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeEvent(eventId);
              navigation.navigate('PostMatchRating', { eventId });
            } catch {
              Alert.alert('Error', 'Failed to complete event. Try again.');
            }
          },
        },
      ]
    );
  }

  async function handleOpenChat() {
    if (!event || !user) return;
    const chatId = event.chatId || event.id;
    // Ensure chat document exists in Firestore
    await ensureChat(
      chatId,
      event.id,
      event.title,
      event.participants.map((p) => p.uid)
    );
    navigation.navigate('ChatScreen', { chatId, eventTitle: event.title });
  }

  if (loading) return <LoadingScreen message="Loading event..." />;
  if (!event) return null;

  const emptySlots = Math.max(0, event.maxPlayers - event.participants.length);

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      {/* Banner */}
      <View style={styles.banner}>
        <LinearGradient
          colors={['rgba(190,255,0,0.25)', 'rgba(190,255,0,0.05)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', '#0a0a0a']}
          style={styles.bannerFade}
        />

        {/* Nav buttons */}
        <SafeAreaView edges={['top']} style={styles.bannerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
            <Text style={styles.navButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.bannerActions}>
            {isOrganizer && (
              <>
                <TouchableOpacity onPress={handleEdit} style={styles.navButton}>
                  <Ionicons name="pencil-outline" size={18} color={Colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={[styles.navButton, styles.deleteButton]}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={handleShare} style={styles.navButton}>
              <Text style={styles.navButtonText}>↑</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Sport icon */}
        <View style={styles.sportIconContainer}>
          <Text style={styles.sportIconLabel}>{event?.sport?.slice(0, 2).toUpperCase() ?? 'SP'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{event.title}</Text>
          <Badge label={event.skillLevel} />
        </View>
        <Text style={styles.sportLabel}>{event.sport}</Text>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <GlassCard style={styles.infoCard}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(event.date)}</Text>
          </GlassCard>
          <GlassCard style={styles.infoCard}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{event.time}</Text>
          </GlassCard>
        </View>

        {/* Location */}
        <GlassCard style={styles.locationCard}>
          <View style={styles.locationText}>
            <Text style={styles.locationName}>{event.location.name}</Text>
            {event.location.address && (
              <Text style={styles.locationAddress}>{event.location.address}</Text>
            )}
          </View>
        </GlassCard>

        {/* Description */}
        {event.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}

        {/* Host */}
        <GlassCard style={styles.hostCard}>
          <Avatar name={event.organizerName} size={48} />
          <View style={styles.hostInfo}>
            <View style={styles.hostNameRow}>
              <Text style={styles.hostName}>{event.organizerName}</Text>
            </View>
            <Text style={styles.hostMeta}>
              {event.organizerRating} · Host
            </Text>
          </View>
          <View style={styles.hostBadge}>
            <Text style={styles.hostBadgeText}>Host</Text>
          </View>
        </GlassCard>

        {/* Players */}
        <View style={styles.playersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Players ({event.participants.length}/{event.maxPlayers})
            </Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playersRow}>
            {event.participants.map((p) => (
              <View key={p.uid} style={styles.playerItem}>
                <View style={[styles.playerAvatar, p.confirmed && styles.playerAvatarConfirmed]}>
                  <Text style={[styles.playerAvatarText, p.confirmed && styles.playerAvatarTextConfirmed]}>
                    {p.displayName.slice(0, 2).toUpperCase()}
                  </Text>
                  {p.confirmed && (
                    <View style={styles.confirmedBadge}>
                      <Text style={styles.confirmedCheck}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.playerName} numberOfLines={1}>{p.displayName}</Text>
              </View>
            ))}
            {[...Array(Math.min(emptySlots, 4))].map((_, i) => (
              <View key={`empty_${i}`} style={styles.playerItem}>
                <View style={styles.emptySlot} />
                <Text style={styles.emptySlotText}>Open</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Chat preview */}
        <TouchableOpacity onPress={handleOpenChat}>
          <GlassCard style={styles.chatPreview}>
            <View style={styles.chatInfo}>
              <Text style={styles.chatTitle}>Game Chat</Text>
              <Text style={styles.chatSubtitle}>Tap to join the conversation</Text>
            </View>
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>💬</Text>
            </View>
          </GlassCard>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Footer actions */}
      <View style={styles.footer}>
        {/* Organizer-only controls */}
        {isOrganizer && event.status === 'upcoming' && (
          <View style={styles.organizerRow}>
            <TouchableOpacity onPress={handleComplete} style={styles.completeButton}>
              <Text style={styles.completeButtonText}>✓ Mark Complete</Text>
            </TouchableOpacity>
          </View>
        )}
        {isParticipant && event.status === 'completed' && (
          <PrimaryButton
            title="Rate Players"
            onPress={() => navigation.navigate('PostMatchRating', { eventId: event.id })}
            variant="outline"
            style={styles.rateButton}
          />
        )}
        <PrimaryButton
          title={isParticipant ? 'Leave Game' : isFull ? 'Game Full' : 'Join Game'}
          onPress={handleJoin}
          loading={joining}
          disabled={isFull && !isParticipant}
          variant={isParticipant ? 'outline' : 'primary'}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    height: 200,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  bannerFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  bannerNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
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
  navButtonText: {
    color: Colors.foreground,
    fontSize: 18,
    fontWeight: '600',
  },
  sportIconContainer: {
    position: 'absolute',
    bottom: 20,
    left: Spacing.lg,
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...neonShadow(Colors.primary, 12, 0.4),
  },
  sportIconLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
    flex: 1,
    marginRight: 12,
  },
  sportLabel: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  locationText: { flex: 1 },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  locationAddress: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  descriptionSection: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 22,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  hostInfo: { flex: 1 },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  hostName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
  },
  hostMeta: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  hostBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  hostBadgeText: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  playersSection: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary,
  },
  playersRow: {
    gap: 12,
    paddingRight: 4,
  },
  playerItem: {
    alignItems: 'center',
    width: 56,
  },
  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  playerAvatarConfirmed: {
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  playerAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  playerAvatarTextConfirmed: {
    color: Colors.primary,
  },
  confirmedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  confirmedCheck: {
    fontSize: 9,
    color: Colors.primaryForeground,
    fontWeight: '700',
  },
  playerName: {
    fontSize: 10,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  emptySlot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  emptySlotText: {
    fontSize: 10,
    color: Colors.mutedForeground + '80',
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  chatInfo: { flex: 1 },
  chatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  chatSubtitle: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  chatBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadgeText: {
    fontSize: 14,
  },
  bottomPadding: { height: 20 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: Colors.glass,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    gap: 10,
  },
  rateButton: {
    height: 48,
  },
  // Banner action buttons (edit / delete / share row)
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    borderColor: Colors.error + '60',
  },
  // Organizer complete row
  organizerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  completeButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.success + '20',
    borderWidth: 1,
    borderColor: Colors.success + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
});
