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
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebase/config";
import { getProductImage } from "../../utils/imageRegistry";

type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  // nuevos/compatibles con MenuProductos + imageRegistry
  imageKey?: string;
  imageUrl?: string;
  promo?: boolean;
};

// categorías disponibles
const CATS = ["pollo", "res", "cerdo", "pescado", "embutido"] as const;

// claves de imagen registradas en imageRegistry.ts (PRODUCT_IMAGES)
const IMAGE_KEYS: string[] = [
  // Res / Beef
  "beef-bistec",
  "beef-diezmillo",
  "beef-milanesa",
  "beef-molida",
  "beef-chamorrerete",
  "beef-panza",
  "beef-costilla",
  // Cerdo / Pork
  "pork-espinazo",
  "pork-costilla",
  "pork-molida",
  "pork-chuleta",
  "pork-piernita",
  // Pollo / Chicken
  "chicken-pechuga",
  "chicken-pierna",
  "chicken-alita",
  "chicken-milanesa",
  "chicken-molida",
  // Embutidos
  "sausage-chorizo",
  "sausage-longaniza",
  // Pescado (opcional)
  "fish-tilapia",
];

export default function ProductosScreen() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [precio, setPrecio] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // nuevos: imagen y promo
  const [imageKey, setImageKey] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [promo, setPromo] = useState<boolean>(false);

  // 🔎 búsqueda
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
    setImageKey("");
    setImageUrl("");
    setPromo(false);
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

    // Si hay URL, forzamos a no guardar imageKey (evita ambigüedad)
    const payload = {
      nombre,
      categoria,
      precio: precioNum,
      imageKey: imageUrl.trim().length ? "" : imageKey || "",
      imageUrl: imageUrl.trim() || "",
      promo: !!promo,
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, "productos", editandoId), payload);
        Alert.alert("Producto actualizado");
      } else {
        const nuevo = await addDoc(refProductos, payload);

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
      setPrecio(String(p.precio ?? ""));
      setImageKey(p.imageKey ?? "");
      setImageUrl(p.imageUrl ?? "");
      setPromo(!!p.promo);
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

  // preview de imagen actual
  const previewSource = getProductImage({
    imageKey: imageUrl.trim().length ? "" : imageKey,
    imageUrl: imageUrl.trim(),
    categoria,
  });

  // helper: al escribir URL, limpiamos imageKey
  const onChangeImageUrl = (v: string) => {
    setImageUrl(v);
    if (v.trim().length > 0) {
      setImageKey("");
    }
  };

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
              <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.catRowScroll} // usa gap y padding aquí
  style={{ marginBottom: 12 }}                 // espaciado inferior opcional
>
  {CATS.map((c) => {
    const active = c === categoria;
    return (
      <Pressable
        key={c}
        onPress={() => setCategoria(c)}
        style={[styles.catChip, active && styles.catChipActive]}
      >
        <Text style={[styles.catText, active && styles.catTextActive]}>
          {c}
        </Text>
      </Pressable>
    );
  })}
</ScrollView>

              <Text style={styles.label}>Precio</Text>
              <TextInput
                placeholder="$0"
                keyboardType="numeric"
                value={precio}
                onChangeText={setPrecio}
                style={styles.input}
                placeholderTextColor="#777"
              />

              {/* Imagen: local (imageKey) o URL */}
              <Text style={styles.label}>Imagen del producto</Text>

              {/* Selector por imageKey con scroll horizontal */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 6 }}
                style={{ marginBottom: 10 }}
              >
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {IMAGE_KEYS.map((key) => {
                    const active = key === imageKey && !imageUrl.trim();
                    const src = getProductImage({
                      imageKey: key,
                      categoria,
                    });
                    return (
                      <Pressable
                        key={key}
                        onPress={() => {
                          setImageKey(key);
                          setImageUrl(""); // al elegir local, vaciamos URL
                        }}
                        style={[
                          styles.imgChip,
                          active && styles.imgChipActive,
                        ]}
                      >
                        <Image source={src} style={styles.imgThumb} />
                        <Text
                          style={[
                            styles.imgKeyText,
                            active && styles.imgKeyTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {key.replace(/^[a-z]+-/, "")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Preview de imagen seleccionada */}
              <View style={styles.previewRow}>
                <View style={styles.previewCircle}>
                  {previewSource ? (
                    <Image
                      source={previewSource as any}
                      style={{ width: 72, height: 72, borderRadius: 36 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: "#EEE",
                      }}
                    />
                  )}
                </View>
                <View style={{ justifyContent: "center", marginLeft: 10 }}>
                  <Text style={{ color: "#444" }}>
                    {imageUrl.trim()
                      ? "Usando imagen por URL"
                      : imageKey
                      ? `Usando asset local: ${imageKey}`
                      : "Sin imagen (Default)"}
                  </Text>
                </View>
              </View>

              {/* Toggle Promo */}
              <View style={styles.promoRow}>
                <Text style={styles.label}>¿Está en promoción?</Text>
                <Switch
                  value={promo}
                  onValueChange={setPromo}
                  thumbColor={promo ? "#fff" : "#fff"}
                  trackColor={{ false: "#d4d4d4", true: "#FF6B00" }}
                />
              </View>

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
        renderItem={({ item }) => {
          const src = getProductImage({
            imageKey: item.imageUrl ? "" : item.imageKey,
            imageUrl: item.imageUrl,
            categoria: item.categoria,
          });
          return (
            <View style={styles.itemRow}>
              <View style={styles.itemAvatar}>
                {src ? (
                  <Image source={src as any} style={styles.itemImg} />
                ) : (
                  <View style={styles.itemImgPh} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemCat}>{item.categoria}</Text>
                  <Text style={styles.itemPrice}>{money(item.precio)}</Text>
                  {item.promo ? (
                    <Text style={styles.itemPromo}>PROMO</Text>
                  ) : null}
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
          );
        }}
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
  catRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
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

  // Selector de imageKey
  imgChip: {
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    width: 92,
  },
  imgChipActive: {
    borderColor: "#FF6B00",
    backgroundColor: "#FFF4EA",
  },
  imgThumb: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EEE" },
  imgKeyText: { color: "#444", fontSize: 12, marginTop: 6 },
  imgKeyTextActive: { color: "#BF4B00", fontWeight: "700" },

  // Preview
  previewRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  previewCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  // Toggle promo
  promoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 6,
  },

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

  catRowScroll: {
  flexDirection: "row",
  gap: 8,
  paddingHorizontal: 2,
},

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
  itemAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#EEE",
  },
  itemImg: { width: "100%", height: "100%" },
  itemImgPh: { width: "100%", height: "100%", backgroundColor: "#EEE" },

  itemName: { fontSize: 16, fontWeight: "700", color: "#111" },
  itemMeta: { flexDirection: "row", gap: 8, marginTop: 2, flexWrap: "wrap" },
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
  itemPromo: {
    backgroundColor: "#FFE2CC",
    color: "#BF4B00",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    overflow: "hidden",
    fontWeight: "700",
  },

  itemActions: { flexDirection: "row", gap: 16 },
  edit: { color: "#0A84FF", fontWeight: "600" },
  delete: { color: "#D12D2D", fontWeight: "600" },
});
