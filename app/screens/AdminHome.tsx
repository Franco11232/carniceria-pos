// AdminHome.tsx
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../firebase/config';
import { Product } from '../models/Producto';

export default function AdminHome() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // 🔄 Escucha en tiempo real los productos
  useEffect(() => {
    const colRef = collection(db, 'products');
    const unsubscribe = onSnapshot(colRef, snapshot => {
      const data: Product[] = snapshot.docs.map(doc => {
        const d = doc.data() as {
          nombre: string;
          precio: number;
          descripcion?: string;
          image?: string;
        };
        return { id: doc.id, ...d };
      });
      setProductos(data);
    });

    return unsubscribe;
  }, []);

  // ➕ Agregar producto
  const agregarProducto = async () => {
    if (!nombre.trim() || !precio.trim()) {
      Alert.alert('Error', 'Debes ingresar nombre y precio.');
      return;
    }

    const precioNum = parseFloat(precio);
    if (isNaN(precioNum)) {
      Alert.alert('Error', 'El precio debe ser un número válido.');
      return;
    }

    try {
      await addDoc(collection(db, 'products'), { nombre, precio: precioNum });
      setNombre('');
      setPrecio('');
    } catch (e) {
      console.error('Error al agregar producto:', e);
    }
  };

  // ✏️ Iniciar edición
  const editarProducto = (item: Product) => {
    setEditandoId(item.id || null);
    setNombre(item.nombre);
    setPrecio(item.precio.toString());
  };

  // 💾 Guardar edición
  const guardarEdicion = async () => {
    if (!editandoId) return;

    const precioNum = parseFloat(precio);
    if (isNaN(precioNum)) {
      Alert.alert('Error', 'El precio debe ser un número válido.');
      return;
    }

    try {
      const ref = doc(db, 'products', editandoId);
      await updateDoc(ref, { nombre, precio: precioNum });
      setEditandoId(null);
      setNombre('');
      setPrecio('');
    } catch (e) {
      console.error('Error al editar producto:', e);
    }
  };

  // 🗑️ Eliminar producto
  const eliminarProducto = async (id?: string) => {
    if (!id) return;
    Alert.alert('Confirmar', '¿Eliminar este producto?', [
      { text: 'Cancelar' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'products', id));
          } catch (e) {
            console.error('Error al eliminar producto:', e);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel de Administración</Text>

      {/* Inputs */}
      <TextInput
        placeholder="Nombre del producto"
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
      />
      <TextInput
        placeholder="Precio"
        value={precio}
        onChangeText={setPrecio}
        keyboardType="numeric"
        style={styles.input}
      />

      {editandoId ? (
        <Button title="Guardar cambios" onPress={guardarEdicion} />
      ) : (
        <Button title="Agregar producto" onPress={agregarProducto} />
      )}

      {/* Lista de productos */}
      <FlatList
        data={productos}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text>${item.precio.toFixed(2)}</Text>
            </View>
            <View style={styles.actions}>
              <Button title="Editar" onPress={() => editarProducto(item)} />
              <Button title="Eliminar" color="#c0392b" onPress={() => eliminarProducto(item.id)} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 5, borderRadius: 5 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  nombre: { fontSize: 18, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 5 },
});
