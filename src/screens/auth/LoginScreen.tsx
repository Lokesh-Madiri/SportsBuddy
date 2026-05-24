import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../utils/types';
import { loginUser } from '../../firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { getUserProfile } from '../../firebase/auth';
import { InputField, PrimaryButton } from '../../components/common';
import { Colors, BorderRadius } from '../../theme';
import { isValidEmail, isValidPassword } from '../../utils/helpers';

// Simple SVG-like icons using View
function MailIcon() {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 18, height: 13, borderWidth: 1.5, borderColor: Colors.mutedForeground, borderRadius: 2 }} />
    </View>
  );
}

function LockIcon() {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: 10, borderWidth: 1.5, borderColor: Colors.mutedForeground, borderRadius: 2, marginTop: 4 }} />
      <View style={{ width: 10, height: 7, borderWidth: 1.5, borderColor: Colors.mutedForeground, borderRadius: 5, borderBottomWidth: 0, marginBottom: -1 }} />
    </View>
  );
}

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { setUser, setError } = useAuthStore();

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!isValidEmail(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else {
      const { valid, message } = isValidPassword(password);
      if (!valid) newErrors.password = message;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const firebaseUser = await loginUser(email.trim(), password);
      const profile = await getUserProfile(firebaseUser.uid);
      if (profile) {
        setUser(profile);
      } else {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || email,
          displayName: firebaseUser.displayName || 'User',
          sports: [],
          stats: { gamesPlayed: 0, gamesWon: 0, winRate: 0, teammates: 0 },
          achievements: [],
          rating: 0,
          reviewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (err: any) {
      const msg =
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Login failed. Please try again.';
      setError(msg);
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      {/* Background glows */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to find your next game</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <InputField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              leftIcon={<MailIcon />}
            />

            <InputField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
              secureTextEntry={!showPassword}
              autoComplete="password"
              error={errors.password}
              leftIcon={<LockIcon />}
              rightIcon={
                <Text style={styles.showHide}>{showPassword ? 'Hide' : 'Show'}</Text>
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotContainer}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialButtons}>
            <PrimaryButton
              title="Continue with Google"
              onPress={() => Alert.alert('Coming Soon', 'Google sign-in will be available soon.')}
              variant="outline"
            />
            <PrimaryButton
              title="Continue with Apple"
              onPress={() => Alert.alert('Coming Soon', 'Apple sign-in will be available soon.')}
              variant="outline"
            />
          </View>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(190,255,0,0.08)',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: '33%',
    left: 0,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(190,255,0,0.04)',
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: { marginBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.mutedForeground,
  },
  form: { gap: 16 },
  showHide: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  forgotContainer: { alignSelf: 'flex-end' },
  forgotText: {
    fontSize: 14,
    color: Colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  socialButtons: { gap: 12 },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  signupText: {
    color: Colors.mutedForeground,
    fontSize: 14,
  },
  signupLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
