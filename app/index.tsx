// // App.tsx
// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import React from "react";
// import AdminHome from "./navigation/AdminDrawer";
// import CarniceroHome from "./navigation/CarniceroDrawer";
// import LoginScreen from "./screens/comunes/LoginScreen";

// const Stack = createNativeStackNavigator();

// export default function App() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator initialRouteName="Login">
//         <Stack.Screen name="Login" component={LoginScreen} />
//         <Stack.Screen name="AdminHome" component={AdminHome} />
//         <Stack.Screen name="CarniceroHome" component={CarniceroHome} />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

// App.tsx
import React from "react";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  return <AppNavigator />;
}