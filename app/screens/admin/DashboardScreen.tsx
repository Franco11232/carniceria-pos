// app/screens/admin/DashboardScreen.tsx
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../firebase/config";

// --- Tipos tolerantes a ambos esquemas de items ---
type OrderItemA = { nombre: string; cantidad: number; precio: number; subtotal?: number };
type OrderItemB = { name: string; qtyKg: number; priceKg: number; subtotal?: number };
type AnyOrderItem = OrderItemA | OrderItemB;

type PedidoDoc = {
  id: string;
  subtotal?: number;
  items?: AnyOrderItem[];
  createdAt?: number | { seconds: number };
};

function normalizeItem(it: AnyOrderItem) {
  const name = (it as any).nombre ?? (it as any).name ?? "Producto";
  const qty = (it as any).cantidad ?? (it as any).qtyKg ?? 1;
  const price = (it as any).precio ?? (it as any).priceKg ?? 0;
  const subtotal = (it as any).subtotal ?? Number(qty) * Number(price);
  return { name: String(name), qty: Number(qty), price: Number(price), subtotal: Number(subtotal) };
}

function tsToDate(createdAt: PedidoDoc["createdAt"]): Date | null {
  if (!createdAt) return null;
  if (typeof createdAt === "number") return new Date(createdAt);
  if (typeof (createdAt as any).seconds === "number") return new Date((createdAt as any).seconds * 1000);
  return null;
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // lunes=0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function shortDay(d: Date) { return String(d.getDate()).padStart(2, "0"); }
function monthName(d: Date) { return MONTHS_ES[d.getMonth()]; }
function yyyymm(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function formatMoney(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

type Metric = "ventas" | "pedidos";
type RangeMode = "semana" | "trimestre" | "mes";

export default function DashboardScreen() {
  const [orders, setOrders] = useState<PedidoDoc[]>([]);
  const [totalVendido, setTotalVendido] = useState(0);
  const [productoMasVendido, setProductoMasVendido] = useState<string | null>(null);
  const [numPedidos, setNumPedidos] = useState(0);
  const [loading, setLoading] = useState(true);

  const [openMetric, setOpenMetric] = useState<Metric | null>(null);
  const [range, setRange] = useState<RangeMode>("semana");
  const [periodOffset, setPeriodOffset] = useState(0); // 0 actual, -1 anterior, +1 siguiente

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PedidoDoc[];
      setOrders(docs);

      const total = docs.reduce((acc, p) => {
        if (typeof p.subtotal === "number") return acc + p.subtotal;
        const s = (p.items ?? []).reduce((sum, it) => sum + normalizeItem(it).subtotal, 0);
        return acc + s;
      }, 0);
      setTotalVendido(total);

      const counter: Record<string, number> = {};
      docs.forEach((p) => (p.items ?? []).forEach((it) => {
        const n = normalizeItem(it);
        counter[n.name] = (counter[n.name] ?? 0) + n.qty;
      }));
      const top = Object.entries(counter).sort((a, b) => b[1] - a[1])[0];
      setProductoMasVendido(top ? top[0] : "N/A");

      setNumPedidos(docs.length);
      setLoading(false);
    });
    return unsub;
  }, []);

  const ventasSeries = useMemo(
    () => makeSeries(orders, "ventas", range, periodOffset),
    [orders, range, periodOffset]
  );
  const pedidosSeries = useMemo(
    () => makeSeries(orders, "pedidos", range, periodOffset),
    [orders, range, periodOffset]
  );

  useEffect(() => { setPeriodOffset(0); }, [range]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F53B2F" />
        <Text style={{ color: "#555", marginTop: 10 }}>Cargando datos...</Text>
      </View>
    );
  }

  const active = openMetric === "ventas" ? ventasSeries : pedidosSeries;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topDecor} />

      {/* Scroll vertical para que la gráfica nunca se corte */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Panel de Ventas</Text>

        {/* Cards métricas */}
        <View style={styles.metricsContainer}>
          <Pressable
            onPress={() => setOpenMetric(openMetric === "ventas" ? null : "ventas")}
            style={[styles.card, styles.card1]}
          >
            <Text style={styles.label}>💰 Total Vendido</Text>
            <Text style={styles.value}>{formatMoney(totalVendido)}</Text>
          </Pressable>

          <View style={[styles.card, styles.card2]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.label}>🔥 Más Vendido</Text>
              <Text style={styles.linkMuted}>ver top 5</Text>
            </View>
            <Text style={styles.value}>{productoMasVendido ?? "N/A"}</Text>
          </View>

          <Pressable
            onPress={() => setOpenMetric(openMetric === "pedidos" ? null : "pedidos")}
            style={[styles.card, styles.card3]}
          >
            <Text style={styles.label}>📦 Pedidos</Text>
            <Text style={styles.value}>{numPedidos}</Text>
          </Pressable>
        </View>

        {openMetric && (
          <View style={styles.panel}>
            {/* Toggle de rango */}
            <View style={styles.rangeRow}>
              <Pressable
                onPress={() => setRange("semana")}
                style={[styles.rangeBtn, range === "semana" && styles.rangeBtnActive]}
              >
                <Text style={[styles.rangeText, range === "semana" && styles.rangeTextActive]}>
                  Semanal
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRange("trimestre")}
                style={[styles.rangeBtn, range === "trimestre" && styles.rangeBtnActive]}
              >
                <Text style={[styles.rangeText, range === "trimestre" && styles.rangeTextActive]}>
                  Trimestral
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRange("mes")}
                style={[styles.rangeBtn, range === "mes" && styles.rangeBtnActive]}
              >
                <Text style={[styles.rangeText, range === "mes" && styles.rangeTextActive]}>
                  Anual
                </Text>
              </Pressable>
            </View>

            {/* Navegación por periodo */}
            <PeriodHeader
              mode={range}
              header={active.header}
              onPrev={() => setPeriodOffset((x) => x - 1)}
              onNext={() => setPeriodOffset((x) => x + 1)}
            />

            {/* Total del periodo */}
            <Text style={styles.totalLabel}>
              Total {openMetric === "ventas" ? "vendido" : "pedidos"}:{" "}
              <Text style={styles.totalValue}>
                {openMetric === "ventas" ? formatMoney(active.total) : active.total.toLocaleString("es-MX")}
              </Text>
            </Text>

            {/* Gráfica */}
            <BarChart
              data={active.data}
              unit={openMetric === "ventas" ? "MXN" : "pedidos"}
              mode={range}
              showValues
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Construye series y encabezados según modo y offset */
function makeSeries(
  orders: PedidoDoc[],
  metric: Metric,
  mode: RangeMode,
  offset: number
) {
  const rows = orders
    .map((o) => {
      const d = tsToDate(o.createdAt);
      return d ? { d, o } : null;
    })
    .filter(Boolean) as { d: Date; o: PedidoDoc }[];

  const valOf = (o: PedidoDoc) =>
    metric === "ventas"
      ? (typeof o.subtotal === "number"
          ? o.subtotal
          : (o.items ?? []).reduce((s, it) => s + normalizeItem(it).subtotal, 0))
      : 1;

  if (mode === "semana") {
    // Semana (Lun–Dom) con offset
    const baseMonday = startOfWeekMonday(new Date());
    const start = addDays(baseMonday, offset * 7);
    const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    const map = new Map<string, number>(days.map((d) => [d.toDateString(), 0]));
    rows.forEach(({ d, o }) => {
      const dd = new Date(d); dd.setHours(0, 0, 0, 0);
      const key = dd.toDateString();
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + valOf(o));
    });

    const data = days.map((d) => ({
      label: shortDay(d),             // 01, 02...
      value: map.get(d.toDateString()) ?? 0,
    }));

    // Encabezado: nombre del mes del lunes
    const header = monthName(start);

    const total = data.reduce((a, b) => a + b.value, 0);
    return { data, header, total };
  }

  if (mode === "trimestre") {
    // 12 semanas (aprox. 3 meses) desde lunes base + offset*12
    const baseMonday = startOfWeekMonday(new Date());
    const start = addDays(baseMonday, offset * 12 * 7);

    const weeks: { start: Date; end: Date }[] = Array.from({ length: 12 }, (_, i) => {
      const s = addDays(start, i * 7);
      const e = addDays(s, 6);
      return { start: s, end: e };
    });

    const sums = weeks.map(({ start, end }) => {
      let sum = 0;
      rows.forEach(({ d, o }) => {
        const dd = new Date(d); dd.setHours(0, 0, 0, 0);
        if (dd >= start && dd <= end) sum += valOf(o);
      });
      return { start, value: sum };
    });

    const data = sums.map((w) => ({
      // etiqueta: dd/MM del lunes de semana
      label: `${String(w.start.getDate()).padStart(2, "0")}/${String(w.start.getMonth() + 1).padStart(2, "0")}`,
      value: w.value,
    }));

    // Encabezado: rango de meses + año (p. ej. "Ago–Oct 2025")
    const first = weeks[0].start;
    const last = weeks[weeks.length - 1].end;
    const header = `${MONTHS_ES[first.getMonth()].slice(0,3)}–${MONTHS_ES[last.getMonth()].slice(0,3)} ${last.getFullYear()}`;

    const total = data.reduce((a, b) => a + b.value, 0);
    return { data, header, total };
  }

  // mode === "mes" (año completo con 12 meses, offset por año)
  const now = new Date();
  const year = now.getFullYear() + offset;
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  const map = new Map<string, number>(months.map((d) => [yyyymm(d), 0]));
  rows.forEach(({ d, o }) => {
    if (d.getFullYear() !== year) return;
    const key = yyyymm(d);
    map.set(key, (map.get(key) ?? 0) + valOf(o));
  });

  const data = months.map((d) => ({
    label: MONTHS_ES[d.getMonth()], // nombre del mes (se pinta vertical)
    value: map.get(yyyymm(d)) ?? 0,
  }));

  const header = String(year);
  const total = data.reduce((a, b) => a + b.value, 0);
  return { data, header, total };
}

/** Header con flechas <  header  > */
function PeriodHeader({
  mode,
  header,
  onPrev,
  onNext,
}: {
  mode: RangeMode;
  header: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.periodHeader}>
      <Pressable onPress={onPrev} hitSlop={8}><Text style={styles.chev}>{`<`}</Text></Pressable>
      <Text style={styles.periodTitle}>{header}</Text>
      <Pressable onPress={onNext} hitSlop={8}><Text style={styles.chev}>{`>`}</Text></Pressable>
    </View>
  );
}

/** Gráfica de barras con valores visibles arriba */
function BarChart({
  data,
  unit,
  mode,
  showValues = true,
}: {
  data: { label: string; value: number }[];
  unit: string;
  mode: RangeMode;
  showValues?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={chartStyles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={chartStyles.row}>
          {data.map((d, i) => {
            const h = Math.max(2, Math.round((d.value / max) * 140));
            return (
              <View key={i} style={chartStyles.col}>
                {showValues && (
                  <Text style={chartStyles.valAbove}>
                    {formatMoney(d.value)}
                  </Text>
                )}
                <View style={[chartStyles.bar, { height: h }]} />
                {mode === "semana" ? (
                  <Text style={chartStyles.tickDay}>{d.label}</Text>
                ) : mode === "trimestre" ? (
                  <Text style={chartStyles.tickWeek}>{d.label}</Text>
                ) : (
                  <View style={{ height: 36, justifyContent: "flex-start" }}>
                    <Text style={chartStyles.tickMonthVertical} numberOfLines={1}>
                      {d.label}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Text style={chartStyles.legend}>
        Máx: {Math.max(...data.map((d) => d.value)).toLocaleString("es-MX")} {unit}
      </Text>
    </View>
  );
}

/* === Estilos === */
const chartStyles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "flex-end" },
  col: { alignItems: "center", marginHorizontal: 8 },
  bar: {
    width: 22,
    backgroundColor: "#2563EB", // azul
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  valAbove: {
    marginBottom: 6,
    fontSize: 11,
    color: "#0f172a",
    fontWeight: "700",
  },
  tickDay: { marginTop: 6, fontSize: 11, color: "#555" },
  tickWeek: { marginTop: 6, fontSize: 11, color: "#555" },
  tickMonthVertical: {
    fontSize: 11,
    color: "#555",
    transform: [{ rotate: "-90deg" }],
    textAlign: "center",
    width: 28,
  },
  legend: { marginTop: 8, fontSize: 12, color: "#777", textAlign: "right" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Contenido scrolleable (para que la gráfica no se corte)
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 160, // espacio extra al final
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },

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

  title: { fontSize: 26, fontWeight: "700", color: "#111", marginBottom: 25, textAlign: "center", zIndex: 1 },

  metricsContainer: { gap: 18 },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  card1: { borderLeftWidth: 5, borderLeftColor: "#27ae60" },
  card2: { borderLeftWidth: 5, borderLeftColor: "#e67e22" },
  card3: { borderLeftWidth: 5, borderLeftColor: "#3498db" },

  label: { fontSize: 16, color: "#333", marginBottom: 4 },
  value: { fontSize: 22, fontWeight: "700", color: "#000" },

  panel: { marginTop: 16, gap: 12, marginBottom: 20 },

  rangeRow: { flexDirection: "row", gap: 10 },
  rangeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    backgroundColor: "#fff",
  },
  rangeBtnActive: { backgroundColor: "#FFEB86", borderColor: "#FFEB86" },
  rangeText: { color: "#333" },
  rangeTextActive: { color: "#111", fontWeight: "700" },

  periodHeader: {
    marginTop: 6,
    marginBottom: 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  chev: { fontSize: 20, fontWeight: "700", color: "#111" },
  periodTitle: { fontSize: 16, fontWeight: "700", color: "#111" },

  totalLabel: { textAlign: "center", color: "#374151", marginBottom: 6 },
  totalValue: { fontWeight: "800", color: "#0f172a" },

  linkMuted: { color: "#777", fontSize: 12 },
});
