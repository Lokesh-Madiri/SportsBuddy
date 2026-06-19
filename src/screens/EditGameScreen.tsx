import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../utils/types';
import { useAuthStore } from '../store/authStore';
import { getEventById, updateEvent } from '../firebase/firestore';
import { notificationService } from '../services/notifications';
import { InputField, PrimaryButton, GlassCard, LoadingScreen } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { SPORTS, SKILL_LEVELS } from '../constants';
import type { SportEvent } from '../utils/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'EditGame'>;
  route: RouteProp<HomeStackParamList, 'EditGame'>;
};

function validateFutureDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr.trim()) return 'Date is required';
  if (!timeStr.trim()) return 'Time is required';

  const combined = new Date(`${dateStr} ${timeStr}`);
  if (isNaN(combined.getTime())) {
    return 'Invalid date or time format';
  }
  if (combined <= new Date()) {
    return 'Event date and time must be in the future';
  }
  return null;
}

export function EditGameScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { user } = useAuthStore();

  const [event, setEvent] = useState<SportEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [skillLevel, setSkillLevel] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [description, setDescription] = useState('');

  useEffect(() => {
    getEventById(eventId).then((e) => {
      if (!e) { Alert.alert('Error', 'Event not found'); navigation.goBack(); return; }
      if (e.organizerId !== user?.uid) {
        Alert.alert('Permission denied', 'Only the organizer can edit this event');
        navigation.goBack();
        return;
      }
      setEvent(e);
      setTitle(e.title);
      setSport(e.sport);
      setSkillLevel(e.skillLevel);
      setDate(e.date.toISOString().split('T')[0]);
      setTime(e.time);
      setLocation(e.location.name);
      setMaxPlayers(String(e.maxPlayers));
      setDescription(e.description ?? '');
      setLoading(false);
    }).catch(() => {
      Alert.alert('Error', 'Failed to load event');
      navigation.goBack();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleSave() {
    if (!sport) { Alert.alert('Missing Info', 'Please select a sport'); return; }
    if (!location.trim()) { Alert.alert('Missing Info', 'Please enter a location'); return; }
    if (!skillLevel) { Alert.alert('Missing Info', 'Please select a skill level'); return; }

    const dtError = validateFutureDateTime(date, time);
    if (dtError) { Alert.alert('Invalid Date/Time', dtError); return; }

    const newMax = parseInt(maxPlayers, 10) || 10;
    if (event && newMax < event.currentPlayers) {
      Alert.alert(
        'Invalid Player Count',
        `Cannot set max players below current count (${event.currentPlayers})`
      );
      return;
    }

    setSaving(true);
    try {
      const updatedDate = new Date(`${date} ${time}`);
      await updateEvent(eventId, {
        title: title.trim() || `${sport} Game`,
        sport,
        location: { name: location.trim() },
        date: updatedDate,
        time,
        skillLevel,
        maxPlayers: newMax,
        description: description.trim(),
      });
      await notificationService.cancelEventReminders(eventId);
      await notificationService.scheduleAutomaticEventReminders({
        eventId,
        title: title.trim() || `${sport} Game`,
        sport,
        date: updatedDate,
        time,
        location: { name: location.trim() },
      });
      Alert.alert('Saved!', 'Event has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading event..." />;

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Edit Game</Text>
            <Text style={styles.headerSubtitle}>Organizer only</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <InputField
              label="Title"
              placeholder="Game title"
              value={title}
              onChangeText={setTitle}
            />

            {/* Sport */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sport Type</Text>
              <TouchableOpacity
                onPress={() => setShowSportPicker(!showSportPicker)}
                style={styles.picker}
              >
                <Text style={sport ? styles.pickerValue : styles.pickerPlaceholder}>
                  {sport || 'Select a sport'}
                </Text>
                <Text style={styles.chevron}>{showSportPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showSportPicker && (
                <GlassCard style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {SPORTS.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => { setSport(s.name); setShowSportPicker(false); }}
                        style={styles.dropdownItem}
                      >
                        <Text style={styles.dropdownItemText}>{s.icon} {s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </GlassCard>
              )}
            </View>

            {/* Date & Time */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <InputField
                  label="Date (YYYY-MM-DD)"
                  placeholder="2026-06-15"
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.halfField}>
                <InputField
                  label="Time"
                  placeholder="6:00 PM"
                  value={time}
                  onChangeText={setTime}
                />
              </View>
            </View>

            {/* Future date hint */}
            <Text style={styles.hint}>⚠️ Event must be scheduled in the future</Text>

            {/* Location */}
            <InputField
              label="Location"
              placeholder="Enter location"
              value={location}
              onChangeText={setLocation}
            />

            {/* Skill Level */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Skill Level</Text>
              <View style={styles.skillGrid}>
                {SKILL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSkillLevel(level)}
                    style={[styles.skillButton, skillLevel === level && styles.skillButtonActive]}
                  >
                    <Text style={[styles.skillButtonText, skillLevel === level && styles.skillButtonTextActive]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Max Players */}
            <InputField
              label="Maximum Players"
              placeholder="10"
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              keyboardType="number-pad"
            />

            {/* Description */}
            <InputField
              label="Description (optional)"
              placeholder="Tell players what to expect..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            <PrimaryButton
              title="Save Changes"
              onPress={handleSave}
              loading={saving}
              style={styles.saveButton}
            />
          </ScrollView>
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
    gap: 16,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: Colors.foreground, fontSize: 20, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.foreground },
  headerSubtitle: { fontSize: 12, color: Colors.mutedForeground },
  keyboardView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 16 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: Colors.foreground },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerValue: { fontSize: 15, color: Colors.foreground },
  pickerPlaceholder: { fontSize: 15, color: Colors.mutedForeground + '80' },
  chevron: { color: Colors.mutedForeground, fontSize: 12 },
  dropdown: { marginTop: 4, overflow: 'hidden' },
  dropdownScroll: { maxHeight: 200 },
  dropdownItem: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border + '40',
  },
  dropdownItemText: { fontSize: 15, color: Colors.foreground },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  hint: { fontSize: 12, color: Colors.warning, marginTop: -8 },
  skillGrid: { flexDirection: 'row', gap: 8 },
  skillButton: {
    flex: 1, paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  skillButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  skillButtonText: { fontSize: 12, fontWeight: '500', color: Colors.mutedForeground },
  skillButtonTextActive: { color: Colors.primaryForeground, fontWeight: '600' },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  saveButton: { marginTop: 8 },
});
