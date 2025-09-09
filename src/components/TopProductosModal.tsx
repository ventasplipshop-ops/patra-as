import { useState, useEffect } from "react";
import { performAction } from "../actions/performAction";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TopProductosModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TopProductosModal({ open, onClose }: TopProductosModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [modo, setModo] = useState<"cantidad" | "importe">("cantidad");

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    const res = await performAction("getTopProductos", { limit: 10 });
    if (res.ok) setData(res.productos);
  };

  if (!open) return null;

  const colors = [
    "#2563eb",
    "#16a34a",
    "#f97316",
    "#dc2626",
    "#9333ea",
    "#0891b2",
    "#f59e0b",
    "#84cc16",
    "#ec4899",
    "#06b6d4",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[900px] h-[600px] shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">📊 Top 10 productos más vendidos (Mes)</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setModo("cantidad")}
              className={`px-3 py-1 rounded border text-sm ${
                modo === "cantidad"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-700"
              }`}
            >
              Cantidad 🛒
            </button>
            <button
              onClick={() => setModo("importe")}
              className={`px-3 py-1 rounded border text-sm ${
                modo === "importe"
                  ? "bg-green-600 text-white"
                  : "bg-white dark:bg-gray-700"
              }`}
            >
              Importe 💵
            </button>
          </div>
        </div>

        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="nombre"
                angle={-30}
                textAnchor="end"
                interval={0}
                height={80}
              />
              <YAxis />
              <Tooltip formatter={(val: number) => (modo === "importe" ? `$${val}` : val)} />
              <Bar
                dataKey={modo}
                animationDuration={2000}
                isAnimationActive
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
