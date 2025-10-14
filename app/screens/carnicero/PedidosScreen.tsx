// app/screens/carnicero/PedidosScreen.tsx
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../firebase/config";

// ====== Tipos tolerantes (dos esquemas de items) ======
type ItemA = { productId?: string; nombre: string; cantidad: number; precio: number; subtotal?: number };
type ItemB = { id?: string; name: string; qtyKg: number; priceKg: number; subtotal?: number };
type AnyItem = ItemA | ItemB;

type OrderDoc = {
  id: string;
  cliente?: string;
  folio?: string | number;
  createdAt?: number;
  estado?: "pendiente" | "cocina" | "pagado" | "completado";
  metodoPago?: "efectivo" | "tarjeta" | "ambos";
  subtotal?: number;
  items: AnyItem[];
};

// Normaliza un item a un formato único
function norm(it: AnyItem) {
  const name = (it as any).nombre ?? (it as any).name ?? "Producto";
  const qty = (it as any).cantidad ?? (it as any).qtyKg ?? 1;
  const price = (it as any).precio ?? (it as any).priceKg ?? 0;
  const subtotal = (it as any).subtotal ?? Number(qty) * Number(price);
  return { name: String(name), qty: Number(qty), price: Number(price), subtotal: Number(subtotal) };
}

// Utilidad
const money = (n: number) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 1,
  });

type TabKey = "pago" | "pedidos" | "completado";

export default function PedidosScreen() {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [tab, setTab] = useState<TabKey>("pago");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ====== Carga en tiempo real ======
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderDoc[];
      // Orden cronológico (recientes arriba)
      data.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setOrders(data);
      // Seleccionar automáticamente el primero que esté pendiente/cocina en pestaña Pago
      if (!selectedId && data.length) {
        const firstPending = data.find((o) => (o.estado ?? "pendiente") === "pendiente" || o.estado === "cocina");
        setSelectedId(firstPending?.id ?? data[0].id);
      }
    });
    return unsub;
  }, [selectedId]);

  // ====== Derivados por pestaña ======
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

  // ====== Acciones ======
  const marcarPagado = async (orderId: string, metodo: "efectivo" | "tarjeta" | "ambos") => {
    await updateDoc(doc(db, "orders", orderId), {
      estado: "pagado",
      metodoPago: metodo,
      pagadoEn: Date.now(),
    });
    // mover selección al siguiente pendiente
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

  // ====== Render de tarjetas ======
  const OrderCardMini = ({ o }: { o: OrderDoc }) => {
    const total = typeof o.subtotal === "number"
      ? o.subtotal
      : (o.items || []).reduce((s, it) => s + norm(it).subtotal, 0);
    const totalItems = (o.items || []).reduce((s, it) => s + norm(it).qty, 0);

    return (
      <Pressable
        onPress={() => { setSelectedId(o.id); setTab("pago"); }}
        style={styles.miniCard}
      >
        <Text style={styles.miniTitle}>{`#${o.folio ?? o.id?.slice(-4)} ${o.cliente ?? ""}`.trim()}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles.badgeTime]}><Text style={styles.badgeText}>•</Text></View>
          <Text style={styles.metaText}>{totalItems} prod.</Text>
          <Text style={styles.metaText}>{money(total)}</Text>
        </View>
      </Pressable>
    );
  };

  // ====== Vista de detalle (pestaña PAGO) ======
  const renderPago = () => {
    if (!currentForPay) {
      return <Text style={styles.emptyText}>No hay pedidos pendientes.</Text>;
    }

    const o = currentForPay;
    const items = (o.items || []).map(norm);
    const subtotal = typeof o.subtotal === "number" ? o.subtotal : items.reduce((s, it) => s + it.subtotal, 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    const totalItems = items.reduce((s, it) => s + it.qty, 0);

    return (
      <View style={styles.payWrap}>
        <Text style={styles.customerName}>{o.cliente ?? "Cliente"}</Text>
        <Text style={styles.orderFolio}>{`Orden #${o.folio ?? o.id?.slice(-6)}`}</Text>

        {/* Lista de productos del pedido */}
        {items.map((it, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.circleImgStub} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.name}</Text>
              <Text style={styles.itemMetaText}>{`${it.qty.toFixed(3)} Kg`}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.itemMetaText}>{money(it.price)}</Text>
              <Text style={styles.itemMetaText}>{money(it.subtotal)}</Text>
            </View>
          </View>
        ))}

        {/* Totales */}
        <View style={styles.divider} />
        <Text style={styles.totalLine}>Total {money(total)} mxn</Text>
        <Text style={styles.totalDetail}>IVA incluido {money(iva)}</Text>
        <Text style={styles.totalDetail}>{totalItems} productos</Text>

        {/* Métodos de pago */}
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

  // ====== Vista de lista: pagados (en preparación/entrega) ======
  const renderPagados = () => {
    if (!pagados.length) return <Text style={styles.emptyText}>No hay pedidos por completar.</Text>;
    return (
      <FlatList
        data={pagados}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.ticket}>
            <Text style={styles.ticketTitle}>{`#${item.folio ?? item.id.slice(-6)} ${item.cliente ?? ""}`}</Text>
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
        )}
      />
    );
  };

  // ====== Vista historial completados ======
  const renderCompletados = () => {
    if (!completados.length) return <Text style={styles.emptyText}>Aún no hay completados.</Text>;
    return (
      <FlatList
        data={completados}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <Text style={styles.historyTitle}>{`#${item.folio ?? item.id.slice(-6)} ${item.cliente ?? ""}`}</Text>
            <Text style={styles.historyMeta}>
              {money(
                typeof item.subtotal === "number"
                  ? item.subtotal * 1.16
                  : (item.items || []).reduce((s, i) => s + norm(i).subtotal, 0) * 1.16
              )}
            </Text>
            <Text style={styles.historyMetaSmall}>
              Método: {item.metodoPago ?? "—"}
            </Text>
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* decor rojo */}
      <View style={styles.topDecor} />

      {/* Header + pestañas */}
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

      {/* Contenido por pestaña */}
      <View style={{ flex: 1 }}>
        {tab === "pago" && (
          <>
            {/* lista lateral mini (pendientes) */}
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
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>{renderPago()}</View>
          </>
        )}

        {tab === "pedidos" && <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>{renderPagados()}</View>}
        {tab === "completado" && <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>{renderCompletados()}</View>}
      </View>
    </SafeAreaView>
  );
}

// ====== Estilos ======
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
  tabActive: {
    backgroundColor: "#FFEB86",
    borderColor: "#FFEB86",
  },
  tabLabel: { color: "#333" },
  tabLabelActive: { fontWeight: "700" },

  // mini cards (pendientes)
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
    minWidth: 180,
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

  // detalle pago
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
  circleImgStub: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEE",
  },
  itemName: { color: "#222", fontWeight: "600" },
  itemMetaText: { color: "#555", fontSize: 12 },

  divider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginTop: 6,
    marginBottom: 6,
  },

  totalLine: { textAlign: "center", fontWeight: "700", fontSize: 18, color: "#111", marginTop: 4 },
  totalDetail: { textAlign: "center", color: "#666" },

  payRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
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

  // tickets pagados
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
  completeBtn: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  completeText: { color: "#fff", fontWeight: "700" },

  // historial
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

  // vacíos
  emptyText: { color: "#666", textAlign: "center", marginTop: 20 },
});

