// app/screens/admin/ProductosScreen.tsx
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebase/config";

type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
};

const CATS = ["pollo", "res", "cerdo"] as const;

export default function ProductosScreen() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [precio, setPrecio] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // 🔎 estado de búsqueda
  const [query, setQuery] = useState("");

  const refProductos = collection(db, "productos");
  const refInventario = collection(db, "inventario");

  useEffect(() => {
    const unsubscribe = onSnapshot(refProductos, (snapshot) => {
      const data = snapshot.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) }) as Producto
      );
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
    if (!nombre || !categoria || precio === "") {
      Alert.alert("Campos incompletos", "Completa nombre, categoría y precio.");
      return;
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      Alert.alert("Precio inválido", "Ingresa un número válido (≥ 0).");
      return;
    }

    try {
      if (editandoId) {
        await updateDoc(doc(db, "productos", editandoId), {
          nombre,
          categoria,
          precio: precioNum,
        });
        Alert.alert("Producto actualizado");
      } else {
        const nuevo = await addDoc(refProductos, {
          nombre,
          categoria,
          precio: precioNum,
        });

        // Inventario inicial (enlazado al producto)
        await addDoc(refInventario, {
          productoId: nuevo.id,
          producto: nombre,
          categoria,
          stock: 0,
        });

        Alert.alert("Producto agregado");
      }
      limpiarCampos();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo guardar el producto.");
    }
  };

  const editarProducto = (id: string) => {
    const p = productos.find((x) => x.id === id);
    if (p) {
      setEditandoId(id);
      setNombre(p.nombre);
      setCategoria(p.categoria);
      setPrecio(String(p.precio));
    }
  };

  const eliminarProducto = async (id: string) => {
    Alert.alert("Eliminar", "¿Deseas eliminar este producto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "productos", id));
            Alert.alert("Producto eliminado");
          } catch {
            Alert.alert("Error", "No se pudo eliminar.");
          }
        },
      },
    ]);
  };

  const dataOrdenada = useMemo(
    () =>
      [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [productos]
  );

  // 🔎 filtrado por query (nombre o categoría)
  const dataFiltrada = useMemo(() => {
    if (!query.trim()) return dataOrdenada;
    const q = query.toLowerCase();
    return dataOrdenada.filter(
      (it) =>
        it.nombre.toLowerCase().includes(q) ||
        (it.categoria ?? "").toLowerCase().includes(q)
    );
  }, [dataOrdenada, query]);

  const money = (n: number) =>
    n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });

  return (
    <SafeAreaView style={styles.root}>
      {/* Círculo rojo decorativo */}
      <View style={styles.topDecor} />

      <FlatList
        ListHeaderComponent={
          <>
            <Text style={styles.headerTitle}>Gestión de Productos</Text>

            {/* 🔎 Barra de búsqueda */}
            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar por nombre o categoría"
                placeholderTextColor="#777"
                style={styles.searchInput}
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} style={styles.clearBtn}>
                  <Text style={styles.clearText}>×</Text>
                </Pressable>
              )}
            </View>

            {/* Tarjeta de formulario */}
            <View style={styles.card}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                placeholder="Ej. Bistec del 7"
                value={nombre}
                onChangeText={setNombre}
                style={styles.input}
                placeholderTextColor="#777"
              />

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.catRow}>
                {CATS.map((c) => {
                  const active = c === categoria;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategoria(c)}
                      style={[styles.catChip, active && styles.catChipActive]}
                    >
                      <Text
                        style={[
                          styles.catText,
                          active && styles.catTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Precio</Text>
              <TextInput
                placeholder="$0"
                keyboardType="numeric"
                value={precio}
                onChangeText={setPrecio}
                style={styles.input}
                placeholderTextColor="#777"
              />

              <Pressable style={styles.saveBtn} onPress={agregarOEditar}>
                <Text style={styles.saveText}>
                  {editandoId ? "GUARDAR CAMBIOS" : "AGREGAR PRODUCTO"}
                </Text>
              </Pressable>

              {editandoId && (
                <Pressable style={styles.cancelBtn} onPress={limpiarCampos}>
                  <Text style={styles.cancelText}>Cancelar edición</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.subtitle}>Lista de productos</Text>
          </>
        }
        data={dataFiltrada}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.nombre}</Text>
              <View style={styles.itemMeta}>
                <Text style={styles.itemCat}>{item.categoria}</Text>
                <Text style={styles.itemPrice}>{money(item.precio)}</Text>
              </View>
            </View>

            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => editarProducto(item.id)}>
                <Text style={styles.edit}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => eliminarProducto(item.id)}>
                <Text style={styles.delete}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 16 },

  // Círculo rojo superior derecho (decor)
  topDecor: {
    position: "absolute",
    right: -80,
    top: -80,
    width: 180,
    height: 180,
    backgroundColor: "#F53B2F",
    borderRadius: 999,
    zIndex: 0,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginTop: 24,
    marginBottom: 12,
  },

  subtitle: {
  fontSize: 18,
  fontWeight: "600",
  color: "#333",
  marginTop: 6,
  marginBottom: 12,
},


  // 🔎 búsqueda
  searchRow: {
    position: "relative",
    marginBottom: 14,
  },
  searchInput: {
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: "#000",
  },
  clearBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E5E5",
  },
  clearText: { fontSize: 18, fontWeight: "700", color: "#333" },

  // Tarjeta de formulario
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  label: { color: "#222", marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#000",
    marginBottom: 12,
  },

  // Chips de categoría
  catRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  catChip: {
    borderWidth: 1,
    borderColor: "#DADADA",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  catChipActive: { backgroundColor: "#FFEB86", borderColor: "#FFEB86" },
  catText: { color: "#333" },
  catTextActive: { fontWeight: "700", color: "#333" },

  // Botones form
  saveBtn: {
    backgroundColor: "#000",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 6,
  },
  saveText: { color: "#fff", fontWeight: "700", letterSpacing: 0.5 },

  cancelBtn: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#EFEFEF",
  },
  cancelText: { color: "#333", fontWeight: "600" },

  // Items de lista
  itemRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  itemName: { fontSize: 16, fontWeight: "700", color: "#111" },
  itemMeta: { flexDirection: "row", gap: 12, marginTop: 2 },
  itemCat: {
    backgroundColor: "#FFEB86",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    color: "#333",
    fontSize: 12,
    overflow: "hidden",
  },
  itemPrice: { color: "#444", fontSize: 14 },

  itemActions: { flexDirection: "row", gap: 16 },
  edit: { color: "#0A84FF", fontWeight: "600" },
  delete: { color: "#D12D2D", fontWeight: "600" },
});
