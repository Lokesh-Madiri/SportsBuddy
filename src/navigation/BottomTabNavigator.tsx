import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../utils/types';
import { HomeNavigator } from './HomeNavigator';
import { DiscoverNavigator } from './DiscoverNavigator';
import { ChatNavigator } from './ChatNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { useChatStore } from '../store/chatStore';
import { CreateMatchNavigator } from './CreateMatchNavigator';
import { AnimatedTabBar } from '../components/common';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function BottomTabNavigator() {
  const totalUnread = useChatStore((s) => s.getTotalUnread());

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Discover" component={DiscoverNavigator} />
      <Tab.Screen name="CreateMatch" component={CreateMatchNavigator} />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          tabBarBadge: totalUnread || undefined,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
