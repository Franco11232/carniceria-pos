import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen({ setRole }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (email === "admin@smartorder.com" && password === "123456") {
      setRole("admin");
    } else if (email === "carnicero@smartorder.com" && password === "1234") {
      setRole("carnicero");
    } else {
      Alert.alert("Error", "Usuario o contraseña inválida");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.root}
    >
      {/* HEADER ROJO */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Iniciar Sesión</Text>
      </View>

      {/* CUERPO BLANCO */}
      <View style={styles.sheet}>
        <View style={styles.content}>
          {/* INPUTS */}
          <TextInput
            placeholder="Correo"
            placeholderTextColor="#4A4A4A"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor="#4A4A4A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[styles.input, { marginBottom: 12 }]}
          />

          {/* LINK “OLVIDÉ” */}
          <TouchableOpacity style={styles.linkRightHitbox}>
            <Text style={styles.linkRight}>Olvidé la contraseña</Text>
          </TouchableOpacity>

          {/* BOTÓN NEGRO */}
          <Pressable onPress={handleLogin} style={styles.cta}>
            <Text style={styles.ctaText}>Entrar</Text>
          </Pressable>

          {/* SOPORTE */}
          <TouchableOpacity style={styles.supportHitbox}>
            <Text style={styles.support}>Contacto a soporte</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // fondo rojo total
  root: {
    flex: 1,
    backgroundColor: "#F53B2F",
  },

  // header rojo con padding inferior
  header: {
    height: 180,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "#F53B2F",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },

  // sábana blanca con bordes redondeados arriba
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
  },

  // contenido centrado y ancho controlado
  content: {
    alignSelf: "center",
    width: "88%",
    maxWidth: 360,
  },

  // inputs grises redondeados
  input: {
    backgroundColor: "#E0E0E0",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: "#000",
    marginBottom: 12,
  },

  // enlace "Olvidé..." alineado a la derecha
  linkRightHitbox: { alignSelf: "flex-end", marginBottom: 28 },
  linkRight: {
    color: "#333",
    textDecorationLine: "underline",
    fontSize: 14,
  },

  // botón negro ancho y redondeado
  cta: {
    backgroundColor: "#000000",
    borderRadius: 18,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  // enlace soporte centrado al final
  supportHitbox: { alignSelf: "center" },
  support: {
    color: "#4A4A4A",
    textDecorationLine: "underline",
    fontSize: 14,
  },
});

