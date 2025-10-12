import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useState } from "react";

import LoginScreen from "../screens/comunes/LoginScreen";
import AdminDrawer from "./AdminDrawer";
import CarniceroDrawer from "./CarniceroDrawer";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [role, setRole] = useState<string | null>(null);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!role ? (
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} setRole={setRole} />}
          </Stack.Screen>
        ) : role === "admin" ? (
          <Stack.Screen name="AdminDrawer">
            {(props) => <AdminDrawer {...props} setRole={setRole} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="CarniceroDrawer">
            {(props) => <CarniceroDrawer {...props} setRole={setRole} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
