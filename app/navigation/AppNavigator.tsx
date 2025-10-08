import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AdminHome from '../screens/AdminHome';
import ClienteHome from '../screens/ClienteHome';
import CocinaScreen from '../screens/CocinaScreen';
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AdminHome" component={AdminHome} />
        <Stack.Screen name="ClienteHome" component={ClienteHome} />
        <Stack.Screen name="CocinaScreen" component={CocinaScreen} />
      </Stack.Navigator>
  );
}
