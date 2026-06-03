import { Platform } from 'react-native';

/**
 * Cross-platform shadow styles.
 * - iOS/Android: uses shadowColor, shadowOffset, shadowOpacity, shadowRadius + elevation
 * - Web: uses boxShadow CSS string
 */
export function neonShadow(color: string, radius = 12, opacity = 0.4) {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 0 ${radius}px ${color.replace(')', `, ${opacity})`).replace('rgb', 'rgba')}`,
    } as any;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: Math.round(radius / 2),
  };
}

/**
 * Cross-platform text shadow styles.
 * - iOS/Android: uses textShadowColor, textShadowOffset, textShadowRadius
 * - Web: uses textShadow CSS string
 */
export function neonTextShadow(color: string, radius = 10) {
  if (Platform.OS === 'web') {
    return {
      textShadow: `0 0 ${radius}px ${color}`,
    } as any;
  }
  return {
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: radius,
  };
}

/**
 * useNativeDriver value — true on native, false on web.
 */
export const nativeDriver = Platform.OS !== 'web';
