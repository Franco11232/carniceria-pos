// app/screens/admin/DashboardScreen.tsx
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../firebase/config";

// --- Tipos que toleran ambos esquemas de items ---
type OrderItemA = {
  productId?: string;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal?: number;
};

type OrderItemB = {
  id?: string;
  name: string;
  qtyKg: number;
  priceKg: number;
  subtotal?: number;
};

type AnyOrderItem = OrderItemA | OrderItemB;

type PedidoDoc = {
  id: string;
  subtotal?: number;
  items: AnyOrderItem[];
  // ...otros campos opcionales
};

// Normaliza cualquier item a un formato común
function normalizeItem(it: AnyOrderItem) {
  const name = (it as any).nombre ?? (it as any).name ?? "Producto";
  const qty =
    (it as any).cantidad ??
    (it as any).qtyKg ??
    1;
  const price =
    (it as any).precio ??
    (it as any).priceKg ??
    0;
  const subtotal =
    (it as any).subtotal ??
    Number(qty) * Number(price);

  return {
    name: String(name),
    qty: Number(qty),
    price: Number(price),
    subtotal: Number(subtotal),
  };
}

export default function DashboardScreen() {
  const [totalVendido, setTotalVendido] = useState(0);
  const [productoMasVendido, setProductoMasVendido] = useState<string | null>(
    null
  );
  const [numPedidos, setNumPedidos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
      const pedidos: PedidoDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      if (!pedidos.length) {
        setTotalVendido(0);
        setProductoMasVendido(null);
        setNumPedidos(0);
        setLoading(false);
        return;
      }

      // Total vendido (usa subtotal del doc si existe; si no, lo reconstruye desde items)
      const total = pedidos.reduce((acc, p) => {
        if (typeof p.subtotal === "number") return acc + p.subtotal;
        const sub = (p.items || []).reduce(
          (s, it) => s + normalizeItem(it).subtotal,
          0
        );
        return acc + sub;
      }, 0);
      setTotalVendido(total);

      // Conteo de productos (normalizado)
      const counter: Record<string, number> = {};
      pedidos.forEach((p) => {
        (p.items || []).forEach((it) => {
          const n = normalizeItem(it);
          counter[n.name] = (counter[n.name] ?? 0) + n.qty;
        });
      });

      // Top producto
      const top = Object.entries(counter).sort((a, b) => b[1] - a[1])[0];
      setProductoMasVendido(top ? top[0] : "N/A");

      // Total de pedidos
      setNumPedidos(pedidos.length);

      setLoading(false);
    });

    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F53B2F" />
        <Text style={{ color: "#555", marginTop: 10 }}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fondo decorativo */}
      <View style={styles.topDecor} />

      <Text style={styles.title}>Panel de Ventas</Text>

      <View style={styles.metricsContainer}>
        <View style={[styles.card, styles.card1]}>
          <Text style={styles.label}>💰 Total Vendido</Text>
          <Text style={styles.value}>${totalVendido.toFixed(2)}</Text>
        </View>

        <View style={[styles.card, styles.card2]}>
          <Text style={styles.label}>🔥 Más Vendido</Text>
          <Text style={styles.value}>{productoMasVendido ?? "N/A"}</Text>
        </View>

        <View style={[styles.card, styles.card3]}>
          <Text style={styles.label}>📦 Pedidos</Text>
          <Text style={styles.value}>{numPedidos}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Actualizado en tiempo real ✅</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  // Fondo decorativo (semicírculo rojo)
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

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
    marginBottom: 25,
    textAlign: "center",
    zIndex: 1,
  },

  metricsContainer: {
    gap: 18,
  },

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

  card1: {
    borderLeftWidth: 5,
    borderLeftColor: "#27ae60",
  },
  card2: {
    borderLeftWidth: 5,
    borderLeftColor: "#e67e22",
  },
  card3: {
    borderLeftWidth: 5,
    borderLeftColor: "#3498db",
  },

  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
  },
  subtitle: {
    marginTop: 40,
    textAlign: "center",
    color: "#777",
    fontSize: 14,
  },
});
