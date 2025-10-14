// app/screens/carnicero/MenuProductosScreen.tsx
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Carrito from "../../components/Carrito";
import { auth, db } from "../../firebase/config";
import { Product } from "../../models/Producto";

// ===== Helpers (colección "productos") =====
const getName = (p: any) => p?.nombre ?? "Producto";
const getPrice = (p: any) => Number(p?.precio ?? 0);
const getCategory = (p: any) => (p?.categoria ?? "").toLowerCase();

// Si luego usas imágenes locales, puedes mapear por imageKey aquí
const IMAGE_MAP: Record<string, any> = {
  // ejemplo: panzaRes: require("../../assets/images/panza_res.png"),
};

const getImage = (p: any) => {
  if (p?.imageKey && IMAGE_MAP[p.imageKey]) return IMAGE_MAP[p.imageKey];
  const url = p?.imageUrl ?? p?.imagen ?? p?.img ?? null;
  if (typeof url === "string" && url.length) return { uri: url };
  return null; // placeholder
};

const CATEGORIES = [
  { key: "promos", label: "promos" },
  { key: "pollo", label: "pollo" },
  { key: "res", label: "res" },
  { key: "cerdo", label: "cerdo" },
];

type CartItem = {
  id: string;
  name: string;
  qtyKg: number;
  priceKg: number;
  subtotal: number;
};

export default function MenuProductosScreen() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("promos");

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [qtyInput, setQtyInput] = useState<string>("0.5"); // texto libre

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snap) => {
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any);
    });
    return unsub;
  }, []);

  const items = useMemo(() => {
    if (!activeCat || activeCat === "promos") return productos;
    return productos.filter((p: any) => getCategory(p) === activeCat);
  }, [productos, activeCat]);

  const money = (n: number) =>
    n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    });

  // ===== Utilidades cantidad =====
  const parseQty = (s: any): number => {
    if (s == null) return NaN;            // null/undefined
    if (typeof s === "number") return s;  // ya número
    if (typeof s !== "string") return NaN;
    if (!s.trim()) return NaN;
    return Number(s.replace(",", "."));
  };

  const qtyInCart = (id?: string) => carrito.find((c) => c.id === id)?.qtyKg ?? 0;

  // Establece la cantidad EXACTA (0 => elimina)
  const setQtyForProduct = (prod: any, kg: number) => {
    const id = prod.id as string;
    const price = getPrice(prod);
    const name = getName(prod);

    setCarrito((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      if (!kg || isNaN(kg) || kg <= 0) {
        if (i < 0) return prev;
        const next = [...prev];
        next.splice(i, 1);
        return next;
      }
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qtyKg: kg, subtotal: kg * next[i].priceKg };
        return next;
      }
      return [...prev, { id, name, qtyKg: kg, priceKg: price, subtotal: kg * price }];
    });
  };

  const enviarPedido = async () => {
    if (carrito.length === 0) return;
    const subtotal = carrito.reduce((acc, i) => acc + i.subtotal, 0);
    await addDoc(collection(db, "orders"), {
      userId: auth.currentUser?.uid ?? null,
      items: carrito.map((c) => ({
        nombre: c.name,
        cantidad: c.qtyKg,
        precio: c.priceKg,
        subtotal: c.subtotal,
      })),
      subtotal,
      estado: "pendiente",
      createdAt: Date.now(),
    });
    setCarrito([]);
  };

  // ==== Modal handlers ====
  const openModal = (prod: any) => {
    setSelected(prod);
    const current = qtyInCart(prod.id);
    setQtyInput(current > 0 ? String(Number(current.toFixed(3))) : "0.5");
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const bump = (delta: number) => {
    const current = parseQty(qtyInput);
    const base = isNaN(current) ? 0 : current;
    const next = Math.round((base + delta) * 1000) / 1000;
    const clamped = Math.min(50, Math.max(0, next));
    setQtyInput(String(clamped)); // permitimos 0; eliminación se decide al confirmar
  };

  const handleBlurQty = () => {
    const n = parseQty(qtyInput);
    if (isNaN(n)) {
      setQtyInput("");
      return;
    }
    const clamped = Math.min(50, Math.max(0, n));
    setQtyInput(String(Math.round(clamped * 1000) / 1000));
  };

  const confirmSet = () => {
    if (!selected) return;
    const n = parseQty(qtyInput);
    if (isNaN(n)) {
      closeModal();
      return;
    }
    const clamped = Math.min(50, Math.max(0, n));
    setQtyForProduct(selected, clamped); // 0 => elimina
    closeModal();
  };

  // ==== Render ====
  const renderHeader = () => (
    <>
      <View style={styles.topDecor} />
      <View style={styles.headerRow}>
        <View style={styles.logo} />
        <Text style={styles.headerTitle}>Menu</Text>
      </View>

      <View style={styles.catRow}>
        {CATEGORIES.map((c) => {
          const active = c.key === activeCat;
          return (
            <Pressable
              key={c.key}
              onPress={() => setActiveCat(c.key)}
              style={[styles.catChip, active && styles.catChipActive]}
            >
              <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Promociones de Septiembre</Text>
    </>
  );

  const renderItem = ({ item }: { item: any }) => {
    const img = getImage(item);
    const name = getName(item);
    const price = getPrice(item);

    return (
      <Pressable style={styles.card} onPress={() => openModal(item)}>
        <View style={styles.badge}><Text style={styles.badgeText}>✺</Text></View>
        <View style={styles.imgWrap}>
          {img ? (
            <Image source={img} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={[styles.img, styles.imgPlaceholder]}>
              <Text style={{ color: "#999" }}>IMG</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
        <Text style={styles.cardPrice}>{money(price)} / kg</Text>
      </Pressable>
    );
  };

  // Estimado (en vivo)
  const unit = selected ? getPrice(selected) : 0;
  const liveQty = parseQty(qtyInput);
  const effectiveQty = isNaN(liveQty) ? 0 : liveQty;
  const estimated = effectiveQty * unit;
  const confirmDisabled = isNaN(liveQty) || liveQty <= 0;

  return (
    <SafeAreaView style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(it: any, idx) => it?.id?.toString?.() ?? String(idx)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />

      {/* Carrito */}
      <Carrito carrito={carrito} setCarrito={setCarrito} />

      {/* Botón enviar pedido */}
      {carrito.length > 0 && (
        <Pressable style={styles.sendButton} onPress={enviarPedido}>
          <Text style={styles.sendButtonText}>ENVIAR PEDIDO</Text>
        </Pressable>
      )}

      {/* ===== Modal ===== */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Flecha (cerrar) */}
            <Pressable style={styles.modalBack} onPress={closeModal}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>

            {/* Título + precio por kg */}
            <Text style={styles.modalTitle}>
              {selected ? getName(selected) : "Producto"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Precio por kilo: {money(unit)}
            </Text>

            {/* Imagen centrada */}
            <View style={styles.modalImageWrap}>
              {selected && getImage(selected) ? (
                <Image
                  source={getImage(selected)!}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
                  <Text style={{ color: "#999" }}>IMG</Text>
                </View>
              )}
            </View>

            {/* Controles de cantidad */}
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyBtnLg} onPress={() => bump(-0.1)}>
                <Text style={styles.qtyBtnLgText}>−</Text>
              </Pressable>
              <TextInput
                value={qtyInput ?? ""}
                onChangeText={setQtyInput}
                onBlur={handleBlurQty}
                keyboardType="decimal-pad"
                style={styles.qtyInput}
                placeholder="0.50"
                placeholderTextColor="#999"
              />
              <Pressable style={styles.qtyBtnLg} onPress={() => bump(0.1)}>
                <Text style={styles.qtyBtnLgText}>＋</Text>
              </Pressable>
            </View>
            <Text style={styles.qtyHint}>Máx. 50 kg</Text>

            {/* Estimado + Confirmar en la misma fila */}
            <View style={styles.estimateRow}>
              <View>
                <Text style={styles.estimateLabel}>Estimado</Text>
                <Text style={styles.estimateValue}>{money(estimated)} MXN</Text>
                <Text style={styles.estimateNote}>
                  {isNaN(liveQty) ? "—" : effectiveQty.toFixed(3)} kg × {money(unit)} / kg
                </Text>
              </View>

              <Pressable
                style={[styles.addBtnInline, confirmDisabled && { opacity: 0.5 }]}
                onPress={confirmSet}
                disabled={confirmDisabled}
              >
                <Text style={styles.addText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },

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

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 1,
  },
  logo: { width: 28, height: 28, borderRadius: 6, backgroundColor: "#F53B2F", marginRight: 10 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: "#111" },

  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  catChip: {
    borderWidth: 1,
    borderColor: "#DADADA",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  catChipActive: { backgroundColor: "#FFEB86", borderColor: "#FFEB86" },
  catLabel: { color: "#333", fontSize: 14 },
  catLabelActive: { fontWeight: "700", color: "#333" },

  sectionTitle: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 16, color: "#222", marginBottom: 4 },

  listContent: { paddingHorizontal: 12, paddingBottom: 200 },
  column: { gap: 10, paddingHorizontal: 4 },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    marginVertical: 8,
    marginHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 12,
    position: "relative",
  },

  badge: {
    position: "absolute",
    left: 8,
    top: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  imgWrap: { marginTop: 12, marginBottom: 8 },
  img: { width: 92, height: 92, borderRadius: 46 },
  imgPlaceholder: { backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center" },

  cardName: { textAlign: "center", color: "#222", fontSize: 14, marginTop: 6, paddingHorizontal: 4 },
  cardPrice: { textAlign: "center", color: "#333", fontSize: 14, marginTop: 2, marginBottom: 6 },

  // ===== Modal =====
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    position: "relative",
  },
  modalBack: {
    position: "absolute",
    left: 10,
    top: 10,
    zIndex: 2,
    padding: 6,
    borderRadius: 999,
  },
  backIcon: { fontSize: 20, color: "#111" },

  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111", textAlign: "center", marginTop: 4 },
  modalSubtitle: { color: "#555", textAlign: "center", marginTop: 4, marginBottom: 10 },

  modalImageWrap: { alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: 10 },
  modalImage: { width: 160, height: 160, borderRadius: 80, backgroundColor: "#EEE" },
  modalImagePlaceholder: { alignItems: "center", justifyContent: "center" },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 2,
  },
  qtyBtnLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnLgText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  qtyInput: {
    minWidth: 90,
    textAlign: "center",
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "#000",
    fontWeight: "700",
  },
  qtyHint: { textAlign: "center", color: "#777", marginTop: 6, fontSize: 12 },

  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  estimateLabel: { color: "#444" },
  estimateValue: { fontSize: 20, fontWeight: "800", color: "#111", marginTop: 2 },
  estimateNote: { color: "#666", marginTop: 2, fontSize: 12 },

  addBtnInline: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: "#fff", fontWeight: "700", letterSpacing: 0.5 },

  // Botón negro fijo (pantalla)
  sendButton: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#000000",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  sendButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 1 },
});

