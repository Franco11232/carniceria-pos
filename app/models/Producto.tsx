//Producto.tsx
export interface Product
{
    id?: string;
    nombre: string;
    precio: number;
    categoria: string;
    descripcion?: string;
    image?: string;
    promo?: boolean;
}