import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const Typography = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.foreground,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  h5: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.foreground,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  caption: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.mutedForeground,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedForeground,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primaryForeground,
  },
  primary: {
    color: Colors.primary,
  },
  muted: {
    color: Colors.mutedForeground,
  },
});
