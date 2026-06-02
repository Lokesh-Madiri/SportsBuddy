import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm, useWatch } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, GlassCard, InputField, PrimaryButton } from '../components/common';
import {
  AvailabilitySelector,
  SkillLevelSelector,
  SportsInterestSelector,
} from '../components/profile';
import { getUserProfile } from '../firebase/auth';
import { profileService, calculateAchievementBadges, normalizeAvailability } from '../services/profileService';
import { useAuthStore } from '../store/authStore';
import { BorderRadius, Colors, Spacing } from '../theme';
import type { ProfileStackParamList, SkillLevel, UserAvailability } from '../utils/types';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

type ProfileFormValues = {
  displayName: string;
  username: string;
  bio: string;
  sportsPersonality: string;
  sports: string[];
  favoriteSport: string;
  skillLevel: SkillLevel;
  skillLevels: Record<string, SkillLevel>;
  availability: UserAvailability;
};

const BIO_LIMIT = 180;
const PERSONALITY_LIMIT = 140;

export function EditProfileScreen({ navigation }: Props) {
  const { user, setUser } = useAuthStore();
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const defaultValues = useMemo<ProfileFormValues>(() => ({
    displayName: user?.displayName || '',
    username: user?.username || '',
    bio: user?.bio || '',
    sportsPersonality: user?.sportsPersonality || '',
    sports: user?.sports || [],
    favoriteSport: user?.favoriteSport || user?.sports?.[0] || '',
    skillLevel: (user?.skillLevel as SkillLevel) || 'Intermediate',
    skillLevels: user?.skillLevels || {},
    availability: normalizeAvailability(user?.availability),
  }), [user]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({ defaultValues });

  const watchedSports = useWatch({ control, name: 'sports' });
  const watchedFavoriteSport = useWatch({ control, name: 'favoriteSport' });
  const watchedSkillLevels = useWatch({ control, name: 'skillLevels' });
  const watchedAvailability = useWatch({ control, name: 'availability' });
  const watchedBio = useWatch({ control, name: 'bio' });
  const watchedPersonality = useWatch({ control, name: 'sportsPersonality' });
  const previewImage = localImageUri || user?.imageURL || user?.profileImage || user?.photoURL;

  async function pickImage(source: 'library' | 'camera') {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to update your profile picture.');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.72,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        })
      : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.72,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

    if (!result.canceled && result.assets[0]?.uri) {
      setLocalImageUri(result.assets[0].uri);
    }
  }

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;
    setSaving(true);
    setUploadProgress(0);

    try {
      let imageURL = user.imageURL || user.profileImage || user.photoURL || '';
      if (localImageUri) {
        imageURL = await profileService.uploadProfileImage(user.uid, localImageUri, setUploadProgress);
      }

      const nextUser = {
        ...user,
        ...values,
        profileImage: imageURL,
        imageURL,
        photoURL: imageURL,
      };

      await profileService.updateProfile(user.uid, {
        ...values,
        profileImage: imageURL,
        imageURL,
        photoURL: imageURL,
      });

      await profileService.updateProfile(user.uid, {
        badges: calculateAchievementBadges(nextUser),
      });

      const freshUser = await getUserProfile(user.uid);
      setUser(freshUser || nextUser);
      Alert.alert('Profile updated', 'Your SportsBuddy profile is ready.');
      navigation.goBack();
    } catch {
      Alert.alert('Save failed', 'Could not update your profile. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.iconButtonPlaceholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <GlassCard style={styles.photoCard} neonBorder>
            <View style={styles.photoPreview}>
              {previewImage ? (
                <Image source={{ uri: previewImage }} style={styles.photo} />
              ) : (
                <Avatar name={user?.displayName || 'User'} size={96} />
              )}
              {saving && uploadProgress > 0 && uploadProgress < 100 && (
                <View style={styles.progressOverlay}>
                  <Text style={styles.progressText}>{uploadProgress}%</Text>
                </View>
              )}
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoAction} onPress={() => pickImage('library')}>
                <Ionicons name="images-outline" size={16} color={Colors.primary} />
                <Text style={styles.photoActionText}>Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoAction} onPress={() => pickImage('camera')}>
                <Ionicons name="camera-outline" size={16} color={Colors.primary} />
                <Text style={styles.photoActionText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Identity</Text>
            <Controller
              control={control}
              name="displayName"
              rules={{ required: 'Display name is required', minLength: { value: 2, message: 'Use at least 2 characters' } }}
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Display name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.displayName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="username"
              render={({ field: { value, onChange } }) => (
                <InputField label="Username" value={value} onChangeText={onChange} autoCapitalize="none" />
              )}
            />
            <Controller
              control={control}
              name="bio"
              rules={{ maxLength: { value: BIO_LIMIT, message: `Bio must stay under ${BIO_LIMIT} characters` } }}
              render={({ field: { value, onChange } }) => (
                <InputField
                  label={`Bio (${watchedBio.length}/${BIO_LIMIT})`}
                  value={value}
                  onChangeText={onChange}
                  multiline
                  style={styles.multiline}
                  error={errors.bio?.message}
                  placeholder="Weekend basketball player passionate about competitive games."
                />
              )}
            />
            <Controller
              control={control}
              name="sportsPersonality"
              rules={{ maxLength: { value: PERSONALITY_LIMIT, message: `Keep this under ${PERSONALITY_LIMIT} characters` } }}
              render={({ field: { value, onChange } }) => (
                <InputField
                  label={`Sports personality (${watchedPersonality.length}/${PERSONALITY_LIMIT})`}
                  value={value}
                  onChangeText={onChange}
                  multiline
                  style={styles.multiline}
                  error={errors.sportsPersonality?.message}
                  placeholder="Competitive, positive, and always up for a rematch."
                />
              )}
            />
          </GlassCard>

          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Sports Interests</Text>
            <SportsInterestSelector
              selectedSports={watchedSports}
              favoriteSport={watchedFavoriteSport}
              onChange={(sports) => setValue('sports', sports, { shouldDirty: true })}
              onFavoriteChange={(sport) => setValue('favoriteSport', sport, { shouldDirty: true })}
            />
          </GlassCard>

          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Skill Levels</Text>
            <SkillLevelSelector
              sports={watchedSports}
              skillLevels={watchedSkillLevels}
              onChange={(skillLevels) => {
                setValue('skillLevels', skillLevels, { shouldDirty: true });
                setValue('skillLevel', Object.values(skillLevels)[0] || 'Intermediate', { shouldDirty: true });
              }}
            />
          </GlassCard>

          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <AvailabilitySelector
              value={watchedAvailability}
              onChange={(availability) => setValue('availability', availability, { shouldDirty: true })}
            />
          </GlassCard>

          <PrimaryButton title="Save Profile" onPress={handleSubmit(onSubmit)} loading={saving} />
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
    paddingVertical: Spacing.base,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: { width: 40, height: 40 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 44,
    gap: 14,
  },
  photoCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: 14,
  },
  photoPreview: { position: 'relative' },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: Colors.primaryBorder,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: Colors.primary,
    fontWeight: '900',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  section: {
    padding: Spacing.lg,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.foreground,
  },
  multiline: {
    minHeight: 94,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
});
