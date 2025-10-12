import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert, Button, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { db } from "../../firebase/config";

export default function ProductosScreen() {
  const [productos, setProductos] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precio, setPrecio] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const refProductos = collection(db, "productos");
  const refInventario = collection(db, "inventario");

  useEffect(() => {
    const unsubscribe = onSnapshot(refProductos, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProductos(data);
    });
    return unsubscribe;
  }, []);

  const limpiarCampos = () => {
    setNombre("");
    setCategoria("");
    setPrecio("");
    setEditandoId(null);
  };

  const agregarOEditar = async () => {
    if (!nombre || !categoria || !precio) {
      Alert.alert("Campos incompletos");
      return;
    }

    try {
      if (editandoId) {
        const ref = doc(db, "productos", editandoId);
        await updateDoc(ref, { nombre, categoria, precio: Number(precio) });
        Alert.alert("Producto actualizado");
      } else {
        const nuevoProducto = await addDoc(refProductos, {
          nombre,
          categoria,
          precio: Number(precio),
        });

        // Crear inventario inicial
        await addDoc(refInventario, {
          productoId: nuevoProducto.id,
          producto: nombre,
          categoria,
          stock: 0,
        });

        Alert.alert("Producto agregado");
      }
      limpiarCampos();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo guardar el producto");
    }
  };

  const editarProducto = (id: string) => {
    const producto = productos.find((p) => p.id === id);
    if (producto) {
      setEditandoId(id);
      setNombre(producto.nombre);
      setCategoria(producto.categoria);
      setPrecio(String(producto.precio));
    }
  };

  const eliminarProducto = async (id: string) => {
    try {
      await deleteDoc(doc(db, "productos", id));
      Alert.alert("Producto eliminado");
    } catch (e) {
      Alert.alert("Error al eliminar");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Gestión de Productos</Text>

      <TextInput style={styles.input} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <TextInput
        style={styles.input}
        placeholder="Categoría (res, pollo, cerdo)"
        value={categoria}
        onChangeText={setCategoria}
      />
      <TextInput
        style={styles.input}
        placeholder="Precio"
        keyboardType="numeric"
        value={precio}
        onChangeText={setPrecio}
      />

      <Button title={editandoId ? "Guardar cambios" : "Agregar producto"} onPress={agregarOEditar} />

      <FlatList
        data={productos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text>Categoría: {item.categoria}</Text>
              <Text>Precio: ${item.precio}</Text>
            </View>
            <View style={styles.botones}>
              <TouchableOpacity onPress={() => editarProducto(item.id)}>
                <Text style={styles.btnEditar}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => eliminarProducto(item.id)}>
                <Text style={styles.btnEliminar}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  titulo: { fontSize: 22, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  input: {
    borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8,
    marginBottom: 10, backgroundColor: "white",
  },
  item: {
    backgroundColor: "white", padding: 10, borderRadius: 8, marginVertical: 5,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  nombre: { fontWeight: "bold", fontSize: 16 },
  botones: { flexDirection: "row" },
  btnEditar: { color: "blue", marginRight: 15 },
  btnEliminar: { color: "red" },
});
