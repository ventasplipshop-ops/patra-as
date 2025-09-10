import React, { createContext, useContext, useState } from "react";

export interface CartItem {
  id: string; // 👈 ahora string
  sku: string;
  nombre: string;
  precio: number;
  precio_final?: number;
  cantidad: number;
}

interface CartContextType {
  cart: CartItem[];
  total: number;
  clienteId: number | null;
  setClienteId: React.Dispatch<React.SetStateAction<number | null>>;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;          // 👈 corregido
  updateQty: (id: string, qty: number) => void; // 👈 corregido
  clearCart: () => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);

  const addItem = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, cantidad: p.cantidad + item.cantidad } : p
        );
      }
      return [...prev, item];
    });
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((p) => (p.id === id ? { ...p, cantidad: qty } : p))
    );
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, p) => sum + p.precio * p.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        total,
        clienteId,
        setClienteId,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        setCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
