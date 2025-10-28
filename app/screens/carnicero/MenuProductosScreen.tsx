// app/screens/carnicero/MenuProductosScreen.tsx
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
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
import {
  PROMO_BADGE,
  getCategory,
  getProductImage,
} from "../../utils/imageRegistry";

type CartItem = {
  id: string;
  name: string;
  qtyKg: number;
  priceKg: number;
  subtotal: number;
};

type InvRow = {
  id: string;            // id del doc en colección inventario
  productoId: string;    // id del doc de productos
  stock: number;         // kg disponibles
};

const CATEGORIES = [
  { key: "promos", label: "promos" },
  { key: "pollo", label: "pollo" },
  { key: "res", label: "res" },
  { key: "cerdo", label: "cerdo" },
  { key: "pescado", label: "pescado" },
  { key: "embutido", label: "embutido" },
];

// ===== Helpers de datos =====
const getName = (p: any) => p?.nombre ?? "Producto";
const getPrice = (p: any) => Number(p?.precio ?? 0);

export default function MenuProductosScreen() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("promos");

  // Nombre del cliente (fuera del FlatList para mantener foco)
  const [customerName, setCustomerName] = useState<string>("");

  // Modal cantidad
  const [qtyModalVisible, setQtyModalVisible] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [qtyInput, setQtyInput] = useState<string>("0.5");

  // Modal revisar orden
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  // ==== Inventario (map por productoId) ====
  const [stockByProductId, setStockByProductId] = useState<
    Record<string, { invId: string; stock: number }>
  >({});

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "productos"), (snap) => {
      setProductos(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any as Product[]
      );
    });

    const unsubInv = onSnapshot(collection(db, "inventario"), (snap) => {
      const rows = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            ...(d.data() as any),
          } as InvRow)
      );
      const map: Record<string, { invId: string; stock: number }> = {};
      for (const r of rows) {
        if (!r.productoId) continue;
        map[String(r.productoId)] = { invId: r.id, stock: Number(r.stock ?? 0) };
      }
      setStockByProductId(map);
    });

    return () => {
      unsubProd();
      unsubInv();
    };
  }, []);

  const items = useMemo(() => {
    if (!activeCat || activeCat === "promos") return productos;
    return productos.filter((p: any) => getCategory(p) === activeCat);
  }, [productos, activeCat]);

  const money = (n: number) =>
    Number(n || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    });

  // ===== Cantidades =====
  const parseQty = (s: any): number => {
    if (s == null) return NaN;
    if (typeof s === "number") return s;
    if (typeof s !== "string") return NaN;
    if (!s.trim()) return NaN;
    return Number(s.replace(",", "."));
  };

  const qtyInCart = (id?: string) =>
    carrito.find((c) => c.id === id)?.qtyKg ?? 0;

  const availableStock = (productId?: string) => {
    if (!productId) return 0;
    return stockByProductId[String(productId)]?.stock ?? 0;
  };

  const clampToStock = (prodId: string, desiredKg: number) => {
    const stock = availableStock(prodId);
    // Como en el carrito hay a lo mucho 1 línea por producto, clamp directo al stock
    return Math.max(0, Math.min(desiredKg, stock));
  };

  const setQtyForProduct = (prod: any, kg: number) => {
    const id = String(prod.id);
    const price = getPrice(prod);
    const name = getName(prod);

    // Clamp contra stock disponible
    const clamped = clampToStock(id, kg);

    setCarrito((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      if (!clamped || isNaN(clamped) || clamped <= 0) {
        if (i < 0) return prev;
        const next = [...prev];
        next.splice(i, 1);
        return next;
      }
      if (i >= 0) {
        const next = [...prev];
        next[i] = {
          ...next[i],
          qtyKg: clamped,
          subtotal: clamped * next[i].priceKg,
        };
        return next;
      }
      return [
        ...prev,
        { id, name, qtyKg: clamped, priceKg: price, subtotal: clamped * price },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    Alert.alert("Eliminar producto", "¿Deseas quitar este producto de la orden?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          setCarrito((prev) => prev.filter((c) => c.id !== id)),
      },
    ]);
  };

  // ==== Modal cantidad handlers ====
  const openQtyModal = (prod: any) => {
    // Si no hay stock, no abrir modal
    if (availableStock(prod?.id) <= 0) {
      Alert.alert("Sin stock", "Este producto no tiene existencias.");
      return;
    }
    setSelected(prod);
    const current = qtyInCart(prod.id);
    const start = current > 0 ? Number(current.toFixed(3)) : 0.5;
    const clamped = clampToStock(String(prod.id), start);
    setQtyInput(String(clamped));
    setQtyModalVisible(true);
  };

  const closeQtyModal = () => {
    setQtyModalVisible(false);
    setSelected(null);
  };

  const bump = (delta: number) => {
    const base = parseQty(qtyInput);
    const current = isNaN(base) ? 0 : base;
    const next = Math.round((current + delta) * 1000) / 1000;
    const stock = availableStock(selected?.id);
    const clamped = Math.min(stock, Math.max(0, next));
    setQtyInput(String(clamped));
  };

  const handleBlurQty = () => {
    const n = parseQty(qtyInput);
    if (isNaN(n)) {
      setQtyInput("");
      return;
    }
    const stock = availableStock(selected?.id);
    const clamped = Math.min(stock, Math.max(0, n));
    setQtyInput(String(Math.round(clamped * 1000) / 1000));
  };

  const confirmSet = () => {
    if (!selected) return;
    const n = parseQty(qtyInput);
    const stock = availableStock(selected.id);
    if (isNaN(n) || n <= 0) {
      setQtyForProduct(selected, 0);
      closeQtyModal();
      return;
    }
    const clamped = Math.min(stock, Math.max(0, n));
    if (clamped <= 0) {
      Alert.alert("Sin stock", "No hay existencias suficientes.");
      return;
    }
    setQtyForProduct(selected, clamped);
    closeQtyModal();
  };

  // ==== Totales y thumbs ====
  const subtotal = carrito.reduce((a, c) => a + c.subtotal, 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const ahorro = 0;

  const findProd = (id?: string) =>
    id ? productos.find((p: any) => String(p.id) === String(id)) : undefined;
  const thumb1 = carrito[0] ? getProductImage(findProd(carrito[0].id) as any) : null;
  const thumb2 = carrito[1] ? getProductImage(findProd(carrito[1].id) as any) : null;

  // ==== Enviar pedido con verificación y transacción ====
  const enviarPedido = async () => {
    if (!customerName.trim()) {
      Alert.alert("Falta tu nombre", "Indica tu nombre para poder llamar tu orden.");
      return;
    }
    if (carrito.length === 0) {
      Alert.alert("Carrito vacío", "Agrega productos primero.");
      return;
    }

    // Validación previa rápida con el snapshot local
    const faltantes: string[] = [];
    for (const i of carrito) {
      const stock = availableStock(i.id);
      if (i.qtyKg > stock) {
        faltantes.push(`${i.name} (disp. ${stock.toFixed(3)} kg)`);
      }
    }
    if (faltantes.length) {
      Alert.alert(
        "Stock insuficiente",
        `Ajusta cantidades:\n- ${faltantes.join("\n- ")}`
      );
      return;
    }

    try {
      // 1) Decrementar stock en transacción atómica
      await runTransaction(db, async (tx) => {
        for (const i of carrito) {
          const invInfo = stockByProductId[i.id];
          if (!invInfo) {
            throw new Error(`Sin doc de inventario para ${i.name}`);
          }
          const invRef = doc(db, "inventario", invInfo.invId);
          const invSnap = await tx.get(invRef);
          if (!invSnap.exists()) {
            throw new Error(`Inventario inexistente para ${i.name}`);
          }
          const current = Number(invSnap.data()?.stock ?? 0);
          if (current < i.qtyKg) {
            throw new Error(
              `Stock insuficiente para ${i.name}. Disp: ${current.toFixed(
                3
              )} kg`
            );
          }
          tx.update(invRef, { stock: Number((current - i.qtyKg).toFixed(3)) });
        }
      });

      // 2) Crear orden sólo si la transacción anterior fue ok
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
      Alert.alert(
        "¡Listo!",
        "Tu orden fue enviada. Te llamaremos por tu nombre cuando esté lista."
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "No se pudo enviar",
        e?.message ?? "Ocurrió un error al validar el stock."
      );
    }
  };

  // ===== Header sin inputs (memo) =====
  const ProductsHeader = useMemo(
    () => (
      <>
        {/* categorías con scroll horizontal si no caben */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRowScroll}
          style={{ paddingVertical: 6 }}
        >
          {CATEGORIES.map((c) => {
            const active = c.key === activeCat;
            return (
              <Pressable
                key={c.key}
                onPress={() => setActiveCat(c.key)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <Text
                  style={[styles.catLabel, active && styles.catLabelActive]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Promociones de Septiembre</Text>
      </>
    ),
    [activeCat]
  );

  // ===== renderItem =====
  const renderItem = ({ item }: { item: any }) => {
    const name = getName(item);
    const price = getPrice(item);
    const img = getProductImage(item);
    const stock = availableStock(item?.id);
    const out = stock <= 0;

    return (
      <Pressable
        style={[styles.card, out && { opacity: 0.55 }]}
        onPress={() => openQtyModal(item)}
        disabled={out}
      >
        {/* Badge de promo */}
        {item?.promo === true && (
          <Image source={PROMO_BADGE} style={styles.promoBadge} />
        )}

        {/* Etiqueta "Sin stock" */}
        {out && (
          <View style={styles.outBadge}>
            <Text style={styles.outBadgeText}>Sin stock</Text>
          </View>
        )}

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
        {!out && (
          <Text style={styles.cardStock}>
            Disp: {Number(stock).toFixed(3)} kg
          </Text>
        )}
      </Pressable>
    );
  };

  // Estimado (en vivo) del modal de cantidad
  const unit = selected ? getPrice(selected) : 0;
  const liveQty = parseQty(qtyInput);
  const effectiveQty = isNaN(liveQty) ? 0 : liveQty;
  const estimated = effectiveQty * unit;
  const confirmDisabled = isNaN(liveQty) || liveQty <= 0;

  return (
    <SafeAreaView style={styles.root}>
      {/* Campo de nombre */}
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

      {/* Botón tipo pill: Ver orden */}
      <Pressable
        style={[styles.orderPill, carrito.length === 0 && { opacity: 0.6 }]}
        onPress={() => setOrderModalVisible(true)}
        disabled={carrito.length === 0}
      >
        <View style={styles.pillThumbs}>
          <View style={styles.thumbWrap}>
            {thumb1 ? (
              <Image source={thumb1} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPh]} />
            )}
          </View>
          <View style={[styles.thumbWrap, { marginLeft: -10 }]}>
            {thumb2 ? (
              <Image source={thumb2} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPh]} />
            )}
          </View>
        </View>
        <Text style={styles.pillText}>Ver orden</Text>
      </Pressable>

      {/* ========= Modal CANTIDAD ========= */}
      <Modal
        visible={qtyModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeQtyModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Pressable style={styles.modalBack} onPress={closeQtyModal}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>

            <Text style={styles.modalTitle}>
              {selected ? getName(selected) : "Producto"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Precio por kilo: {money(unit)}
            </Text>

            {/* Stock disponible en modal */}
            {selected && (
              <Text style={styles.modalStock}>
                Disponible: {availableStock(selected.id).toFixed(3)} kg
              </Text>
            )}

            <View style={styles.modalImageWrap}>
              {selected && getProductImage(selected) ? (
                <Image
                  source={getProductImage(selected)!}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[styles.modalImage, styles.modalImagePlaceholder]}
                />
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
            <Text style={styles.qtyHint}>Máx. 50 kg (limitado por stock)</Text>

            <View style={styles.estimateRow}>
              <View>
                <Text style={styles.estimateLabel}>Estimado</Text>
                <Text style={styles.estimateValue}>{money(estimated)} MXN</Text>
                <Text style={styles.estimateNote}>
                  {isNaN(liveQty) ? "—" : effectiveQty.toFixed(3)} kg ×{" "}
                  {money(unit)} / kg
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text style={styles.orderName}>
                    {customerName || "Nombre del cliente"}
                  </Text>
                  <Text style={styles.orderId}>
                    Orden #{Math.floor(Math.random() * 900 + 100)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setOrderModalVisible(false)}
                  hitSlop={10}
                >
                  <Text style={styles.backIcon}>←</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 8 }}>
                {carrito.map((c) => {
                  const prod = productos.find(
                    (p: any) => String(p.id) === c.id
                  );
                  const img = prod ? getProductImage(prod) : null;
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
                        {img ? (
                          <Image source={img} style={{ width: 56, height: 56 }} />
                        ) : null}
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.orderItemName}>{c.name}</Text>
                        <Text style={styles.orderItemLine}>
                          {c.qtyKg.toFixed(3)} Kg
                        </Text>
                        <Text style={styles.orderItemLine}>
                          {money(c.priceKg)}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.orderItemAmount}>
                          {money(c.subtotal)}
                        </Text>

                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => removeFromCart(c.id)}
                        >
                          <Text style={styles.deleteBtnText}>Eliminar</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View className="separator" style={styles.separator} />

              <View style={{ alignItems: "flex-end", marginTop: 6 }}>
                <Text style={styles.orderTotal}>Total {money(total)} mxn</Text>
                <Text style={styles.orderNote}>IVA incluido {money(iva)}</Text>
                <Text style={styles.orderNote}>Ahorro {money(ahorro)}</Text>
                <Text style={styles.orderNote}>{carrito.length} productos</Text>
              </View>

              {!customerName.trim() && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.nameLabel}>
                    Tu nombre para llamar la orden
                  </Text>
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
                <Pressable
                  style={styles.btnCancel}
                  onPress={() => setOrderModalVisible(false)}
                >
                  <Text style={styles.btnCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.btnSend,
                    (!customerName.trim() || carrito.length === 0) && {
                      opacity: 0.6,
                    },
                  ]}
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

  catRowScroll: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
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

  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: "#222",
    marginBottom: 4,
  },

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

  promoBadge: {
    position: "absolute",
    left: 8,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    zIndex: 2,
  },

  outBadge: {
    position: "absolute",
    right: 8,
    top: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    zIndex: 2,
  },
  outBadgeText: { color: "#B91C1C", fontWeight: "700", fontSize: 11 },

  imgWrap: { marginTop: 12, marginBottom: 8 },
  img: { width: 92, height: 92, borderRadius: 46 },
  imgPlaceholder: { backgroundColor: "#F0F0F0" },

  cardName: {
    textAlign: "center",
    color: "#222",
    fontSize: 14,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  cardPrice: {
    textAlign: "center",
    color: "#333",
    fontSize: 14,
    marginTop: 2,
  },
  cardStock: { color: "#666", fontSize: 12, marginTop: 2, marginBottom: 6 },

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
  pillThumbs: {
    position: "absolute",
    left: 10,
    top: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
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

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginTop: 4,
  },
  modalSubtitle: { color: "#555", textAlign: "center", marginTop: 4, marginBottom: 4 },
  modalStock: { color: "#666", textAlign: "center", marginBottom: 10, fontSize: 12 },

  modalImageWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 10,
  },
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
    flex: 1,
    backgroundColor: "#E5E5E5",
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnCancelText: { color: "#111", fontWeight: "700" },
  btnSend: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnSendText: { color: "#fff", fontWeight: "800" },
});
