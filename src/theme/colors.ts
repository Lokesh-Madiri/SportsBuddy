// SportsBuddy Dark Theme - Neon Lime Green Accent
export const Colors = {
  // Core backgrounds
  background: '#0a0a0a',
  backgroundSecondary: '#0f0f14',
  card: '#12121a',
  cardLight: '#1a1a24',
  secondary: '#18181e',

  // Text
  foreground: '#fafafa',
  mutedForeground: '#6b6b6b',

  // Brand
  primary: '#beff00',       // Neon lime green
  primaryForeground: '#0a0a0a',
  primaryDim: 'rgba(190,255,0,0.15)',
  primaryBorder: 'rgba(190,255,0,0.3)',

  // Borders
  border: '#2a2a32',
  borderLight: 'rgba(255,255,255,0.08)',

  // Glass
  glass: 'rgba(18,18,24,0.6)',
  glassBorder: 'rgba(255,255,255,0.08)',

  // Status
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Gradients (used as arrays)
  gradientDark: ['#0a0a0a', '#0f0f14', '#0a0a0a'] as const,
  gradientCard: ['rgba(30,30,40,0.8)', 'rgba(20,20,28,0.6)'] as const,
  gradientPrimary: ['rgba(190,255,0,0.3)', 'rgba(190,255,0,0.1)'] as const,

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.5)',
};

export type ColorKey = keyof typeof Colors;
