import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido 👋</Text>
      <Text style={styles.subtitle}>Esta es la pantalla principal.</Text>
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
    fontSize: 26,
    fontWeight: "bold",
    color: "#e67e22",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginTop: 8,
  },
});
