import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../utils/types';
import { CreateGameScreen } from '../screens/CreateGameScreen';
import { MatchDetailsScreen } from '../screens/MatchDetailsScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function CreateMatchNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="CreateGame"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen name="CreateGame" component={CreateGameScreen} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} />
    </Stack.Navigator>
  );
}
