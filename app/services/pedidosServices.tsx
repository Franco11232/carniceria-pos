import { addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';

const pedidosRef = collection(db, 'pedidos');

// Escucha en tiempo real
export const escucharPedidos = (callback: (arg0: { id: string; }[]) => void) => {
  const q = query(pedidosRef, orderBy('fecha', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
  return unsubscribe;
};

// Agregar nuevo pedido
export const agregarPedido = async (pedido: any) => {
  await addDoc(pedidosRef, pedido);
};
