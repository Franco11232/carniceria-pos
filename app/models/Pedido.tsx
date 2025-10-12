//Pedido.tsx
export default interface Pedido {
  id?: string;
  userId: string;
  items :{
    productId: string;
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }[];
  subtotal: number;
  estado: 'cocina' | 'entregado';
  fecha?: string;

}
