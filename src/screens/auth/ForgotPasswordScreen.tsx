import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../utils/types';
import { forgotPassword } from '../../firebase/auth';
import { InputField, PrimaryButton } from '../../components/common';
import { Colors } from '../../theme';
import { isValidEmail } from '../../utils/helpers';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!email) { setError('Email is required'); return; }
    if (!isValidEmail(email)) { setError('Enter a valid email'); return; }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      const msg =
        err.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : 'Failed to send reset email. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.content}>
          {sent ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>📧</Text>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent a password reset link to{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
              <PrimaryButton
                title="Back to Login"
                onPress={() => navigation.navigate('Login')}
                style={styles.button}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a reset link
              </Text>

              <View style={styles.form}>
                <InputField
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={error}
                />

                <PrimaryButton
                  title="Send Reset Link"
                  onPress={handleReset}
                  loading={loading}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  backButton: { marginBottom: 32 },
  backText: {
    color: Colors.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.mutedForeground,
    lineHeight: 22,
    marginBottom: 40,
  },
  form: { gap: 16 },
  button: { marginTop: 8 },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  successIcon: { fontSize: 64 },
  emailHighlight: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
