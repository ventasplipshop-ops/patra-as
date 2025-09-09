// src/utils/calculations.ts
import type { Payment } from "./types";
import type { CartItem } from "../context/CartContext";


/**
 * Calcula el subtotal total del carrito.
 */
export const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
};

export const calculateTax = (subtotal: number, taxRate: number = 0): number => {
  return subtotal * taxRate;
};

export const calculateTotal = (
  subtotal: number,
  discount: number = 0,
  tax: number = 0
): number => {
  return subtotal - discount + tax;
};

export const calculateTotalPayments = (payments: Payment[]): number => {
  return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
};

export const arePaymentsSufficient = (
  payments: Payment[],
  total: number
): boolean => {
  return calculateTotalPayments(payments) >= total;
};

export const calculateRemainingBalance = (
  payments: Payment[],
  total: number
): number => {
  return total - calculateTotalPayments(payments);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
};

/** ================================
 *  Calcular pagos de consignas
 *  ================================ */
export interface ConsignaPago {
  id: number;
  metodo: string;
  monto: number | string; // viene de supabase como string
  created_at: string;
}

export const calculateConsignaPayments = (pagos: ConsignaPago[]): number => {
  if (!pagos || pagos.length === 0) return 0;
  return pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
};