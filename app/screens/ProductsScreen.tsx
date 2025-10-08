import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { db } from "../firebase/config";

export default function ProductsScreen() {
  const [productos, setProductos] = useState<any[]>([]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProductos(data);
      } catch (error) {
        console.error("Error al obtener productos:", error);
      }
    };

    fetchProductos();
  }, []);

  return (
    <View>
      <Text>Lista de productos:</Text>
      {productos.map((p) => (
        <Text key={p.id}>{p.nombre}</Text>
      ))}
    </View>
  );
}
