//CocinaScreen.tsx
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { db } from '../../firebase/config';
import Pedido from '../../models/Pedido';

export default function CocinaScreen() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as Pedido[];
      setPedidos(data.filter(p => p.estado === 'cocina'));
    });
    return unsub;
  }, []);

  const marcarEntregado = async (id: string) => {
    await updateDoc(doc(db, 'orders', id), { estado: 'entregado' });
  };

  return (
    <FlatList
      data={pedidos}
      renderItem={({ item }) => (
        <View style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>Pedido: {item.id}</Text>
          {item.items.map((i, idx) => (
            <Text key={idx}>{i.nombre} x {i.cantidad}</Text>
          ))}
          <Text>Total: ${item.subtotal}</Text>
          <Text onPress={() => marcarEntregado(item.id!)} style={{ color: 'green', marginTop: 5 }}>
            Marcar como entregado
          </Text>
        </View>
      )}
      keyExtractor={item => item.id!}
    />
  );
}
