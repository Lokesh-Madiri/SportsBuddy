import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DiscoverStackParamList } from '../utils/types';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { MatchDetailsScreen } from '../screens/MatchDetailsScreen';

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export function DiscoverNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen name="DiscoverScreen" component={DiscoverScreen} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} />
    </Stack.Navigator>
  );
}
