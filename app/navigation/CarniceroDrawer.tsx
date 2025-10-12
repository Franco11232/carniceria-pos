import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import { Button } from 'react-native';
import MenuProductosScreen from '../screens/carnicero/MenuProductosScreen';
import PedidosScreen from '../screens/carnicero/PedidosScreen';

const Drawer = createDrawerNavigator();

export default function CarniceroDrawer({ setRole }: any) {
  return (
    <Drawer.Navigator
      initialRouteName="Menú de Productos"
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <Button title="Salir" onPress={() => setRole(null)} />
        ),
      }}
    >
      <Drawer.Screen
        name="Menú de Productos"
        component={MenuProductosScreen}
        options={{ title: '🥩 Menú de Productos' }}
      />
      <Drawer.Screen
        name="Pedidos"
        component={PedidosScreen}
        options={{ title: '🧾 Pedidos' }}
      />
    </Drawer.Navigator>
  );
}
