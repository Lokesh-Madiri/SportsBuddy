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
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../utils/types';
import { neonShadow } from '../utils/platform';
import { useAuthStore } from '../store/authStore';
import { createEvent } from '../firebase/firestore';
import { aiService } from '../services/aiService';
import { locationService, geocodingService } from '../services/locationService';
import { PrimaryButton, InputField, GlassCard } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { SPORTS, SKILL_LEVELS } from '../constants';
import { parseDateTime } from '../utils/helpers';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'CreateGame'>;
};

const STEPS = [
  { number: 1, title: 'Sport' },
  { number: 2, title: 'Time' },
  { number: 3, title: 'Location' },
  { number: 4, title: 'Review' },
];

const SPORT_IMAGES: Record<string, string> = {
  Basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80',
  Soccer: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=80',
  Tennis: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&q=80',
  Volleyball: 'https://images.unsplash.com/photo-1592656094267-764a45159575?w=400&q=80',
  Running: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&q=80',
  Swimming: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=400&q=80',
  Golf: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&q=80',
  Baseball: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=400&q=80',
  Cycling: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=80',
  Badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80',
};

const getSportImage = (sportName: string): string => {
  return SPORT_IMAGES[sportName] || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80';
};

interface VenueImageProps {
  uri: string;
  fallbackUri: string;
  style: any;
}

const VenueImage = ({ uri, fallbackUri, style }: VenueImageProps) => {
  const [currentUri, setCurrentUri] = useState(uri);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentUri(uri);
    setHasError(false);
  }, [uri]);

  return (
    <Image
      source={{
        uri: hasError ? fallbackUri : currentUri,
        headers: { 'User-Agent': 'SportsBuddy/1.0 (contact@sportsbuddy.com)' },
        cache: 'force-cache'
      }}
      style={style}
      resizeMode="cover"
      onError={() => {
        if (!hasError) {
          setHasError(true);
        }
      }}
    />
  );
};


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

  // Location search states
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [aiLocations, setAiLocations] = useState<any[]>([]);
  const [userCoords, setUserCoords] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userCity, setUserCity] = useState('');
  const [aiError, setAiError] = useState<string>('');
  const [isLocationInitializing, setIsLocationInitializing] = useState(false);

  const publicLocations = aiLocations.filter((loc) => loc.type !== 'private');
  const privateLocations = aiLocations.filter((loc) => loc.type === 'private');

  // Carousel Modal States
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedGround, setSelectedGround] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [isModalImagesLoading, setIsModalImagesLoading] = useState(false);

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);

  // Time picker states
  const [selectedHour, setSelectedHour] = useState('6');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState('PM');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const SPORT_CAROUSEL_IMAGES: Record<string, string[]> = {
    Basketball: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80',
      'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=600&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80',
    ],
    Soccer: [
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80',
      'https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=600&q=80',
      'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=600&q=80',
    ],
    Tennis: [
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&q=80',
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600&q=80',
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80',
    ],
    Volleyball: [
      'https://images.unsplash.com/photo-1592656094267-764a45159575?w=600&q=80',
      'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=600&q=80',
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600&q=80',
    ],
    Running: [
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80',
      'https://images.unsplash.com/photo-1502904582529-0a1514896a2e?w=600&q=80',
      'https://images.unsplash.com/photo-1486218119243-13883505764c?w=600&q=80',
    ],
    Swimming: [
      'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=600&q=80',
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80',
      'https://images.unsplash.com/photo-1468476775582-6bede20f356f?w=600&q=80',
    ],
    Golf: [
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&q=80',
      'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=600&q=80',
      'https://images.unsplash.com/photo-1460889418202-14dfcbe1546d?w=600&q=80',
    ],
    Baseball: [
      'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&q=80',
      'https://images.unsplash.com/photo-1471295263379-6ca2d418873f?w=600&q=80',
      'https://images.unsplash.com/photo-1544045564-9473b5a9c97b?w=600&q=80',
    ],
    Cycling: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80',
      'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&q=80',
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80',
    ],
    Badminton: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80',
      'https://images.unsplash.com/photo-1613918431201-6c41b80c3556?w=600&q=80',
      'https://images.unsplash.com/photo-1521537634199-673cb821b7fc?w=600&q=80',
    ],
  };

  const handleLongPress = async (ground: any) => {
    console.log('[CreateGameScreen Logger] Long pressed ground:', ground);
    setSelectedGround(ground);
    setShowImageModal(true);
    setCurrentImageIndex(0);
    
    if (ground.images && ground.images.length > 0) {
      console.log(`[CreateGameScreen Logger] Using pre-fetched specific venue images:`, ground.images);
      setModalImages(ground.images);
      setIsModalImagesLoading(false);
    } else {
      console.log(`[CreateGameScreen Logger] No pre-fetched venue images. Falling back to sport-themed images.`);
      setModalImages(SPORT_CAROUSEL_IMAGES[sport] || [getSportImage(sport)]);
      setIsModalImagesLoading(false);
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? modalImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === modalImages.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (userCity && !userCoords) {
      const getCityCoords = async () => {
        console.log(`[CreateGameScreen Logger] Attempting to geocode city "${userCity}" for fallback coordinates...`);
        setIsLocationInitializing(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(userCity)}&format=json&limit=1`, {
            headers: {
              'User-Agent': 'SportsBuddy/1.0',
            },
          });
          const data = await res.json();
          if (data && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            console.log('[CreateGameScreen Logger] Resolved city center coords for fallback distances:', lat, lon);
            setUserCoords({ latitude: lat, longitude: lon });
          }
        } catch (e) {
          console.error('[CreateGameScreen Logger] Failed to resolve city coords:', e);
        } finally {
          setIsLocationInitializing(false);
        }
      };
      getCityCoords();
    }
  }, [userCity, userCoords]);

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

  useEffect(() => {
    if (locationQuery.length > 2) {
      const delay = setTimeout(async () => {
        setIsSearchingLocation(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=5`, {
            headers: {
              'User-Agent': 'SportsBuddy/1.0',
            },
          });
          const data = await res.json();
          setLocationResults(data.map((item: any) => ({
            name: item.name,
            address: item.display_name
          })));
        } catch (e) {} finally {
          setIsSearchingLocation(false);
        }
      }, 600);
      return () => clearTimeout(delay);
    } else {
      setLocationResults([]);
    }
  }, [locationQuery]);

  useEffect(() => {
    const initLocation = async () => {
      console.log('[CreateGameScreen Logger] Initializing user location fetching on mount...');
      setIsLocationInitializing(true);
      try {
        const coords = await locationService.getCurrentLocation();
        console.log('[CreateGameScreen Logger] Coordinates fetched:', coords);
        if (coords) {
          setUserCoords(coords);
          console.log('[CreateGameScreen Logger] Resolving city for coordinates...');
          const city = await geocodingService.getCity(coords);
          console.log('[CreateGameScreen Logger] Resolved city:', city);
          if (city) {
            setUserCity(city);
          } else {
            console.log('[CreateGameScreen Logger] geocodingService.getCity returned undefined city.');
            setAiError('Unable to determine your city from coordinates.');
          }
        } else {
          console.log('[CreateGameScreen Logger] locationService.getCurrentLocation returned null coordinates.');
          setAiError('Could not access current location. Please ensure location permissions are enabled.');
        }
      } catch (e: any) {
        console.error('[CreateGameScreen Logger] [Error] Failed to initialize user location:', e);
        setAiError(`Failed to initialize location: ${e.message || e}`);
      } finally {
        setIsLocationInitializing(false);
      }
    };
    initLocation();
  }, []);

  useEffect(() => {
    console.log(`[CreateGameScreen Logger] useEffect triggered. sport: "${sport}", userCity: "${userCity}", userCoords: ${!!userCoords}, aiLocations count: ${aiLocations.length}`);
    if (sport && userCity) {
      const fetchAiLocs = async () => {
        if (aiLocations.length > 0) {
          console.log('[CreateGameScreen Logger] AI location suggestions already fetched, skipping.');
          return;
        }
        console.log(`[CreateGameScreen Logger] Starting fetch for AI location suggestions. City: "${userCity}", Sport: "${sport}"`);
        setIsAiLoading(true);
        setAiError('');
        try {
          const suggestions = await aiService.getLocationSuggestions(userCity, sport, userCoords);
          console.log('[CreateGameScreen Logger] AI location suggestions successfully fetched:', suggestions);
          setAiLocations(suggestions);
        } catch (error: any) {
          console.error('[CreateGameScreen Logger] [Error] Failed to fetch AI locations:', error);
          setAiError(error.message || 'Failed to fetch AI suggestions');
        } finally {
          setIsAiLoading(false);
        }
      };
      fetchAiLocs();
    } else {
      if (!sport) {
        console.log('[CreateGameScreen Logger] AI suggestion fetch skipped: sport is empty.');
      }
      if (!userCity) {
        console.log('[CreateGameScreen Logger] AI suggestion fetch skipped: userCity is empty.');
      }
    }
  }, [sport, userCity, userCoords, aiLocations.length]);

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

  function validateStep3() {
    if (!location.trim()) {
      Alert.alert('Missing Info', 'Please select or enter a location');
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
    } else if (currentStep === 3) {
      if (validateStep3()) {
        setCurrentStep(4);
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
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
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
                    onPress={() => {
                      if (sport) {
                        Alert.alert(
                          'Sport Type Locked',
                          'The sport type cannot be changed once selected. If you selected the wrong sport, would you like to reset the form and start again?',
                          [
                            {
                              text: 'Cancel',
                              style: 'cancel',
                            },
                            {
                              text: 'Reset Form',
                              style: 'destructive',
                              onPress: () => {
                                setSport('');
                                setSkillLevel('');
                                setDate('');
                                setTime('6:00 PM');
                                setLocation('');
                                setMaxPlayers('10');
                                setDescription('');
                                setAiLocations([]);
                                setLocationQuery('');
                              },
                            },
                          ]
                        );
                      } else {
                        setShowSportPicker(!showSportPicker);
                      }
                    }}
                    style={[styles.picker, sport ? styles.pickerLocked : null]}
                  >
                    <Text style={sport ? styles.pickerValue : styles.pickerPlaceholder}>
                      {sport ? sport : 'Select a sport'}
                    </Text>
                    <Text style={styles.chevron}>{sport ? '🔒' : showSportPicker ? '▲' : '▼'}</Text>
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
              </View>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <InputField
                  label="Search Location"
                  placeholder="Start typing to search..."
                  value={locationQuery}
                  onChangeText={(text) => {
                    setLocationQuery(text);
                    setLocation(text);
                  }}
                  containerStyle={styles.fieldSpacing}
                />
                {isSearchingLocation && (
                  <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
                )}
                {locationResults.length > 0 && (
                  <GlassCard style={styles.locationResultsCard}>
                    <Text style={styles.sectionTitle}>Search Results</Text>
                    {locationResults.map((loc, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.locationItem}
                        onPress={() => {
                          setLocation(loc.address);
                          setLocationQuery(loc.name || loc.address);
                          setLocationResults([]);
                        }}
                      >
                        <Text style={styles.locationItemName}>{loc.name || loc.address}</Text>
                        {loc.name && <Text style={styles.locationItemAddress}>{loc.address}</Text>}
                      </TouchableOpacity>
                    ))}
                  </GlassCard>
                )}

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Publicly Available Grounds (Free)</Text>
                {publicLocations.length > 0 && !isLocationInitializing && !isAiLoading && (
                  <Text style={styles.hintText}>💡 Long press any card to view ground photos</Text>
                )}
                {isLocationInitializing ? (
                  <View style={styles.spinnerContainer}>
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
                    <Text style={styles.spinnerSubtext}>Finding your location...</Text>
                  </View>
                ) : isAiLoading ? (
                  <View style={styles.spinnerContainer}>
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
                    <Text style={styles.spinnerSubtext}>Searching community grounds & private turfs...</Text>
                  </View>
                ) : aiError ? (
                  <Text style={[styles.aiText, { color: '#ef4444', marginTop: 16 }]}>{aiError}</Text>
                ) : publicLocations.length > 0 ? (
                  <View style={styles.groundsContainer}>
                    {publicLocations.map((aiLoc, index) => {
                      const isSelected = location === aiLoc.name;
                      const imageUrl = aiLoc.images && aiLoc.images.length > 0
                        ? aiLoc.images[0]
                        : getSportImage(sport);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.groundCard,
                            isSelected && styles.groundCardActive
                          ]}
                          onPress={() => {
                            setLocation(aiLoc.name);
                            setLocationQuery(aiLoc.name);
                          }}
                          onLongPress={() => handleLongPress(aiLoc)}
                          delayLongPress={350}
                        >
                          <VenueImage
                            uri={imageUrl}
                            fallbackUri={getSportImage(sport)}
                            style={styles.groundCardImage}
                          />
                          <View style={styles.groundCardDetails}>
                            <Text style={[
                              styles.groundCardName,
                              isSelected && styles.groundCardNameActive
                            ]}>
                              {aiLoc.name}
                            </Text>
                            <Text style={styles.groundCardType}>
                              Public {sport} Ground{aiLoc.distance ? ` • ${aiLoc.distance}` : ''}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={styles.selectionIndicator}>
                              <Text style={styles.selectionIndicatorText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.aiText}>No free public grounds found near you.</Text>
                )}
                
                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Private Sports Turfs (Paid / Booking Required)</Text>
                {privateLocations.length > 0 && !isLocationInitializing && !isAiLoading && (
                  <Text style={styles.hintText}>💡 Long press any card to view photos & pricing details</Text>
                )}
                {isLocationInitializing || isAiLoading ? (
                  null
                ) : privateLocations.length > 0 ? (
                  <View style={styles.groundsContainer}>
                    {privateLocations.map((aiLoc, index) => {
                      const isSelected = location === aiLoc.name;
                      const imageUrl = aiLoc.images && aiLoc.images.length > 0
                        ? aiLoc.images[0]
                        : getSportImage(sport);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.groundCard,
                            isSelected && styles.groundCardActive
                          ]}
                          onPress={() => {
                            setLocation(aiLoc.name);
                            setLocationQuery(aiLoc.name);
                          }}
                          onLongPress={() => handleLongPress(aiLoc)}
                          delayLongPress={350}
                        >
                          <VenueImage
                            uri={imageUrl}
                            fallbackUri={getSportImage(sport)}
                            style={styles.groundCardImage}
                          />
                          <View style={styles.groundCardDetails}>
                            <Text style={[
                              styles.groundCardName,
                              isSelected && styles.groundCardNameActive
                            ]}>
                              {aiLoc.name}
                            </Text>
                            <Text style={styles.groundCardType}>
                              Private {sport} Turf • Paid Booking{aiLoc.distance ? ` • ${aiLoc.distance}` : ''}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={styles.selectionIndicator}>
                              <Text style={styles.selectionIndicatorText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.aiText}>No private booking turfs found near you.</Text>
                )}
                
                {location ? (
                  <Text style={styles.selectedLocationText}>Selected: {location}</Text>
                ) : null}
              </View>
            )}

            {/* Step 4: Details & Review */}
            {currentStep === 4 && (
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
              {currentStep < 4 ? (
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

      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalVenueName} numberOfLines={2}>
                  {selectedGround?.name}
                </Text>
                <Text style={styles.modalVenueDistance}>
                  {selectedGround?.distance ? `📍 ${selectedGround.distance}` : 'Distance unknown'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowImageModal(false)}
                style={styles.modalCloseIconBtn}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Carousel Container */}
            <View style={styles.carouselContainer}>
              {isModalImagesLoading ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                </View>
              ) : modalImages.length > 0 ? (
                <View style={styles.carouselImageWrapper}>
                  <VenueImage
                    uri={modalImages[currentImageIndex]}
                    fallbackUri={getSportImage(sport)}
                    style={styles.carouselImage}
                  />
                  
                  {/* Left Arrow overlay */}
                  {modalImages.length > 1 && (
                    <TouchableOpacity
                      onPress={handlePrevImage}
                      style={[styles.carouselArrowBtn, styles.carouselArrowLeft]}
                    >
                      <Text style={styles.carouselArrowText}>◀</Text>
                    </TouchableOpacity>
                  )}

                  {/* Right Arrow overlay */}
                  {modalImages.length > 1 && (
                    <TouchableOpacity
                      onPress={handleNextImage}
                      style={[styles.carouselArrowBtn, styles.carouselArrowRight]}
                    >
                      <Text style={styles.carouselArrowText}>▶</Text>
                    </TouchableOpacity>
                  )}

                  {/* Image Counter overlay */}
                  <View style={styles.imageCounterBadge}>
                    <Text style={styles.imageCounterText}>
                      {currentImageIndex + 1} / {modalImages.length}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.modalLoadingContainer}>
                  <Text style={styles.aiText}>No images available</Text>
                </View>
              )}
            </View>

            {/* Modal Footer/Actions */}
            <View style={styles.modalFooter}>
              <PrimaryButton
                title="Select Ground"
                variant="primary"
                style={{ flex: 1 }}
                onPress={() => {
                  if (selectedGround) {
                    setLocation(selectedGround.name);
                    setLocationQuery(selectedGround.name);
                  }
                  setShowImageModal(false);
                }}
              />
              <PrimaryButton
                title="Close"
                variant="outline"
                style={{ marginLeft: 12 }}
                onPress={() => setShowImageModal(false)}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>
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
  locationResultsCard: {
    padding: 12,
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  locationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  locationItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
  },
  locationItemAddress: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border + '40',
    marginVertical: 16,
  },
  groundsContainer: {
    gap: 12,
    marginTop: 8,
  },
  groundCard: {
    backgroundColor: 'rgba(24,24,30,0.6)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    overflow: 'hidden',
  },
  groundCardActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  groundCardImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  groundCardDetails: {
    flex: 1,
    marginLeft: 12,
  },
  groundCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  groundCardNameActive: {
    color: Colors.primary,
  },
  groundCardType: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  selectionIndicatorText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  aiText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    fontStyle: 'italic',
    marginTop: 8,
  },
  selectedLocationText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalVenueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  modalVenueDistance: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  modalCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  modalCloseIcon: {
    color: Colors.foreground,
    fontSize: 14,
    fontWeight: 'bold',
  },
  carouselContainer: {
    width: '100%',
    height: 250,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: 20,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImageWrapper: {
    flex: 1,
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselArrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  carouselArrowLeft: {
    left: 12,
  },
  carouselArrowRight: {
    right: 12,
  },
  carouselArrowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageCounterBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    width: '100%',
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  spinnerSubtext: {
    color: Colors.mutedForeground,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  pickerLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.8,
  },
  hintText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontStyle: 'italic',
    marginBottom: 10,
    marginTop: -4,
  },
});
