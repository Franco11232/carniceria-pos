// app/screens/admin/InventarioScreen.tsx
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
  View
} from "react-native";
import { db } from "../../firebase/config";

type ItemInv = {
  id: string;
  producto: string;
  categoria: string;
  stock: number;
};

const CATS = ["pollo", "res", "cerdo","pescado", "embutido"] as const;

export default function InventarioScreen() {
  const [inventario, setInventario] = useState<ItemInv[]>([]);
  const [producto, setProducto] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // 🔎 estado de búsqueda
  const [query, setQuery] = useState("");

  const refInventario = collection(db, "inventario");

  useEffect(() => {
    const unsub = onSnapshot(refInventario, (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) }) as ItemInv
      );
      setInventario(data);
    });
    return unsub;
  }, []);

  const limpiarCampos = () => {
    setProducto("");
    setCategoria("");
    setStock("");
    setEditandoId(null);
  };

  const agregarOEditar = async () => {
    if (!producto || !categoria || stock === "") {
      Alert.alert("Campos incompletos", "Completa producto, categoría y stock.");
      return;
    }
    const stockNum = Number(stock);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      Alert.alert("Stock inválido", "Ingresa un número válido (≥ 0).");
      return;
    }

    try {
      if (editandoId) {
        await updateDoc(doc(db, "inventario", editandoId), {
          producto,
          categoria,
          stock: stockNum,
        });
        Alert.alert("Inventario actualizado");
      } else {
        await addDoc(refInventario, { producto, categoria, stock: stockNum });
        Alert.alert("Inventario agregado");
      }
      limpiarCampos();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo guardar el inventario.");
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
    Alert.alert("Eliminar", "¿Deseas eliminar este producto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "inventario", id));
        },
      },
    ]);
  };

  const inc = (delta: number) => {
    const n = Number(stock || 0) + delta;
    setStock(String(Math.max(0, n)));
  };

  const dataOrdenada = useMemo(
    () => [...inventario].sort((a, b) => a.producto.localeCompare(b.producto, "es")),
    [inventario]
  );

  // 🔎 filtrado por query (nombre o categoría)
  const dataFiltrada = useMemo(() => {
    if (!query.trim()) return dataOrdenada;
    const q = query.toLowerCase();
    return dataOrdenada.filter(
      (it) =>
        it.producto.toLowerCase().includes(q) ||
        (it.categoria ?? "").toLowerCase().includes(q)
    );
  }, [dataOrdenada, query]);

  return (
    <SafeAreaView style={styles.root}>
      {/* círculo rojo decorativo */}
      <View style={styles.topDecor} />

      <FlatList
        ListHeaderComponent={
          <>
            {/* Encabezado */}
            <Text style={styles.headerTitle}>Inventario</Text>

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
              <Text style={styles.label}>Producto</Text>
              <TextInput
                placeholder="Ej. Bistec del 7"
                value={producto}
                onChangeText={setProducto}
                style={styles.input}
                placeholderTextColor="#777"
              />


              <Text style={styles.label}>Stock (kg)</Text>
              <View style={styles.qtyRow}>
                <Pressable style={styles.qtyBtn} onPress={() => inc(-1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <TextInput
                  keyboardType="numeric"
                  value={stock}
                  onChangeText={setStock}
                  style={styles.qtyInput}
                  placeholder="0"
                  placeholderTextColor="#999"
                />
                <Pressable style={styles.qtyBtn} onPress={() => inc(1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
              </View>

              <Pressable style={styles.saveBtn} onPress={agregarOEditar}>
                <Text style={styles.saveText}>
                  {editandoId ? "GUARDAR CAMBIOS" : "AGREGAR INVENTARIO"}
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
              <Text style={styles.itemName}>{item.producto}</Text>
              <View style={styles.itemMeta}>
                <Text style={styles.itemCat}>{item.categoria}</Text>
                <Text style={styles.itemStock}>Stock: {item.stock} kg</Text>
              </View>
            </View>

            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => editar(item.id)}>
                <Text style={styles.edit}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => eliminar(item.id)}>
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

  // círculo decorativo superior derecho
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

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAEAEA",
  },
  qtyBtnText: { fontSize: 22, color: "#111", fontWeight: "700" },
  qtyInput: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#000",
    textAlign: "center",
  },

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

  catRowScroll: {
  flexDirection: "row",
  gap: 8,
  paddingHorizontal: 2,
},


  itemStock: { color: "#444", fontSize: 12 },

  itemActions: { flexDirection: "row", gap: 16 },
  edit: { color: "#0A84FF", fontWeight: "600" },
  delete: { color: "#D12D2D", fontWeight: "600" },
});
