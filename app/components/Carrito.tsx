//Carrito.tsx
import React from 'react';
import { Text, View } from 'react-native';

export default function Carrito({ carrito }: any) {
  const total = carrito.reduce((acc: number, i: any) => acc + i.subtotal, 0);
  return (
    <View style={{ padding: 10, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontWeight: 'bold' }}>Carrito:</Text>
      {carrito.map((i: any, idx: number) => (
        <Text key={idx}>{i.nombre} x{i.cantidad} = ${i.subtotal}</Text>
      ))}
      <Text style={{ fontWeight: 'bold', marginTop: 5 }}>Total: ${total}</Text>
    </View>
  );
}
