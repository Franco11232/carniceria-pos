import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import { Button } from 'react-native';
import DashboardScreen from '../screens/admin/DashboardScreen';
import InventarioScreen from '../screens/admin/InventarioScreen';
import ProductosScreen from '../screens/admin/ProductsScreen'; // <- o tu ProductsScreen real

const Drawer = createDrawerNavigator();

export default function AdminDrawer({ setRole }: any) {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <Button title="Salir" onPress={() => setRole(null)} />
        ),
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: '📊 Dashboard' }}
      />
      <Drawer.Screen
        name="Productos"
        component={ProductosScreen}
        options={{ title: '🥩 Productos' }}
      />
      <Drawer.Screen
        name="Inventario"
        component={InventarioScreen}
        options={{ title: '📦 Inventario' }}
      />
    </Drawer.Navigator>
  );
}
