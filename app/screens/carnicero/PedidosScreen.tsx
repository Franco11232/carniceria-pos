// app/screens/carnicero/PedidosScreen.tsx
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../firebase/config";
import { getProductImage } from "../../utils/imageRegistry"; // <-- usa tu helper centralizado

type ItemA = { productId?: string; nombre: string; cantidad: number; precio: number; subtotal?: number };
type ItemB = { id?: string; name: string; qtyKg: number; priceKg: number; subtotal?: number };
type AnyItem = ItemA | ItemB;

type OrderDoc = {
  id: string;
  cliente?: string;          // legacy
  customerName?: string;     // nuevo
  folio?: string | number;
  createdAt?: number;
  estado?: "pendiente" | "cocina" | "pagado" | "completado";
  metodoPago?: "efectivo" | "tarjeta" | "ambos";
  subtotal?: number;
  items: AnyItem[];
};

const norm = (it: AnyItem) => {
  const name = (it as any).nombre ?? (it as any).name ?? "Producto";
  const qty = (it as any).cantidad ?? (it as any).qtyKg ?? 1;
  const price = (it as any).precio ?? (it as any).priceKg ?? 0;
  const subtotal = (it as any).subtotal ?? Number(qty) * Number(price);
  return { name: String(name), qty: Number(qty), price: Number(price), subtotal: Number(subtotal) };
};

const money = (n: number) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 1,
  });

// --- helpers para nombre y folio ---
const getCustomerName = (o: OrderDoc) =>
  (o.customerName ?? o.cliente ?? "Cliente");

const toNum = (f: any): number | null => {
  const n = Number(f);
  return Number.isFinite(n) ? n : null;
};
const fmt2 = (n: number) => (n % 100).toString().padStart(2, "0");
const stableFolio = (o: OrderDoc) => {
  // si el doc trae folio, úsalo; si no, derivar estable de su id
  const given = toNum(o.folio);
  if (given) return fmt2(given);
  // hash simple de id -> 01..99
  let acc = 0;
  const s = o.id || "";
  for (let i = 0; i < s.length; i++) acc = (acc + s.charCodeAt(i)) % 97;
  return fmt2((acc % 99) + 1);
};

type TabKey = "pago" | "pedidos" | "completado";

export default function PedidosScreen() {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [tab, setTab] = useState<TabKey>("pago");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- productos para poder resolver imágenes de los items ----
  const [productos, setProductos] = useState<any[]>([]);

  // suscripción a órdenes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderDoc[];
      data.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setOrders(data);
      if (!selectedId && data.length) {
        const firstPending = data.find((o) => (o.estado ?? "pendiente") === "pendiente" || o.estado === "cocina");
        setSelectedId(firstPending?.id ?? data[0].id);
      }
    });
    return unsub;
  }, [selectedId]);

  // suscripción a productos (para lookup de imágenes)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snap) => {
      setProductos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, []);

  const pendientes = useMemo(
    () => orders.filter((o) => (o.estado ?? "pendiente") === "pendiente" || o.estado === "cocina"),
    [orders]
  );
  const pagados = useMemo(() => orders.filter((o) => o.estado === "pagado"), [orders]);
  const completados = useMemo(() => orders.filter((o) => o.estado === "completado"), [orders]);

  const currentForPay = useMemo(
    () => pendientes.find((o) => o.id === selectedId) ?? pendientes[0] ?? null,
    [pendientes, selectedId]
  );

  const marcarPagado = async (orderId: string, metodo: "efectivo" | "tarjeta" | "ambos") => {
    await updateDoc(doc(db, "orders", orderId), {
      estado: "pagado",
      metodoPago: metodo,
      pagadoEn: Date.now(),
    });
    const next = pendientes.find((o) => o.id !== orderId);
    setSelectedId(next?.id ?? null);
    setTab("pedidos");
  };

  const marcarCompletado = async (orderId: string) => {
    await updateDoc(doc(db, "orders", orderId), {
      estado: "completado",
      completadoEn: Date.now(),
    });
  };

  // ---- lookups para encontrar el producto de cada item ----
  const normKey = (s: string) => s?.toLowerCase?.().trim().replace(/\s+/g, " ") ?? "";

  const prodById = useMemo(() => {
    const m: Record<string, any> = {};
    for (const p of productos) m[String(p.id)] = p;
    return m;
  }, [productos]);

  const prodByName = useMemo(() => {
    const m: Record<string, any> = {};
    for (const p of productos) m[normKey(p?.nombre || "")] = p;
    return m;
  }, [productos]);

  const findProductForItem = (it: AnyItem) => {
    // soporta orders nuevas (productId o id) y antiguas (match por nombre)
    const pid = (it as any).productId ?? (it as any).id;
    if (pid && prodById[pid]) return prodById[pid];
    const n = (it as any).nombre ?? (it as any).name;
    if (n && prodByName[normKey(String(n))]) return prodByName[normKey(String(n))];
    return null;
  };

  const getOrderItemImage = (it: AnyItem) => {
    const p = findProductForItem(it);
    return p ? getProductImage(p) : null; // respeta imageKey / url / fallbacks por categoría
  };

  const OrderCardMini = ({ o }: { o: OrderDoc }) => {
    const total = typeof o.subtotal === "number"
      ? o.subtotal
      : (o.items || []).reduce((s, it) => s + norm(it).subtotal, 0);
    const totalItems = (o.items || []).length; // número de productos

    const folioStr = `#${stableFolio(o)}`;
    return (
      <Pressable
        onPress={() => { setSelectedId(o.id); setTab("pago"); }}
        style={styles.miniCard}
      >
        <Text style={styles.miniTitle}>
          {`${folioStr} ${getCustomerName(o)}`.trim()}
        </Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles.badgeTime]}><Text style={styles.badgeText}>•</Text></View>
          <Text style={styles.metaText}>{totalItems} prod.</Text>
          <Text style={styles.metaText}>{money(total)}</Text>
        </View>
      </Pressable>
    );
  };

  const renderPago = () => {
    if (!currentForPay) return <Text style={styles.emptyText}>No hay pedidos pendientes.</Text>;

    const o = currentForPay;
    const rawItems = o.items || [];
    const items = rawItems.map(norm);
    const subtotal = typeof o.subtotal === "number" ? o.subtotal : items.reduce((s, it) => s + it.subtotal, 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    const totalItems = items.length; // número de productos
    const folioStr = `Orden ${stableFolio(o)}`;

    return (
      <View style={styles.payWrap}>
        <Text style={styles.customerName}>{getCustomerName(o)}</Text>
        <Text style={styles.orderFolio}>{folioStr}</Text>

        {rawItems.map((raw, idx) => {
          const it = items[idx];               // normalizado (qty/price/subtotal)
          const imgSrc = getOrderItemImage(raw);
          return (
            <View key={idx} style={styles.itemRow}>
              {imgSrc ? (
                <Image source={imgSrc} style={styles.circleImg} resizeMode="cover" />
              ) : (
                <View style={styles.circleImgStub} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemMetaText}>{`${it.qty.toFixed(3)} Kg`}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.itemMetaText}>{money(it.price)}</Text>
                <Text style={styles.itemMetaText}>{money(it.subtotal)}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.divider} />
        <Text style={styles.totalLine}>Total {money(total)} mxn</Text>
        <Text style={styles.totalDetail}>IVA incluido {money(iva)}</Text>
        <Text style={styles.totalDetail}>{totalItems} productos</Text>

        <View style={styles.payRow}>
          <Pressable style={styles.payBtn} onPress={() => marcarPagado(o.id, "efectivo")}>
            <Text style={styles.payIcon}>💵</Text>
            <Text style={styles.payLabel}>Efectivo</Text>
          </Pressable>
          <Pressable style={styles.payBtn} onPress={() => marcarPagado(o.id, "tarjeta")}>
            <Text style={styles.payIcon}>💳</Text>
            <Text style={styles.payLabel}>Tarjeta</Text>
          </Pressable>
          <Pressable style={styles.payBtn} onPress={() => marcarPagado(o.id, "ambos")}>
            <Text style={styles.payIcon}>💱</Text>
            <Text style={styles.payLabel}>Ambos</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderPagados = () => {
    if (!pagados.length) return <Text style={styles.emptyText}>No hay pedidos por completar.</Text>;
    return (
      <FlatList
        data={pagados}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const folioStr = `#${stableFolio(item)}`;
          return (
            <View style={styles.ticket}>
              <Text style={styles.ticketTitle}>
                {`${folioStr} ${getCustomerName(item)}`.trim()}
              </Text>
              {(item.items || []).slice(0, 3).map((it, idx) => {
                const n = norm(it);
                return (
                  <Text key={idx} style={styles.ticketLine}>
                    {`${n.name} · ${n.qty.toFixed(3)}kg`}
                  </Text>
                );
              })}
              <View style={styles.ticketActions}>
                <Pressable style={styles.completeBtn} onPress={() => marcarCompletado(item.id)}>
                  <Text style={styles.completeText}>Marcar completado</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    );
  };

  const renderCompletados = () => {
    if (!completados.length) return <Text style={styles.emptyText}>Aún no hay completados.</Text>;
    return (
      <FlatList
        data={completados}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const folioStr = `#${stableFolio(item)}`;
          const totalConIva =
            typeof item.subtotal === "number"
              ? item.subtotal * 1.16
              : (item.items || []).reduce((s, i) => s + norm(i).subtotal, 0) * 1.16;
          return (
            <View style={styles.historyRow}>
              <Text style={styles.historyTitle}>
                {`${folioStr} ${getCustomerName(item)}`.trim()}
              </Text>
              <Text style={styles.historyMeta}>{money(totalConIva)}</Text>
              <Text style={styles.historyMetaSmall}>
                Método: {item.metodoPago ?? "—"}
              </Text>
            </View>
          );
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topDecor} />
      <Text style={styles.headerTitle}>Pedidos</Text>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("pago")} style={[styles.tabChip, tab === "pago" && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === "pago" && styles.tabLabelActive]}>Pago</Text>
        </Pressable>
        <Pressable onPress={() => setTab("pedidos")} style={[styles.tabChip, tab === "pedidos" && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === "pedidos" && styles.tabLabelActive]}>Pedidos</Text>
        </Pressable>
        <Pressable onPress={() => setTab("completado")} style={[styles.tabChip, tab === "completado" && styles.tabActive]}>
          <Text style={[styles.tabLabel, tab === "completado" && styles.tabLabelActive]}>Completado</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {tab === "pago" && (
          <>
            {pendientes.length > 0 && (
              <FlatList
                horizontal
                data={pendientes}
                keyExtractor={(o) => o.id}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <OrderCardMini o={item} />}
                style={{ maxHeight: 96 }}
              />
            )}
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {renderPago()}
            </View>
          </>
        )}

        {tab === "pedidos" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {renderPagados()}
          </View>
        )}

        {tab === "completado" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {renderCompletados()}
          </View>
        )}
      </View>
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
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  tabs: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: "#DADADA",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  tabActive: { backgroundColor: "#FFEB86", borderColor: "#FFEB86" },
  tabLabel: { color: "#333" },
  tabLabelActive: { fontWeight: "700" },

  miniCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    minWidth: 200,
  },
  miniTitle: { fontWeight: "700", color: "#111", marginBottom: 6 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTime: { backgroundColor: "#D9E7FF" },
  badgeText: { color: "#3A6DFF", fontWeight: "700" },
  metaText: { color: "#555" },

  payWrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  customerName: { fontWeight: "700", fontSize: 18, color: "#111" },
  orderFolio: { color: "#666", marginBottom: 10 },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  circleImgStub: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EEE" },
  circleImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EEE" }, // <— nueva imagen circular
  itemName: { color: "#222", fontWeight: "600" },
  itemMetaText: { color: "#555", fontSize: 12 },

  divider: { height: 1, backgroundColor: "#E5E55", marginTop: 6, marginBottom: 6 },

  totalLine: { textAlign: "center", fontWeight: "700", fontSize: 18, color: "#111", marginTop: 4 },
  totalDetail: { textAlign: "center", color: "#666" },

  payRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  payBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 6,
  },
  payIcon: { fontSize: 28, marginBottom: 8 },
  payLabel: { color: "#000", fontWeight: "600" },

  ticket: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  ticketTitle: { fontWeight: "700", color: "#111", marginBottom: 8 },
  ticketLine: { color: "#333", paddingVertical: 2 },
  ticketActions: { marginTop: 10, alignItems: "flex-end" },
  completeBtn: { backgroundColor: "#000", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  completeText: { color: "#fff", fontWeight: "700" },

  historyRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E3E3E3",
  },
  historyTitle: { fontWeight: "700", color: "#111" },
  historyMeta: { color: "#333", marginTop: 4 },
  historyMetaSmall: { color: "#666", marginTop: 2, fontSize: 12 },

  emptyText: { color: "#666", textAlign: "center", marginTop: 20 },
});


