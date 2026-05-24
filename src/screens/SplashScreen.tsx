import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';

const { width, height } = Dimensions.get('window');

export function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Text fade in
    Animated.timing(textFade, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Rotating ring
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      delay: 500,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={['#0a0a0a', '#0f0f14', '#0a0a0a']}
      style={styles.container}
    >
      {/* Background glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Rotating outer ring */}
        <Animated.View
          style={[styles.outerRing, { transform: [{ rotate: spin }] }]}
        />
        {/* Inner ring */}
        <View style={styles.innerRing}>
          <View style={styles.logoCore}>
            {/* Globe icon */}
            <View style={styles.globeContainer}>
              <View style={styles.globeCircle} />
              <View style={styles.globeHorizontal} />
              <View style={styles.globeVertical} />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.textContainer, { opacity: textFade }]}>
        <Text style={styles.title}>
          Sports<Text style={styles.titleAccent}>Buddy</Text>
        </Text>
        <Text style={styles.subtitle}>AI-Powered Sports Networking</Text>
      </Animated.View>

      {/* Progress bar */}
      <Animated.View style={[styles.progressContainer, { opacity: textFade }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
        <Text style={styles.progressText}>Finding your sports buddies...</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: height * 0.15,
    left: width / 2 - 128,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(190,255,0,0.12)',
    // blur effect via shadow
    shadowColor: '#beff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 80,
  },
  glowBottom: {
    position: 'absolute',
    bottom: height * 0.25,
    left: width * 0.1,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(190,255,0,0.06)',
  },
  logoContainer: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  outerRing: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: 'rgba(190,255,0,0.3)',
    borderStyle: 'dashed',
  },
  innerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(190,255,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(190,255,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#beff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  globeContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeCircle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#beff00',
  },
  globeHorizontal: {
    position: 'absolute',
    width: 28,
    height: 2,
    backgroundColor: '#beff00',
    top: 13,
  },
  globeVertical: {
    position: 'absolute',
    width: 2,
    height: 28,
    backgroundColor: '#beff00',
    left: 13,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.foreground,
    letterSpacing: -1,
    marginBottom: 8,
  },
  titleAccent: {
    color: Colors.primary,
    textShadowColor: 'rgba(190,255,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 96,
    alignItems: 'center',
    width: 192,
  },
  progressTrack: {
    width: 192,
    height: 4,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
});
