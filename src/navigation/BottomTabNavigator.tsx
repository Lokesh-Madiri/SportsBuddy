import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../utils/types';
import { HomeNavigator } from './HomeNavigator';
import { DiscoverNavigator } from './DiscoverNavigator';
import { ChatNavigator } from './ChatNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { Colors } from '../theme';
import { useChatStore } from '../store/chatStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  focused: boolean;
  badge?: number;
}

function TabIcon({ name, label, focused, badge }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrapper}>
        <Ionicons
          name={name}
          size={22}
          color={focused ? Colors.primary : Colors.mutedForeground + '80'}
        />
        {badge && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export function BottomTabNavigator() {
  const totalUnread = useChatStore((s) => s.getTotalUnread());

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'compass' : 'compass-outline'} label="Discover" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} label="Chat" focused={focused} badge={totalUnread} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 84 : 68,
    backgroundColor: Colors.glass,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 0,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
  },
  iconWrapper: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: Colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primaryForeground,
  },
});
