//ClienteHome.tsx
import { addDoc, collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Button, FlatList, View } from 'react-native';
import Carrito from '../../components/Carrito';
import ProductoItem from '../../components/PedidoItem';
import { auth, db } from '../../firebase/config';
import { Product } from '../../models/Producto';

export default function ClienteHome() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), snapshot => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    });
    return unsubscribe;
  }, []);

  const enviarPedido = async () => {
    if (carrito.length === 0) return;
    const subtotal = carrito.reduce((acc, i) => acc + i.subtotal, 0);
    await addDoc(collection(db, 'orders'), {
      userId: auth.currentUser?.uid,
      items: carrito,
      subtotal,
      estado: 'cocina',
    });
    setCarrito([]);
  };

  return (
    <View>
      <FlatList
        data={productos}
        renderItem={({ item }) => (
          <ProductoItem item={item} carrito={carrito} setCarrito={setCarrito} />
        )}
        keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}

      />
      <Carrito carrito={carrito} setCarrito={setCarrito} />
      <Button title = "Enviar pedido" onPress={enviarPedido} />
    </View>
  );
}
