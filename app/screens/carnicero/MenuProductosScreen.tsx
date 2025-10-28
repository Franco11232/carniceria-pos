// app/screens/carnicero/MenuProductosScreen.tsx
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth, db } from "../../firebase/config";
import { Product } from "../../models/Producto";

// ===== Helpers (colección "productos") =====
const getName = (p: any) => p?.nombre ?? "Producto";
const getPrice = (p: any) => Number(p?.precio ?? 0);
const getCategory = (p: any) => (p?.categoria ?? "").toLowerCase();
const PROMO_BADGE = require("../../../assets/images/badges/promo/promo.png");


const IMAGE_MAP: Record<string, any> = {
  // ejemplo: panzaRes: require("../../assets/images/panza_res.png"),
};

const getImage = (p: any) => {
  if (p?.imageKey && IMAGE_MAP[p.imageKey]) return IMAGE_MAP[p.imageKey];
  const url = p?.imageUrl ?? p?.imagen ?? p?.img ?? null;
  if (typeof url === "string" && url.length) return { uri: url };
  return null;
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

  // Nombre del cliente (fuera del FlatList para no perder foco)
  const [customerName, setCustomerName] = useState<string>("");

  // Modal cantidad (por producto)
  const [qtyModalVisible, setQtyModalVisible] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [qtyInput, setQtyInput] = useState<string>("0.5");

  // Modal revisar orden
  const [orderModalVisible, setOrderModalVisible] = useState(false);

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
    if (s == null) return NaN;
    if (typeof s === "number") return s;
    if (typeof s !== "string") return NaN;
    if (!s.trim()) return NaN;
    return Number(s.replace(",", "."));
  };

  const qtyInCart = (id?: string) => carrito.find((c) => c.id === id)?.qtyKg ?? 0;

  // Establece cantidad exacta (0 => elimina)
  const setQtyForProduct = (prod: any, kg: number) => {
    const id = String(prod.id);
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

  // Eliminar producto del carrito (desde "Ver orden")
  const removeFromCart = (id: string) => {
    Alert.alert("Eliminar producto", "¿Deseas quitar este producto de la orden?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => setCarrito((prev) => prev.filter((c) => c.id !== id)),
      },
    ]);
  };

  // ==== Modal cantidad handlers ====
  const openQtyModal = (prod: any) => {
    setSelected(prod);
    const current = qtyInCart(prod.id);
    setQtyInput(current > 0 ? String(Number(current.toFixed(3))) : "0.5");
    setQtyModalVisible(true);
  };
  const closeQtyModal = () => {
    setQtyModalVisible(false);
    setSelected(null);
  };
  const bump = (delta: number) => {
    const current = parseQty(qtyInput);
    const base = isNaN(current) ? 0 : current;
    const next = Math.round((base + delta) * 1000) / 1000;
    const clamped = Math.min(50, Math.max(0, next));
    setQtyInput(String(clamped));
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
    if (isNaN(n) || n <= 0) {
      setQtyForProduct(selected, 0);
      closeQtyModal();
      return;
    }
    const clamped = Math.min(50, Math.max(0, n));
    setQtyForProduct(selected, clamped);
    closeQtyModal();
  };

  // ==== Enviar pedido ====
  const enviarPedido = async () => {
    if (!customerName.trim()) {
      Alert.alert("Falta tu nombre", "Indica tu nombre para poder llamar tu orden.");
      return;
    }
    if (carrito.length === 0) {
      Alert.alert("Carrito vacío", "Agrega productos primero.");
      return;
    }
    const subtotal = carrito.reduce((acc, i) => acc + i.subtotal, 0);
    await addDoc(collection(db, "orders"), {
      userId: auth.currentUser?.uid ?? null,
      customerName: customerName.trim(),
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
    setOrderModalVisible(false);
    Alert.alert("¡Listo!", "Tu orden fue enviada. Te llamaremos por tu nombre cuando esté lista.");
  };

  // ===== Header de productos (memo) SIN inputs =====
  const ProductsHeader = useMemo(
    () => (
      <>
        {/* Categorías */}
        <View style={styles.catRow}>
          {CATEGORIES.map((c) => {
            const active = c.key === activeCat;
            return (
              <Pressable
                key={c.key}
                onPress={() => setActiveCat(c.key)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Promociones de Septiembre</Text>
      </>
    ),
    [activeCat]
  );

  // Totales para modal de orden
  const subtotal = carrito.reduce((a, c) => a + c.subtotal, 0);
  const iva = subtotal * 0.16;
  const ahorro = 0;
  const total = subtotal;

  // Thumbs para el pill
  const findProd = (id?: string) => (id ? productos.find((p: any) => String(p.id) === String(id)) : undefined);
  const thumb1Prod = carrito[0] ? findProd(carrito[0].id) : undefined;
  const thumb2Prod = carrito[1] ? findProd(carrito[1].id) : undefined;
  const thumb1 = thumb1Prod ? getImage(thumb1Prod) : null;
  const thumb2 = thumb2Prod ? getImage(thumb2Prod) : null;

  // Estimado (en vivo) del modal de cantidad
  const unit = selected ? getPrice(selected) : 0;
  const liveQty = parseQty(qtyInput);
  const effectiveQty = isNaN(liveQty) ? 0 : liveQty;
  const estimated = effectiveQty * unit;
  const confirmDisabled = isNaN(liveQty) || liveQty <= 0;

  // ====== renderItem para FlatList ======
  const renderItem = ({ item }: { item: any }) => {
    const name = getName(item);
    const price = getPrice(item);
    const img = getImage(item);

    return (
      <Pressable style={styles.card} onPress={() => openQtyModal(item)}>
        {/* Badge de promo (solo si aplica) */}
        {item?.promo && <Image source={PROMO_BADGE} style={styles.promoBadge} />}

        <View style={styles.imgWrap}>
          {img ? (
            <Image source={img} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={[styles.img, styles.imgPlaceholder]} />
          )}
        </View>

        <Text style={styles.cardName} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.cardPrice}>{money(price)} / kg</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Campo de nombre (no afecta scroll del FlatList) */}
      <View style={styles.nameRow}>
        <Text style={styles.nameLabel}>¿A nombre de quién va la orden?</Text>
        <TextInput
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Escribe tu nombre"
          placeholderTextColor="#999"
          style={styles.nameInput}
          blurOnSubmit={false}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it: any, idx) => it?.id?.toString?.() ?? String(idx)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ProductsHeader}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      />

      {/* Botón tipo pill: Ver orden (no cambiar texto) */}
      <Pressable
        style={[styles.orderPill, carrito.length === 0 && { opacity: 0.6 }]}
        onPress={() => setOrderModalVisible(true)}
        disabled={carrito.length === 0}
      >
        <View style={styles.pillThumbs}>
          <View style={styles.thumbWrap}>
            {thumb1 ? <Image source={thumb1} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbPh]} />}
          </View>
          <View style={[styles.thumbWrap, { marginLeft: -10 }]}>
            {thumb2 ? <Image source={thumb2} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbPh]} />}
          </View>
        </View>
        <Text style={styles.pillText}>Ver orden</Text>
      </Pressable>

      {/* ========= Modal CANTIDAD ========= */}
      <Modal visible={qtyModalVisible} animationType="fade" transparent onRequestClose={closeQtyModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Pressable style={styles.modalBack} onPress={closeQtyModal}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>

            <Text style={styles.modalTitle}>{selected ? getName(selected) : "Producto"}</Text>
            <Text style={styles.modalSubtitle}>Precio por kilo: {money(unit)}</Text>

            <View style={styles.modalImageWrap}>
              {selected && getImage(selected) ? (
                <Image source={getImage(selected)!} style={styles.modalImage} resizeMode="cover" />
              ) : (
                <View style={[styles.modalImage, styles.modalImagePlaceholder]} />
              )}
            </View>

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

      {/* ========= Modal VER ORDEN ========= */}
      <Modal
        visible={orderModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.orderCard]}>
            <ScrollView contentContainerStyle={{ padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={styles.orderName}>{customerName || "Nombre del cliente"}</Text>
                  {/* Solo vista previa local; el folio real lo verás en la pantalla de Pedidos */}
                  <Text style={styles.orderId}>Orden #{Math.floor(Math.random() * 900 + 100)}</Text>
                </View>
                <Pressable onPress={() => setOrderModalVisible(false)} hitSlop={10}>
                  <Text style={styles.backIcon}>←</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 8 }}>
                {carrito.map((c) => {
                  const prod = productos.find((p: any) => String(p.id) === c.id);
                  const img = prod ? getImage(prod) : null;
                  return (
                    <View key={c.id} style={styles.orderItemRow}>
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: "#eee",
                          overflow: "hidden",
                        }}
                      >
                        {img ? <Image source={img} style={{ width: 56, height: 56 }} /> : null}
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.orderItemName}>{c.name}</Text>
                        <Text style={styles.orderItemLine}>{c.qtyKg.toFixed(3)} Kg</Text>
                        <Text style={styles.orderItemLine}>{money(c.priceKg)}</Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.orderItemAmount}>{money(c.subtotal)}</Text>

                        {/* Botón eliminar */}
                        <Pressable style={styles.deleteBtn} onPress={() => removeFromCart(c.id)}>
                          <Text style={styles.deleteBtnText}>Eliminar</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.separator} />

              <View style={{ alignItems: "flex-end", marginTop: 6 }}>
                <Text style={styles.orderTotal}>Total {money(total)} mxn</Text>
                <Text style={styles.orderNote}>IVA incluido {money(iva)}</Text>
                <Text style={styles.orderNote}>Ahorro {money(ahorro)}</Text>
                <Text style={styles.orderNote}>{carrito.length} productos</Text>
              </View>

              {!customerName.trim() && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.nameLabel}>Tu nombre para llamar la orden</Text>
                  <TextInput
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Escribe tu nombre"
                    placeholderTextColor="#999"
                    style={styles.nameInput}
                  />
                </View>
              )}

              <View style={styles.orderButtons}>
                <Pressable style={styles.btnCancel} onPress={() => setOrderModalVisible(false)}>
                  <Text style={styles.btnCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnSend, (!customerName.trim() || carrito.length === 0) && { opacity: 0.6 }]}
                  onPress={enviarPedido}
                  disabled={!customerName.trim() || carrito.length === 0}
                >
                  <Text style={styles.btnSendText}>Enviar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ========== ESTILOS ========== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },

  nameRow: { paddingHorizontal: 16, marginTop: 6, marginBottom: 8 },
  nameLabel: { color: "#333", marginBottom: 6, fontSize: 13 },
  nameInput: {
    backgroundColor: "#F4F4F4",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

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

  listContent: { paddingHorizontal: 12, paddingBottom: 160 },
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

  promoBadge: {
    position: "absolute",
    left: 8,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    zIndex: 2,
  },

  imgWrap: { marginTop: 12, marginBottom: 8 },
  img: { width: 92, height: 92, borderRadius: 46 },
  imgPlaceholder: { backgroundColor: "#F0F0F0" },

  cardName: { textAlign: "center", color: "#222", fontSize: 14, marginTop: 6, paddingHorizontal: 4 },
  cardPrice: { textAlign: "center", color: "#333", fontSize: 14, marginTop: 2, marginBottom: 6 },

  /* ===== Pill Ver orden ===== */
  orderPill: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: "#F53B2F",
    height: 60,
    borderRadius: 30,
    paddingLeft: 64,
    paddingRight: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  pillThumbs: { position: "absolute", left: 10, top: 6, flexDirection: "row", alignItems: "center" },
  thumbWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", overflow: "hidden",
    borderWidth: 2, borderColor: "#fff",
  },
  thumb: { width: "100%", height: "100%" },
  thumbPh: { backgroundColor: "#eee" },
  pillText: { color: "#fff", fontWeight: "800", fontSize: 18, marginLeft: 8 },

  /* ===== Modal base ===== */
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
  modalBack: { position: "absolute", left: 10, top: 10, zIndex: 2, padding: 6, borderRadius: 999 },
  backIcon: { fontSize: 20, color: "#111" },

  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111", textAlign: "center", marginTop: 4 },
  modalSubtitle: { color: "#555", textAlign: "center", marginTop: 4, marginBottom: 10 },

  modalImageWrap: { alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: 10 },
  modalImage: { width: 160, height: 160, borderRadius: 80, backgroundColor: "#EEE" },
  modalImagePlaceholder: { alignItems: "center", justifyContent: "center" },

  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 2 },
  qtyBtnLg: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  qtyBtnLgText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  qtyInput: {
    minWidth: 90, textAlign: "center", backgroundColor: "#F2F2F2", borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, color: "#000", fontWeight: "700",
  },
  qtyHint: { textAlign: "center", color: "#777", marginTop: 6, fontSize: 12 },

  estimateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14 },
  estimateLabel: { color: "#444" },
  estimateValue: { fontSize: 20, fontWeight: "800", color: "#111", marginTop: 2 },
  estimateNote: { color: "#666", marginTop: 2, fontSize: 12 },
  addBtnInline: { backgroundColor: "#000", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  addText: { color: "#fff", fontWeight: "700", letterSpacing: 0.5 },

  /* ===== Modal Orden ===== */
  orderCard: {
    width: "94%",
    maxHeight: "86%",
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  orderName: { fontSize: 18, fontWeight: "800", color: "#111" },
  orderId: { color: "#666", marginTop: 2, marginBottom: 8 },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8E8E8",
  },
  orderItemName: { fontWeight: "700", color: "#111" },
  orderItemLine: { color: "#555", marginTop: 2, fontSize: 12 },
  orderItemAmount: { fontWeight: "700", color: "#111" },

  deleteBtn: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  deleteBtnText: { color: "#B91C1C", fontWeight: "700", fontSize: 12 },

  separator: { height: 1, backgroundColor: "#E5E5E5", marginTop: 6, marginBottom: 8 },

  orderTotal: { fontSize: 18, fontWeight: "800", color: "#111" },
  orderNote: { color: "#666", fontSize: 12 },

  orderButtons: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 18 },
  btnCancel: {
    flex: 1, backgroundColor: "#E5E5E5", borderRadius: 24, paddingVertical: 12, alignItems: "center",
  },
  btnCancelText: { color: "#111", fontWeight: "700" },
  btnSend: {
    flex: 1, backgroundColor: "#000", borderRadius: 24, paddingVertical: 12, alignItems: "center",
  },
  btnSendText: { color: "#fff", fontWeight: "800" },
});
