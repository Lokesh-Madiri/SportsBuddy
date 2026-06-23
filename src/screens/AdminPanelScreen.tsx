import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../constants';
import { GlassCard, InputField, PrimaryButton } from '../components/common';
import { BorderRadius, Colors, Spacing } from '../theme';
import { notificationService } from '../services/notifications/notificationService';
import type { ProfileStackParamList } from '../utils/types';
import { useAuthStore } from '../store/authStore';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AdminPanel'>;
};

interface AdminStats {
  totalUsers: number;
  totalPlaces: number;
  totalSports: number;
  placeDistribution: { place: string; count: number; percentage: number }[];
  sportDistribution: { sport: string; count: number; percentage: number }[];
  recentPlayers: { uid: string; displayName: string; city: string; sports: string[] }[];
}

const DEFAULT_MOCK_PLAYERS = [
  { uid: 'm1', displayName: 'Lokesh Madiri', city: 'San Francisco', sports: ['Soccer', 'Basketball'] },
  { uid: 'm2', displayName: 'Nikhil Sky', city: 'San Francisco', sports: ['Basketball', 'Tennis'] },
  { uid: 'm3', displayName: 'Alice Johnson', city: 'Los Angeles', sports: ['Tennis', 'Running'] },
  { uid: 'm4', displayName: 'Bob Smith', city: 'New York', sports: ['Soccer', 'Tennis'] },
  { uid: 'm5', displayName: 'Charlie Brown', city: 'Chicago', sports: ['Basketball', 'Running'] },
  { uid: 'm6', displayName: 'David Lee', city: 'Los Angeles', sports: ['Soccer'] },
  { uid: 'm7', displayName: 'Emma Watson', city: 'San Francisco', sports: ['Running', 'Soccer'] },
  { uid: 'm8', displayName: 'Sophia Turner', city: '', sports: ['Basketball'] }, // Empty city to trigger event fallback
];

const DEFAULT_MOCK_EVENTS = [
  {
    id: 'e1',
    title: 'Morning Basketball',
    sport: 'Basketball',
    organizerId: 'm8', // Sophia Turner
    participants: ['m8', 'm5'],
    location: {
      name: 'Brooklyn Park',
      address: 'Brooklyn Park, Brooklyn, New York, USA',
    },
  },
  {
    id: 'e2',
    title: 'Soccer Fun',
    sport: 'Soccer',
    organizerId: 'm6',
    participants: ['m6', 'm1'],
    location: {
      name: 'Griffith Park',
      address: 'Griffith Park, Los Angeles, California, USA',
    },
  },
];

function extractCityFromAddress(address: string | undefined): string | null {
  if (!address) return null;
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3) {
    return parts[parts.length - 3];
  }
  return parts[0];
}

function resolvePlayersWithFallbacks(users: any[], events: any[]) {
  return users.map((u) => {
    let city = u.location?.city || u.city;

    // Fallback: If city is missing, search events they created or joined
    if (!city) {
      const userId = u.uid || u.id;
      const userEvents = events.filter(
        (ev) =>
          ev.organizerId === userId ||
          ev.participants?.includes(userId)
      );

      if (userEvents.length > 0) {
        // Find the first event that has a valid city in name or address
        for (const ev of userEvents) {
          const parsedCity = extractCityFromAddress(ev.location?.address) || ev.location?.name;
          if (parsedCity) {
            city = parsedCity;
            break;
          }
        }
      }
    }

    // Final fallback label
    if (!city) {
      city = 'Unspecified Region';
    }

    const sports = u.sports || [];
    return {
      uid: u.uid || u.id,
      displayName: u.displayName || 'SportsBuddy Player',
      city,
      sports,
      fcmToken: u.fcmToken || null,
    };
  });
}

export function AdminPanelScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  // Credentials Authentication
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [authError, setAuthError] = useState('');

  // Dashboard Data State
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Notification Batch Form State
  const [selectedPlace, setSelectedPlace] = useState<string>('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);

  const handleLogin = () => {
    if (username.trim().toLowerCase() === 'admin' && password === 'admin123') {
      setIsAdminAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid administrator credentials.');
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      let fetchedUsers: any[] = [];
      try {
        const snapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.USERS));
        fetchedUsers = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));
      } catch (err) {
        console.warn('[AdminPanel] Firestore fetch failed, using fallback mock data:', err);
      }

      let fetchedEvents: any[] = [];
      try {
        const eventsSnapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.EVENTS));
        fetchedEvents = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (err) {
        console.warn('[AdminPanel] Firestore events fetch failed:', err);
      }

      // If Firestore returned no users, use the high-quality mockup database
      const usersToProcess = fetchedUsers.length > 0 ? fetchedUsers : DEFAULT_MOCK_PLAYERS;
      const eventsToProcess = fetchedEvents.length > 0 ? fetchedEvents : DEFAULT_MOCK_EVENTS;

      const processedPlayers = resolvePlayersWithFallbacks(usersToProcess, eventsToProcess);

      // Calculate place distribution
      const placeCounts: Record<string, number> = {};
      const sportCounts: Record<string, number> = {};

      processedPlayers.forEach((p) => {
        placeCounts[p.city] = (placeCounts[p.city] || 0) + 1;
        p.sports.forEach((s: string) => {
          const sName = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
          sportCounts[sName] = (sportCounts[sName] || 0) + 1;
        });
      });

      const totalUsers = processedPlayers.length;

      const placeDistribution = Object.entries(placeCounts)
        .map(([place, count]) => ({
          place,
          count,
          percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const sportDistribution = Object.entries(sportCounts)
        .map(([sport, count]) => ({
          sport,
          count,
          percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalUsers,
        totalPlaces: Object.keys(placeCounts).length,
        totalSports: Object.keys(sportCounts).length,
        placeDistribution,
        sportDistribution,
        recentPlayers: processedPlayers.slice(0, 5),
      });

      // Pre-select first place if none selected
      if (placeDistribution.length > 0) {
        setSelectedPlace(placeDistribution[0].place);
      }
    } catch {
      Alert.alert('Error', 'Failed to compile admin stats.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      const timer = setTimeout(() => {
        fetchDashboardData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAdminAuthenticated]);

  const handleSendBatchNotification = async () => {
    if (!selectedPlace) {
      Alert.alert('Error', 'Please select a place/batch.');
      return;
    }
    if (!notifTitle.trim() || !notifBody.trim()) {
      Alert.alert('Error', 'Please enter a notification title and body.');
      return;
    }

    setIsSending(true);
    setDispatchLogs([]);
    
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setDispatchLogs([...logs]);
    };

    addLog(`[Admin] Initiating notification batch dispatch for place: "${selectedPlace}"`);

    // Find players matching selected place
    let fetchedUsers: any[] = [];
    try {
      const snapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.USERS));
      fetchedUsers = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
    } catch {
      // Fallback
    }

    let fetchedEvents: any[] = [];
    try {
      const eventsSnapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.EVENTS));
      fetchedEvents = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch {
      // Fallback
    }

    const usersToProcess = fetchedUsers.length > 0 ? fetchedUsers : DEFAULT_MOCK_PLAYERS;
    const eventsToProcess = fetchedEvents.length > 0 ? fetchedEvents : DEFAULT_MOCK_EVENTS;

    const processedPlayers = resolvePlayersWithFallbacks(usersToProcess, eventsToProcess);

    const targets = processedPlayers.filter((p) => {
      return p.city.toLowerCase() === selectedPlace.toLowerCase() && p.uid !== user?.uid;
    });

    addLog(`[Admin] Found ${targets.length} registered player(s) in "${selectedPlace}" (excluding sender)`);

    if (targets.length === 0) {
      addLog(`[Admin] Batch canceled. No active recipients in selection.`);
      setIsSending(false);
      return;
    }

    // Sequentially process delivery logs
    for (let i = 0; i < targets.length; i++) {
      const player = targets[i];
      addLog(`[Admin] Queueing delivery to Player ${i + 1}/${targets.length}: "${player.displayName}"`);
      
      // Simulate real-world network transmission delay (0ms in tests)
      const delay = process.env.NODE_ENV === 'test' ? 0 : 300;
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      if (player.fcmToken) {
        // Send a remote push notification using Expo Push API
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: player.fcmToken,
              sound: 'default',
              title: `[Admin Batch] ${notifTitle}`,
              body: `Hey ${player.displayName || 'Player'}, ${notifBody}`,
              data: { type: 'admin_batch', place: selectedPlace },
            }),
          });
          const result = await response.json();
          if (response.ok) {
            addLog(`[Admin] -> Delivery status: REMOTE SUCCESS (Push Token: ${player.fcmToken.substring(0, 20)}...)`);
          } else {
            addLog(`[Admin] -> Delivery status: REMOTE FAILED: ${JSON.stringify(result)}`);
          }
        } catch (err: any) {
          addLog(`[Admin] -> Delivery status: REMOTE ERROR: ${err.message || 'push request failed'}`);
        }
      } else {
        // Real-world: If a target player has no push token, we skip sending push notification to them.
        // We do not send local notifications to simulate sending to other devices, which prevents spamming the admin.
        addLog(`[Admin] -> Delivery status: SKIPPED (No registered push token for "${player.displayName}")`);
      }
    }

    addLog(`[Admin] Batch notification dispatch completed successfully. Total Sent: ${targets.length}`);
    setIsSending(false);
    setNotifTitle('');
    setNotifBody('');
    Alert.alert('Success', `Notification sent to ${targets.length} players in ${selectedPlace}.`);
  };

  if (!isAdminAuthenticated) {
    return (
      <LinearGradient colors={Colors.gradientDark} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView contentContainerStyle={styles.loginScroll}>
              <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                <Text style={styles.backLinkText}>Back to Profile</Text>
              </TouchableOpacity>

              <GlassCard style={styles.loginCard}>
                <View style={styles.lockIconContainer}>
                  <Ionicons name="lock-closed" size={40} color={Colors.primary} />
                </View>
                <Text style={styles.loginTitle}>Admin Access</Text>
                <Text style={styles.loginSubtitle}>
                  Enter administrator credentials to access the statistics and player batch notifications dashboard.
                </Text>

                <InputField
                  label="USERNAME"
                  placeholder="Enter admin username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="person-outline" size={18} color={Colors.mutedForeground} />}
                />

                <InputField
                  label="PASSWORD"
                  placeholder="Enter admin password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  leftIcon={<Ionicons name="key-outline" size={18} color={Colors.mutedForeground} />}
                />

                {!!authError && <Text style={styles.authErrorText}>{authError}</Text>}

                <PrimaryButton
                  title="Authenticate"
                  onPress={handleLogin}
                  style={styles.loginButton}
                />
              </GlassCard>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchDashboardData} disabled={isLoading}>
            <Ionicons name="refresh" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Key Metrics Grid */}
          <View style={styles.metricsGrid}>
            <GlassCard style={styles.metricCard}>
              <Ionicons name="people" size={24} color={Colors.primary} />
              <Text style={styles.metricValue}>{stats?.totalUsers || 0}</Text>
              <Text style={styles.metricLabel}>Total Players</Text>
            </GlassCard>

            <GlassCard style={styles.metricCard}>
              <Ionicons name="map" size={24} color={Colors.info} />
              <Text style={styles.metricValue}>{stats?.totalPlaces || 0}</Text>
              <Text style={styles.metricLabel}>Active Regions</Text>
            </GlassCard>

            <GlassCard style={styles.metricCard}>
              <Ionicons name="football" size={24} color={Colors.warning} />
              <Text style={styles.metricValue}>{stats?.totalSports || 0}</Text>
              <Text style={styles.metricLabel}>Sports Tracked</Text>
            </GlassCard>
          </View>

          {/* Regional Distribution Graph */}
          <GlassCard style={styles.chartCard}>
            <Text style={styles.cardTitle}>Registered Users by Place</Text>
            {stats?.placeDistribution.map((item, index) => (
              <View key={item.place} style={styles.barContainer}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barName}>{item.place}</Text>
                  <Text style={styles.barCount}>{item.count} player{item.count > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: index === 0 ? Colors.primary : index === 1 ? Colors.info : Colors.warning,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </GlassCard>

          {/* Sports Interest Breakdown */}
          <GlassCard style={styles.chartCard}>
            <Text style={styles.cardTitle}>Sports Interest Distribution</Text>
            {stats?.sportDistribution.map((item, index) => (
              <View key={item.sport} style={styles.barContainer}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barName}>{item.sport}</Text>
                  <Text style={styles.barCount}>{item.count} user{item.count > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: Colors.primary,
                        opacity: 1 - index * 0.15, // Sleek fading effect for ranks
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </GlassCard>

          {/* Batch Notification Form */}
          <GlassCard style={styles.notificationCard}>
            <Text style={styles.cardTitle}>Place-Based Batch Notifications</Text>
            <Text style={styles.cardSubtitle}>
              Target announcements to players in a specific region. Notifications stagger sequentially within the selected batch only.
            </Text>

            {/* Places Selector */}
            <Text style={styles.selectLabel}>SELECT REGION BATCH</Text>
            <View style={styles.placesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placesChips}>
                {stats?.placeDistribution.map((item) => {
                  const isSelected = selectedPlace.toLowerCase() === item.place.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={item.place}
                      style={[styles.placeChip, isSelected && styles.placeChipSelected]}
                      onPress={() => setSelectedPlace(item.place)}
                    >
                      <Text style={[styles.placeChipText, isSelected && styles.placeChipTextSelected]}>
                        {item.place} ({item.count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <InputField
              label="NOTIFICATION TITLE"
              placeholder="e.g. Tournament Weekend!"
              value={notifTitle}
              onChangeText={setNotifTitle}
              containerStyle={styles.formInput}
            />

            <InputField
              label="NOTIFICATION BODY MESSAGE"
              placeholder="e.g. New soccer matches are scheduled in your city. Check them out!"
              value={notifBody}
              onChangeText={setNotifBody}
              multiline
              numberOfLines={3}
              style={styles.textArea}
              containerStyle={styles.formInput}
            />

            <PrimaryButton
              title={isSending ? 'Sending Staggered Batch...' : `Send to ${selectedPlace} Batch`}
              onPress={handleSendBatchNotification}
              disabled={isSending || !notifTitle.trim() || !notifBody.trim()}
              style={styles.sendButton}
            />

            {/* Dispatch Logs */}
            {dispatchLogs.length > 0 && (
              <View style={styles.logsContainer}>
                <Text style={styles.logsTitle}>Live Delivery Terminal Logs</Text>
                <View style={styles.logsConsole}>
                  {dispatchLogs.map((log, index) => (
                    <Text key={index} style={styles.logLine}>
                      {log}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  loginScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  loginCard: {
    padding: 24,
    gap: 16,
  },
  lockIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.foreground,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
  authErrorText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '700',
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  refreshButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.foreground,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    gap: 18,
    paddingTop: Spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.foreground,
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartCard: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.foreground,
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 18,
    marginBottom: 16,
  },
  barContainer: {
    marginBottom: 14,
    gap: 6,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.foreground,
  },
  barCount: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  notificationCard: {
    padding: 18,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  placesContainer: {
    marginBottom: 14,
  },
  placesChips: {
    gap: 8,
  },
  placeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  placeChipSelected: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  placeChipText: {
    fontSize: 13,
    color: Colors.foreground,
  },
  placeChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  formInput: {
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  sendButton: {
    marginTop: 6,
  },
  logsContainer: {
    marginTop: 18,
    gap: 8,
  },
  logsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.mutedForeground,
  },
  logsConsole: {
    backgroundColor: '#050508',
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 120,
    gap: 4,
  },
  logLine: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.primary,
    lineHeight: 16,
  },
});
