import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function OrdersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Órdenes 📋</Text>
      <Text style={styles.subtitle}>
        Aquí aparecerán las órdenes generadas por los clientes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e67e22",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginTop: 8,
  },
});
