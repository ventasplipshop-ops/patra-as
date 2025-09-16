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

interface ProductoMes {
  mes: string;
  sku: string;
  producto: string;
  total_unidades: number;
  total_vendido: number;
}

export default function TopProductos({ limit = 10 }: { limit?: number }) {
  const [rows, setRows] = useState<ProductoMes[]>([]);

  useEffect(() => {
    (async () => {
      const res = await performAction("getProductosPorMes", undefined);
      if (res.ok) {
        // Filtramos el mes más reciente
        const ultimoMes = res.productos[0]?.mes;
        const productosMes = res.productos.filter((p: ProductoMes) => p.mes === ultimoMes);

        // Ordenar por unidades vendidas
        const top = productosMes
          .sort((a, b) => b.total_unidades - a.total_unidades)
          .slice(0, limit);

        setRows(top);
      }
    })();
  }, [limit]);

  return (
    <div className="rounded-xl border shadow bg-white p-4">
      <h2 className="text-lg font-semibold mb-4">🏆 Top {limit} productos (último mes)</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="producto"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "total_unidades") return `${value} unidades`;
              if (name === "total_vendido") return `$${value}`;
              return value;
            }}
          />
          <Bar dataKey="total_unidades" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
