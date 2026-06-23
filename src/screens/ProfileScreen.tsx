import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, GlassCard, PrimaryButton } from '../components/common';
import { ReviewCard, StarRating, TrustBadge, TrustSummaryCard } from '../components/ratings';
import { AchievementBadges, MatchHistoryList, UserStatsCard } from '../components/profile';
import { profileService, calculateAchievementBadges } from '../services/profileService';
import { reputationService } from '../services/reputationService';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { BorderRadius, Colors, Spacing } from '../theme';
import type {
  MatchHistoryItem,
  ProfileStackParamList,
  ReputationMetrics,
  UserReview,
} from '../utils/types';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;
};

export function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const [metrics, setMetrics] = useState<ReputationMetrics | null>(user?.reputation || null);
  const [recentReviews, setRecentReviews] = useState<UserReview[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>(user?.completedMatches || []);
  const [trustLoading, setTrustLoading] = useState(false);

  const imageURL = user?.imageURL || user?.profileImage || user?.photoURL;
  const badges = user?.badges?.length
    ? user.badges
    : calculateAchievementBadges({ ...user, reputation: metrics || undefined });

  useEffect(() => {
    let mounted = true;
    if (!user?.uid) return;

    async function loadProfileData() {
      setTrustLoading(true);
      try {
        const [snapshot, matches] = await Promise.all([
          reputationService.getProfileTrustSnapshot(user!.uid),
          profileService.getMatchHistory(user!.uid, 5),
        ]);
        if (mounted) {
          setMetrics(snapshot.metrics);
          setRecentReviews(snapshot.recentReviews);
          setMatchHistory(matches.length ? matches : user?.completedMatches || []);
        }
      } catch {
        if (mounted) {
          setMetrics(user?.reputation || null);
          setMatchHistory(user?.completedMatches || []);
        }
      } finally {
        if (mounted) setTrustLoading(false);
      }
    }

    loadProfileData();
    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
            logout();
          } catch {
            Alert.alert('Error', 'Failed to sign out. Try again.');
          }
        },
      },
    ]);
  }

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('AdminPanel')}
              accessibilityLabel="Admin Panel"
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <GlassCard style={styles.profileCard} neonBorder={!!metrics?.trustedBadge}>
            <View style={styles.glowEffect} />
            <View style={styles.profileTop}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('EditProfile')}
                style={styles.avatarContainer}
              >
                <Avatar name={user?.displayName || 'User'} photoURL={imageURL} size={82} />
                <View style={styles.editAvatarButton}>
                  <Ionicons name="pencil" size={12} color={Colors.primaryForeground} />
                </View>
              </TouchableOpacity>

              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.displayName}>{user?.displayName || 'SportsBuddy Player'}</Text>
                  {metrics && <TrustBadge level={metrics.trustLevel} trusted={metrics.trustedBadge} />}
                </View>
                <Text style={styles.username}>
                  @{user?.username || user?.displayName?.toLowerCase().replace(/\s+/g, '') || 'player'}
                </Text>
                {!!user?.favoriteSport && <Text style={styles.favoriteSport}>{user.favoriteSport} main</Text>}
                <View style={styles.ratingRow}>
                  <StarRating value={metrics?.averageRating || user?.rating || 0} readonly size={14} />
                  <Text style={styles.rating}>{(metrics?.averageRating || user?.rating || 0).toFixed(1)}</Text>
                  <Text style={styles.reviewCount}>({metrics?.reviewCount || user?.reviewCount || 0} reviews)</Text>
                </View>
              </View>
            </View>

            <View style={styles.sportsRow}>
              {(user?.sports?.length ? user.sports : ['Basketball', 'Tennis', 'Running']).map((sport) => (
                <View key={sport} style={styles.sportTag}>
                  <Text style={styles.sportTagText}>{sport}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {!!(user?.bio || user?.sportsPersonality) && (
            <GlassCard style={styles.bioCard}>
              {!!user.bio && <Text style={styles.bioText}>{user.bio}</Text>}
              {!!user.sportsPersonality && (
                <Text style={styles.personalityText}>{user.sportsPersonality}</Text>
              )}
            </GlassCard>
          )}

          <UserStatsCard user={user} metrics={metrics} />

          {metrics && <TrustSummaryCard metrics={metrics} />}

          {!!user?.availability && (
            <GlassCard style={styles.availabilityCard}>
              <View style={styles.availabilityHeader}>
                <Text style={styles.sectionTitle}>Availability</Text>
                {user.availability.weekendOnly && <Text style={styles.weekendBadge}>Weekend</Text>}
              </View>
              <Text style={styles.availabilityText}>
                {(user.availability.availableDays || []).length
                  ? user.availability.availableDays.join(', ')
                  : 'No days selected'}
              </Text>
              <Text style={styles.availabilitySubtext}>
                {(user.availability.availableTimeSlots || []).length
                  ? user.availability.availableTimeSlots.join(' / ')
                  : 'No preferred times selected'}
              </Text>
            </GlassCard>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <Text style={styles.seeAll}>{badges.filter((badge) => badge.earned).length}/{badges.length}</Text>
            </View>
            <AchievementBadges badges={badges} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Community Reviews</Text>
              <Text style={styles.seeAll}>
                {trustLoading ? 'Loading' : `${recentReviews.length} recent`}
              </Text>
            </View>
            <View style={styles.listGap}>
              {recentReviews.length > 0 ? (
                recentReviews.map((review) => <ReviewCard key={review.id} review={review} />)
              ) : (
                <GlassCard style={styles.emptyCard}>
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
                  <View style={styles.emptyText}>
                    <Text style={styles.emptyTitle}>No reviews yet</Text>
                    <Text style={styles.emptySubtitle}>Post-match feedback will appear here.</Text>
                  </View>
                </GlassCard>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Match History</Text>
              <Text style={styles.seeAll}>{matchHistory.length} recent</Text>
            </View>
            <MatchHistoryList matches={matchHistory} />
          </View>

          <PrimaryButton
            title="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
            variant="outline"
            style={styles.editButton}
          />

          <TouchableOpacity onPress={handleLogout} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: 16,
  },
  profileCard: {
    padding: 22,
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(190,255,0,0.12)',
  },
  profileTop: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  avatarContainer: { position: 'relative' },
  editAvatarButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
  },
  username: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 6,
  },
  favoriteSport: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '800',
    marginBottom: 7,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sportTagText: {
    fontSize: 12,
    color: Colors.foreground,
  },
  bioCard: {
    padding: 16,
    gap: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.foreground,
  },
  personalityText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.mutedForeground,
  },
  availabilityCard: {
    padding: 16,
    gap: 6,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.foreground,
  },
  availabilitySubtext: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  weekendBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.foreground,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  listGap: { gap: 10 },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  emptyText: { flex: 1 },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.foreground,
  },
  emptySubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  editButton: { marginTop: 4 },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '700',
  },
});
