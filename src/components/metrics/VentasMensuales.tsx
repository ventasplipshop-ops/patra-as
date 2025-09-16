import { useEffect, useState } from "react";
import { performAction } from "../../actions/performAction";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ProductoMes {
  mes: string; // viene como timestamp truncado al mes
  sku: string;
  producto: string;
  total_unidades: number;
  total_vendido: number;
}

interface VentaMensual {
  mes: string;
  total_vendido: number;
}

export default function VentasMensuales() {
  const [rows, setRows] = useState<VentaMensual[]>([]);

  useEffect(() => {
    (async () => {
      const res = await performAction("getProductosPorMes", undefined);
      if (res.ok) {
        // agrupar ventas por mes (sumar todos los productos del mismo mes)
        const grouped: Record<string, number> = {};
        res.productos.forEach((p: ProductoMes) => {
          const mes = p.mes.split("T")[0]; // YYYY-MM-DD
          grouped[mes] = (grouped[mes] ?? 0) + Number(p.total_vendido);
        });

        const data = Object.entries(grouped)
          .map(([mes, total]) => ({ mes, total_vendido: total }))
          .sort((a, b) => (a.mes > b.mes ? 1 : -1));

        setRows(data);
      }
    })();
  }, []);

  return (
    <div className="rounded-xl border shadow bg-white p-4">
      <h2 className="text-lg font-semibold mb-4">📈 Ventas mensuales</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="mes"
            tickFormatter={(v) => {
              const d = new Date(v);
              return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
            }}
          />
          <YAxis />
          <Tooltip
            formatter={(value) => `$${Number(value).toLocaleString()}`}
            labelFormatter={(label) => {
              const d = new Date(label);
              return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
            }}
          />
          <Line
            type="monotone"
            dataKey="total_vendido"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
