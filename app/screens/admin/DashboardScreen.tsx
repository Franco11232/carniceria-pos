import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { db } from "../../firebase/config";
import Pedido from "../../models/Pedido";

export default function DashboardScreen() {
  const [totalVendido, setTotalVendido] = useState(0);
  const [productoMasVendido, setProductoMasVendido] = useState<string | null>(null);
  const [numPedidos, setNumPedidos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
      const pedidos: Pedido[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Pedido[];

      if (pedidos.length === 0) {
        setTotalVendido(0);
        setProductoMasVendido(null);
        setNumPedidos(0);
        setLoading(false);
        return;
      }

      // Calcular total vendido
      const total = pedidos.reduce((acc, p) => acc + (p.subtotal || 0), 0);
      setTotalVendido(total);

      // Contar cantidad de productos vendidos
      const contadorProductos: Record<string, number> = {};
      pedidos.forEach((p) => {
        p.items.forEach((item) => {
          contadorProductos[item.nombre] = (contadorProductos[item.nombre] || 0) + item.cantidad;
        });
      });

      // Producto más vendido
      const productoTop = Object.entries(contadorProductos).sort((a, b) => b[1] - a[1])[0];
      setProductoMasVendido(productoTop ? productoTop[0] : "N/A");

      // Total de pedidos
      setNumPedidos(pedidos.length);
      setLoading(false);
    });

    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e67e22" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Dashboard de Ventas</Text>

      <View style={styles.card}>
        <Text style={styles.label}>💰 Total Vendido:</Text>
        <Text style={styles.value}>${totalVendido.toFixed(2)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>🔥 Producto más vendido:</Text>
        <Text style={styles.value}>{productoMasVendido}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>📦 Total de pedidos:</Text>
        <Text style={styles.value}>{numPedidos}</Text>
      </View>

      <Text style={styles.subtitle}>Actualizado en tiempo real ✅</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e67e22",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    marginVertical: 10,
    borderRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 18,
    color: "#333",
  },
  value: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#27ae60",
  },
  subtitle: {
    marginTop: 20,
    textAlign: "center",
    color: "#555",
  },
});
