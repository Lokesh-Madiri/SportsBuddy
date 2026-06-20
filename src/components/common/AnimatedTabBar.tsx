import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AnimatedBadge } from './AnimatedBadge';
import { BorderRadius, Colors } from '../../theme';
import { neonShadow } from '../../utils/platform';

const ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Home: 'home',
  Discover: 'compass',
  CreateMatch: 'add',
  Chat: 'chatbubbles',
  Profile: 'person',
};

const LABELS: Record<string, string> = {
  Home: 'Home',
  Discover: 'Discover',
  CreateMatch: 'Create',
  Chat: 'Chat',
  Profile: 'Profile',
};

function TabButton({
  routeName,
  focused,
  badge,
  onPress,
}: {
  routeName: string;
  focused: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1 : 0.92);
  const opacity = useSharedValue(focused ? 1 : 0.68);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, { damping: 14, stiffness: 180 });
    opacity.value = withTiming(focused ? 1 : 0.68, { duration: 180 });
  }, [focused, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const isCreate = routeName === 'CreateMatch';

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.tabTouch}>
      <Animated.View style={[styles.tabItem, isCreate && styles.createTab, animatedStyle]}>
        {focused && !isCreate && <View style={styles.activeGlow} />}
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused, isCreate && styles.createIcon]}>
          <Ionicons
            name={ICONS[routeName] || 'ellipse'}
            size={isCreate ? 26 : 21}
            color={isCreate || focused ? Colors.primaryForeground : Colors.mutedForeground}
          />
          {routeName === 'Chat' && <AnimatedBadge count={badge} style={styles.badge} />}
        </View>
        {!isCreate && (
          <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>
            {LABELS[routeName]}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const badge = typeof options.tabBarBadge === 'number' ? options.tabBarBadge : undefined;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabButton
            key={route.key}
            routeName={route.name}
            focused={focused}
            badge={badge}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: Platform.OS === 'ios' ? 20 : 12,
    height: 68,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(18,18,24,0.82)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabTouch: {
    flex: 1,
    alignItems: 'center',
  },
  tabItem: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  createTab: {
    marginTop: -26,
  },
  activeGlow: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  iconWrap: {
    width: 36,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapFocused: {
    backgroundColor: Colors.primary,
    ...neonShadow(Colors.primary, 8, 0.26),
  },
  createIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    borderWidth: 4,
    borderColor: Colors.background,
    ...neonShadow(Colors.primary, 16, 0.5),
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.mutedForeground,
  },
  labelFocused: {
    color: Colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
  },
});
