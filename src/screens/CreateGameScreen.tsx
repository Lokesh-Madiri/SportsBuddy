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
import { HomeStackParamList } from '../utils/types';
import { neonShadow } from '../utils/platform';
import { useAuthStore } from '../store/authStore';
import { createEvent } from '../firebase/firestore';
import { aiService } from '../services/aiService';
import { PrimaryButton, InputField, GlassCard } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { SPORTS, SKILL_LEVELS } from '../constants';
import { parseDateTime } from '../utils/helpers';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'CreateGame'>;
};

const STEPS = [
  { number: 1, title: 'Sport' },
  { number: 2, title: 'Details' },
  { number: 3, title: 'Review' },
];

export function CreateGameScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [skillLevel, setSkillLevel] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('6:00 PM');
  const [location, setLocation] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);

  // Time picker states
  const [selectedHour, setSelectedHour] = useState('6');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState('PM');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSelectTime = (h: string, m: string, ap: string) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedAmPm(ap);
    setTime(`${h}:${m} ${ap}`);
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(calendarMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateString = `${calendarYear}-${formattedMonth}-${formattedDay}`;
    setDate(dateString);
    setShowCalendar(false);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  useEffect(() => {
    aiService.getEventSuggestion(user || {}).then((suggestion) => {
      setAiSuggestion(
        `Based on your preferences, we recommend hosting on ${suggestion.suggestedDay}s at ${suggestion.suggestedTime} for maximum player turnout.`
      );
    });
    // user is intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateStep1() {
    if (!sport) {
      Alert.alert('Missing Info', 'Please select a sport');
      return false;
    }
    if (!skillLevel) {
      Alert.alert('Missing Info', 'Please select a skill level');
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!date.trim()) {
      Alert.alert('Missing Info', 'Please enter a date (YYYY-MM-DD)');
      return false;
    }
    if (!time.trim()) {
      Alert.alert('Missing Info', 'Please enter a time (e.g. 6:00 PM)');
      return false;
    }
    if (!location.trim()) {
      Alert.alert('Missing Info', 'Please enter a location');
      return false;
    }

    // Future date/time validation
    const combined = parseDateTime(date, time);
    if (isNaN(combined.getTime())) {
      Alert.alert('Invalid Date/Time', 'Please enter a valid date (YYYY-MM-DD) and time (e.g. 6:00 PM)');
      return false;
    }
    if (combined <= new Date()) {
      Alert.alert('Invalid Date/Time', 'Event date and time must be in the future');
      return false;
    }
    return true;
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleHeaderBack = () => {
    if (currentStep > 1) {
      handleBack();
    } else {
      navigation.goBack();
    }
  };

  async function handlePublish() {
    if (!sport) { Alert.alert('Missing Info', 'Please select a sport'); return; }
    if (!location.trim()) { Alert.alert('Missing Info', 'Please enter a location'); return; }
    if (!skillLevel) { Alert.alert('Missing Info', 'Please select a skill level'); return; }
    if (!date.trim()) { Alert.alert('Missing Info', 'Please enter a date (YYYY-MM-DD)'); return; }
    if (!time.trim()) { Alert.alert('Missing Info', 'Please enter a time (e.g. 6:00 PM)'); return; }

    const combined = parseDateTime(date, time);
    if (isNaN(combined.getTime())) {
      Alert.alert('Invalid Date/Time', 'Please enter a valid date (YYYY-MM-DD) and time (e.g. 6:00 PM)');
      return;
    }
    if (combined <= new Date()) {
      Alert.alert('Invalid Date/Time', 'Event date and time must be in the future');
      return;
    }

    setLoading(true);
    try {
      const eventId = await createEvent({
        title: `${sport} Game`,
        sport,
        description: description.trim(),
        location: { name: location.trim() },
        date: combined,
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
    } catch {
      Alert.alert('Error', 'Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const renderCalendar = () => {
    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
      return new Date(year, month, 1).getDay();
    };

    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const cells: React.ReactNode[] = [];

    // Empty cells before start of month
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarCellEmpty} />);
    }

    // Days cells
    for (let day = 1; day <= daysInMonth; day++) {
      const formattedMonth = String(calendarMonth + 1).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const cellDateStr = `${calendarYear}-${formattedMonth}-${formattedDay}`;
      const isSelected = date === cellDateStr;

      cells.push(
        <TouchableOpacity
          key={`day-${day}`}
          onPress={() => handleSelectDay(day)}
          style={[
            styles.calendarCell,
            isSelected && styles.calendarCellSelected,
          ]}
        >
          <Text
            style={[
              styles.calendarCellText,
              isSelected && styles.calendarCellTextSelected,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <GlassCard style={styles.calendarContainer}>
        {/* Month Navigation */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
            <Text style={styles.calNavText}>◂</Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {MONTHS[calendarMonth]} {calendarYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
            <Text style={styles.calNavText}>▸</Text>
          </TouchableOpacity>
        </View>

        {/* Weekdays Labels */}
        <View style={styles.weekdaysRow}>
          {weekdayLabels.map((label) => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>{cells}</View>
      </GlassCard>
    );
  };

  const renderTimePicker = () => {
    const hours = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const minutes = ['00', '15', '30', '45'];
    const ampm = ['AM', 'PM'];

    return (
      <GlassCard style={styles.timePickerContainer}>
        <Text style={styles.timePickerTitle}>Select Time ({time || 'Not selected'})</Text>

        {/* Hours Selector */}
        <Text style={styles.timeLabel}>Hour</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScrollRow}>
          {hours.map((h) => {
            const isSel = selectedHour === h;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => handleSelectTime(h, selectedMinute, selectedAmPm)}
                style={[styles.timeSlot, isSel && styles.timeSlotActive]}
              >
                <Text style={[styles.timeSlotText, isSel && styles.timeSlotTextActive]}>
                  {h}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Minutes Selector */}
        <Text style={styles.timeLabel}>Minute</Text>
        <View style={styles.timeGridRow}>
          {minutes.map((m) => {
            const isSel = selectedMinute === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => handleSelectTime(selectedHour, m, selectedAmPm)}
                style={[styles.timeSlotFlex, isSel && styles.timeSlotActive]}
              >
                <Text style={[styles.timeSlotText, isSel && styles.timeSlotTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AM / PM Selector */}
        <Text style={styles.timeLabel}>AM / PM</Text>
        <View style={styles.timeGridRow}>
          {ampm.map((ap) => {
            const isSel = selectedAmPm === ap;
            return (
              <TouchableOpacity
                key={ap}
                onPress={() => handleSelectTime(selectedHour, selectedMinute, ap)}
                style={[styles.timeSlotFlex, isSel && styles.timeSlotActive]}
              >
                <Text style={[styles.timeSlotText, isSel && styles.timeSlotTextActive]}>
                  {ap}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <PrimaryButton
          title="Done"
          variant="outline"
          onPress={() => setShowTimePicker(false)}
          style={styles.timeDoneButton}
        />
      </GlassCard>
    );
  };

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleHeaderBack} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Create Game</Text>
            <Text style={styles.headerSubtitle}>
              Step {currentStep} of 3: {STEPS[currentStep - 1].title}
            </Text>
          </View>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.progressLineBg} />
          {currentStep > 1 && (
            <View
              style={[
                styles.progressLineActive,
                {
                  right: currentStep === 2 ? '50%' : 56,
                },
              ]}
            />
          )}

          {STEPS.map((s, index) => {
            const stepNum = index + 1;
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            return (
              <TouchableOpacity
                key={s.number}
                disabled={stepNum > currentStep}
                onPress={() => setCurrentStep(stepNum)}
                style={styles.stepNode}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isCompleted && styles.stepCircleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.stepCircleTextCompleted}>✓</Text>
                  ) : (
                    <Text
                      style={[
                        styles.stepCircleText,
                        isActive && styles.stepCircleTextActive,
                      ]}
                    >
                      {s.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    isActive && styles.stepTitleActive,
                    isCompleted && styles.stepTitleCompleted,
                  ]}
                >
                  {s.title}
                </Text>
              </TouchableOpacity>
            );
          })}
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
            {/* Step 1: Sport & Skill */}
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                {/* Sport Picker */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Sport Type</Text>
                  <TouchableOpacity
                    onPress={() => setShowSportPicker(!showSportPicker)}
                    style={styles.picker}
                  >
                    <Text style={sport ? styles.pickerValue : styles.pickerPlaceholder}>
                      {sport ? sport : 'Select a sport'}
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
              </View>
            )}

            {/* Step 2: Time & Place */}
            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                {/* Date & Time Selectors */}
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <InputField
                      label="Date (YYYY-MM-DD)"
                      placeholder="e.g. 2026-06-15"
                      value={date}
                      onChangeText={setDate}
                      onFocus={() => {
                        setShowCalendar(true);
                        setShowTimePicker(false);
                      }}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <InputField
                      label="Time"
                      placeholder="e.g. 6:00 PM"
                      value={time}
                      onChangeText={setTime}
                      onFocus={() => {
                        setShowTimePicker(true);
                        setShowCalendar(false);
                      }}
                    />
                  </View>
                </View>

                {showCalendar && renderCalendar()}
                {showTimePicker && renderTimePicker()}

                {/* Location */}
                <InputField
                  label="Location"
                  placeholder="Enter location or address"
                  value={location}
                  onChangeText={setLocation}
                  containerStyle={styles.fieldSpacing}
                />
              </View>
            )}

            {/* Step 3: Details & Review */}
            {currentStep === 3 && (
              <View style={styles.stepContainer}>
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
                  containerStyle={styles.fieldSpacing}
                  style={styles.textArea}
                />

                {/* AI Suggestion */}
                {aiSuggestion ? (
                  <GlassCard style={styles.aiCard} neonBorder>
                    <View style={styles.aiContent}>
                      <Text style={styles.aiTitle}>AI Suggestion</Text>
                      <Text style={styles.aiText}>{aiSuggestion}</Text>
                    </View>
                  </GlassCard>
                ) : null}

                {/* Review Match Details Card */}
                <GlassCard style={styles.reviewCard}>
                  <Text style={styles.reviewTitle}>Review Match Details</Text>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Sport:</Text>
                    <Text style={styles.reviewValue}>
                      {sport}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Skill Level:</Text>
                    <View style={styles.skillBadge}>
                      <Text style={styles.skillBadgeText}>{skillLevel}</Text>
                    </View>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Date & Time:</Text>
                    <Text style={styles.reviewValue}>{date} at {time}</Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Location:</Text>
                    <Text style={styles.reviewValue}>{location}</Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Max Players:</Text>
                    <Text style={styles.reviewValue}>{maxPlayers} Players</Text>
                  </View>

                  {description ? (
                    <View style={styles.reviewDescSection}>
                      <Text style={styles.reviewLabel}>Description:</Text>
                      <Text style={styles.reviewDescValue}>{description}</Text>
                    </View>
                  ) : null}
                </GlassCard>
              </View>
            )}

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
              {currentStep > 1 && (
                <PrimaryButton
                  title="Back"
                  variant="outline"
                  onPress={handleBack}
                  style={styles.backStepButton}
                />
              )}
              {currentStep < 3 ? (
                <PrimaryButton
                  title="Next Step"
                  variant="primary"
                  onPress={handleNext}
                  style={currentStep === 1 ? styles.fullWidthButton : styles.nextStepButton}
                />
              ) : (
                <PrimaryButton
                  title="Publish Game"
                  variant="primary"
                  onPress={handlePublish}
                  loading={loading}
                  style={styles.nextStepButton}
                />
              )}
            </View>
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
  stepContainer: {
    gap: 16,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(24,24,30,0.3)',
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border + '40',
    position: 'relative',
  },
  progressLineBg: {
    position: 'absolute',
    left: 56, // 32 (padding) + 24 (half of stepNode width 48)
    right: 56,
    height: 2,
    backgroundColor: Colors.border,
    top: 28, // 12 (padding) + 16 (half of circle height 32)
    zIndex: 1,
  },
  progressLineActive: {
    position: 'absolute',
    left: 56,
    height: 2,
    backgroundColor: Colors.primary,
    top: 28,
    zIndex: 2,
  },
  stepNode: {
    alignItems: 'center',
    zIndex: 3,
    width: 48,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'rgba(24,24,30,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    borderColor: Colors.primary,
    ...neonShadow(Colors.primary, 8, 0.5),
  },
  stepCircleCompleted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  stepCircleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  stepCircleTextActive: {
    color: Colors.primary,
  },
  stepCircleTextCompleted: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryForeground,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.mutedForeground,
  },
  stepTitleActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  stepTitleCompleted: {
    color: Colors.foreground,
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
    ...neonShadow(Colors.primary, 8, 0.4),
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
    padding: 16,
    gap: 8,
  },
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  backStepButton: {
    flex: 1,
  },
  nextStepButton: {
    flex: 1.5,
  },
  fullWidthButton: {
    flex: 1,
  },
  reviewCard: {
    padding: 20,
    gap: 14,
    backgroundColor: 'rgba(18, 18, 24, 0.7)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border + '40',
    marginTop: 8,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
    paddingBottom: 8,
    marginBottom: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    color: Colors.foreground,
    fontWeight: '600',
  },
  skillBadge: {
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  skillBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewDescSection: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '30',
    paddingTop: 12,
    marginTop: 4,
  },
  reviewDescValue: {
    fontSize: 13,
    color: Colors.foreground,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  calendarContainer: {
    padding: 16,
    marginTop: 8,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border + '40',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarTitle: {
    color: Colors.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  calNavBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
  },
  calNavText: {
    color: Colors.foreground,
    fontSize: 16,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 8,
  },
  calendarCell: {
    width: '14.28%', // 100% / 7
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  calendarCellEmpty: {
    width: '14.28%',
    height: 36,
  },
  calendarCellSelected: {
    backgroundColor: Colors.primary,
    ...neonShadow(Colors.primary, 8, 0.4),
  },
  calendarCellText: {
    color: Colors.foreground,
    fontSize: 13,
  },
  calendarCellTextSelected: {
    color: Colors.primaryForeground,
    fontWeight: '600',
  },
  timePickerContainer: {
    padding: 16,
    marginTop: 8,
    gap: 12,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border + '40',
  },
  timePickerTitle: {
    color: Colors.foreground,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  timeScrollRow: {
    gap: 8,
    paddingBottom: 4,
  },
  timeGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 48,
    alignItems: 'center',
  },
  timeSlotFlex: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  timeSlotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...neonShadow(Colors.primary, 8, 0.4),
  },
  timeSlotText: {
    color: Colors.foreground,
    fontSize: 13,
  },
  timeSlotTextActive: {
    color: Colors.primaryForeground,
    fontWeight: '600',
  },
  timeDoneButton: {
    height: 40,
    borderRadius: BorderRadius.lg,
    marginTop: 8,
  },
});
