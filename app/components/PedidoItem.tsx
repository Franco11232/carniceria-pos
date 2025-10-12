//PedidoItem.tsx
import React from 'react';
import { Button, Text, View } from 'react-native';

export default function ProductoItem({ item, carrito, setCarrito }: any) {
  const agregar = () => {
    const existente = carrito.find((c: any) => c.id === item.id);
    if (existente) {
      setCarrito(
        carrito.map((c: any) =>
          c.id === item.id ? { ...c, cantidad: c.cantidad + 1, subtotal: (c.cantidad + 1) * c.precio } : c
        )
      );  
    } else {
      setCarrito([...carrito, { ...item, cantidad: 1, subtotal: item.precio }]);
    }
  };

  return (
    <View style={{ padding: 10, borderBottomWidth: 1 }}>
      <Text>{item.nombre}</Text>
      <Text>${item.precio}</Text>
      <Button title="Agregar" onPress={agregar} />
    </View>
  );
}
