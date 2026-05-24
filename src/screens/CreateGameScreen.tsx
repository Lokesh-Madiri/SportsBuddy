import React, { useState, useEffect } from 'react';
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
import { HomeStackParamList } from '../utils/types';
import { useAuthStore } from '../store/authStore';
import { createEvent } from '../firebase/firestore';
import { aiService } from '../services/aiService';
import { InputField, PrimaryButton, GlassCard } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { SPORTS, SKILL_LEVELS } from '../constants';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'CreateGame'>;
};

export function CreateGameScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [skillLevel, setSkillLevel] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');

  useEffect(() => {
    aiService.getEventSuggestion(user || {}).then((suggestion) => {
      setAiSuggestion(
        `Based on your preferences, we recommend hosting on ${suggestion.suggestedDay}s at ${suggestion.suggestedTime} for maximum player turnout.`
      );
    });
  }, []);

  async function handlePublish() {
    if (!sport) { Alert.alert('Missing Info', 'Please select a sport'); return; }
    if (!location.trim()) { Alert.alert('Missing Info', 'Please enter a location'); return; }
    if (!skillLevel) { Alert.alert('Missing Info', 'Please select a skill level'); return; }
    if (!date.trim()) { Alert.alert('Missing Info', 'Please enter a date'); return; }
    if (!time.trim()) { Alert.alert('Missing Info', 'Please enter a time'); return; }

    setLoading(true);
    try {
      const eventId = await createEvent({
        title: `${sport} Game`,
        sport,
        description: description.trim(),
        location: { name: location.trim() },
        date: new Date(date),
        time,
        skillLevel,
        maxPlayers: parseInt(maxPlayers, 10) || 10,
        currentPlayers: 1,
        participants: user
          ? [{ uid: user.uid, displayName: user.displayName, confirmed: true, joinedAt: new Date() }]
          : [],
        organizerId: user?.uid || '',
        organizerName: user?.displayName || 'Unknown',
        organizerRating: user?.rating,
        status: 'upcoming',
      });

      Alert.alert('Game Created!', 'Your game has been published.', [
        { text: 'View Game', onPress: () => navigation.replace('MatchDetails', { eventId }) },
        { text: 'Go Home', onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Create Game</Text>
            <Text style={styles.headerSubtitle}>Set up your match</Text>
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
            {/* Sport Picker */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sport Type</Text>
              <TouchableOpacity
                onPress={() => setShowSportPicker(!showSportPicker)}
                style={styles.picker}
              >
                <Text style={sport ? styles.pickerValue : styles.pickerPlaceholder}>
                  {sport ? `${SPORTS.find((s) => s.name === sport)?.icon} ${sport}` : 'Select a sport'}
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
                  label="Date"
                  placeholder="e.g. 2026-06-15"
                  value={date}
                  onChangeText={setDate}
                />
              </View>
              <View style={styles.halfField}>
                <InputField
                  label="Time"
                  placeholder="e.g. 6:00 PM"
                  value={time}
                  onChangeText={setTime}
                />
              </View>
            </View>

            {/* Location */}
            <InputField
              label="Location"
              placeholder="Enter location or address"
              value={location}
              onChangeText={setLocation}
              containerStyle={styles.fieldSpacing}
            />

            {/* Skill Level */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Skill Level</Text>
              <View style={styles.skillGrid}>
                {SKILL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSkillLevel(level)}
                    style={[
                      styles.skillButton,
                      skillLevel === level && styles.skillButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.skillButtonText,
                        skillLevel === level && styles.skillButtonTextActive,
                      ]}
                    >
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
              containerStyle={styles.fieldSpacing}
            />

            {/* Description */}
            <InputField
              label="Description (optional)"
              placeholder="Tell players what to expect..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              containerStyle={styles.fieldSpacing}
              style={styles.textArea}
            />

            {/* AI Suggestion */}
            {aiSuggestion ? (
              <GlassCard style={styles.aiCard} neonBorder>
                <View style={styles.aiIconContainer}>
                  <Text style={styles.aiIcon}>⚡</Text>
                </View>
                <View style={styles.aiContent}>
                  <Text style={styles.aiTitle}>AI Suggestion</Text>
                  <Text style={styles.aiText}>{aiSuggestion}</Text>
                </View>
              </GlassCard>
            ) : null}

            <PrimaryButton
              title="Publish Game"
              onPress={handlePublish}
              loading={loading}
              style={styles.publishButton}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: Colors.foreground,
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    gap: 16,
  },
  field: { gap: 8 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.foreground,
  },
  fieldSpacing: { marginTop: 0 },
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
  pickerValue: {
    fontSize: 15,
    color: Colors.foreground,
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: Colors.mutedForeground + '80',
  },
  chevron: {
    color: Colors.mutedForeground,
    fontSize: 12,
  },
  dropdown: {
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 200 },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.foreground,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: { flex: 1 },
  skillGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  skillButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  skillButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  skillButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedForeground,
  },
  skillButtonTextActive: {
    color: Colors.primaryForeground,
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  aiCard: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: { fontSize: 20 },
  aiContent: { flex: 1 },
  aiTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  aiText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  publishButton: { marginTop: 8 },
});
