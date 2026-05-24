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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../utils/types';
import { registerUser } from '../../firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { InputField, PrimaryButton } from '../../components/common';
import { Colors } from '../../theme';
import { isValidEmail, isValidPassword } from '../../utils/helpers';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export function RegisterScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { setUser, setError } = useAuthStore();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!displayName.trim()) newErrors.displayName = 'Name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!isValidEmail(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else {
      const { valid, message } = isValidPassword(password);
      if (!valid) newErrors.password = message;
    }
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      const firebaseUser = await registerUser(email.trim(), password, displayName.trim());
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName: displayName.trim(),
        sports: [],
        stats: { gamesPlayed: 0, gamesWon: 0, winRate: 0, teammates: 0 },
        achievements: [],
        rating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'This email is already registered'
          : 'Registration failed. Please try again.';
      setError(msg);
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <View style={styles.glowTop} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join the sports community</Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Full Name"
              placeholder="John Doe"
              value={displayName}
              onChangeText={(t) => { setDisplayName(t); setErrors((e) => ({ ...e, displayName: undefined as any })); }}
              autoCapitalize="words"
              error={errors.displayName}
            />

            <InputField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined as any })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <InputField
              label="Password"
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined as any })); }}
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={
                <Text style={styles.showHide}>{showPassword ? 'Hide' : 'Show'}</Text>
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <InputField
              label="Confirm Password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: undefined as any })); }}
              secureTextEntry={!showPassword}
              error={errors.confirmPassword}
            />

            <PrimaryButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
            />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(190,255,0,0.08)',
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  loginText: {
    color: Colors.mutedForeground,
    fontSize: 14,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
