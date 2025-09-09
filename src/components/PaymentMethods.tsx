import React, { useState, useEffect } from "react";
import { DollarSign, CreditCard, Send } from "lucide-react";
import type { PaymentMethod, Payment } from "../actions/types";
import { formatCurrency } from "../actions/calculations";

interface PaymentMethodsProps {
  total: number;
  onChange: (payments: Payment[]) => void;
  resetTrigger?: number;
}

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  total,
  resetTrigger,
  onChange,
}) => {
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<Record<PaymentMethod, number>>({
  efectivo: 0,
  tarjeta: 0,
  transferencia: 0,
  uala: 0,
  brubank: 0,
} as Record<PaymentMethod, number>);

  const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
    efectivo: <DollarSign size={18} />,
    tarjeta: <CreditCard size={18} />,
    transferencia: <Send size={18} />,
    uala: <span>🦧</span>,
    brubank: <span>🏦</span>,
  };

  const paymentLabels: Record<PaymentMethod, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
    uala: "Ualá",
    brubank: "Brubank",
  };

  // 🔄 Reset
  // 🔄 Reset
  useEffect(() => {
    const empty: Record<PaymentMethod, number> = {
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      uala: 0,
      brubank: 0,
    };

    setSelectedMethods([]);
    setPayments(empty);

    // 👇 Avisar arriba (CajaView) que no hay pagos
    onChange([]);
  }, [resetTrigger]);

  // 🔄 Notificar arriba
  useEffect(() => {
    const list: Payment[] = selectedMethods.map((m) => ({
      method: m,
      amount: payments[m],
    }));
    onChange(list);
  }, [selectedMethods, payments, onChange]);

  const toggleMethod = (method: PaymentMethod) => {
    if (selectedMethods.includes(method)) {
      setSelectedMethods((prev) => prev.filter((m) => m !== method));
      setPayments((prev) => ({ ...prev, [method]: 0 }));
    } else {
      setSelectedMethods((prev) => [...prev, method]);
      if (selectedMethods.length === 0) {
        setPayments((prev) => ({ ...prev, [method]: total }));
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Botones */}
      <div className="flex gap-2 justify-center">
        {(Object.keys(paymentIcons) as PaymentMethod[]).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => toggleMethod(method)}
            className={`px-2 py-1 rounded-lg border text-lg ${
              selectedMethods.includes(method)
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 hover:bg-gray-50"
            }`}
          >
            {paymentIcons[method]}
          </button>
        ))}
      </div>

      {/* Inputs de montos */}
      {selectedMethods.map((method) => (
        <div key={method} className="flex items-center gap-2">
          <span className="w-20">{paymentLabels[method]}</span>
          <input
            type="number"
            min={0}
            value={payments[method]}
            onChange={(e) =>
              setPayments((prev) => ({
                ...prev,
                [method]: parseFloat(e.target.value) || 0,
              }))
            }
            className="flex-1 border rounded px-2 py-1 text-right"
          />
        </div>
      ))}
    </div>
  );
};
