import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Button, FlatList, StyleSheet,
    Text, TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { db } from "../../firebase/config";

export default function InventarioScreen() {
  const [inventario, setInventario] = useState<any[]>([]);
  const [producto, setProducto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [stock, setStock] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const refInventario = collection(db, "inventario");

  useEffect(() => {
    const unsubscribe = onSnapshot(refInventario, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInventario(data);
    });
    return unsubscribe;
  }, []);

  const limpiarCampos = () => {
    setProducto("");
    setCategoria("");
    setStock("");
    setEditandoId(null);
  };

  const agregarOEditar = async () => {
    if (!producto || !categoria || !stock) {
      Alert.alert("Campos incompletos");
      return;
    }

    try {
      if (editandoId) {
        await updateDoc(doc(db, "inventario", editandoId), {
          producto,
          categoria,
          stock: Number(stock),
        });
        Alert.alert("Inventario actualizado");
      } else {
        await addDoc(refInventario, { producto, categoria, stock: Number(stock) });
        Alert.alert("Inventario agregado");
      }
      limpiarCampos();
    } catch (e) {
      console.error(e);
      Alert.alert("Error al guardar inventario");
    }
  };

  const editar = (id: string) => {
    const item = inventario.find((i) => i.id === id);
    if (item) {
      setEditandoId(id);
      setProducto(item.producto);
      setCategoria(item.categoria);
      setStock(String(item.stock));
    }
  };

  const eliminar = async (id: string) => {
    await deleteDoc(doc(db, "inventario", id));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Gestión de Inventario</Text>

      <TextInput style={styles.input} placeholder="Producto" value={producto} onChangeText={setProducto} />
      <TextInput
        style={styles.input}
        placeholder="Categoría (res, pollo, cerdo)"
        value={categoria}
        onChangeText={setCategoria}
      />
      <TextInput
        style={styles.input}
        placeholder="Stock"
        keyboardType="numeric"
        value={stock}
        onChangeText={setStock}
      />

      <Button title={editandoId ? "Guardar cambios" : "Agregar inventario"} onPress={agregarOEditar} />

      <FlatList
        data={inventario}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.nombre}>{item.producto}</Text>
              <Text>Categoría: {item.categoria}</Text>
              <Text>Stock: {item.stock}</Text>
            </View>
            <View style={styles.botones}>
              <TouchableOpacity onPress={() => editar(item.id)}>
                <Text style={styles.btnEditar}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => eliminar(item.id)}>
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
