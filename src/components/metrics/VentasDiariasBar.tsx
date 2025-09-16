import { useEffect, useState } from "react";
import { performAction } from "../../actions/performAction";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface VentaDiaria {
  fecha: string;
  cantidad_ventas: number;
  monto_total: number;
  ticket_promedio: number;
}

export default function VentasDiariasBar() {
  const [rows, setRows] = useState<VentaDiaria[]>([]);

  useEffect(() => {
    (async () => {
      const res = await performAction("getVentasDiarias", undefined);
      if (res.ok) {
        // Solo últimos 14 días
        const data = res.ventas.slice(0, 14).reverse();
        setRows(data);
      }
    })();
  }, []);

  return (
    <div className="rounded-xl border shadow bg-white p-4">
      <h2 className="text-lg font-semibold mb-4">📅 Ventas diarias (últimos 14 días)</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="fecha"
            tickFormatter={(v) => {
              const d = new Date(v);
              return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
            }}
          />
          <YAxis />
          <Tooltip
            formatter={(val: number) => `$${val.toLocaleString()}`}
            labelFormatter={(label) => {
              const d = new Date(label);
              return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
            }}
          />
          <Bar dataKey="monto_total" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
