import { useEffect, useState } from "react";
import { performAction } from "../../actions/performAction";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface PagoDiario {
  fecha: string;
  metodo: string;
  total_monto: number;
  cantidad: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function PagosDonut() {
  const [rows, setRows] = useState<PagoDiario[]>([]);

  useEffect(() => {
    (async () => {
      const res = await performAction("getPagosDiarios", undefined);
      if (res.ok && res.pagos.length > 0) {
        // Tomamos solo la fecha más reciente
        const ultimaFecha = res.pagos[0].fecha;
        const data = res.pagos.filter((p: PagoDiario) => p.fecha === ultimaFecha);
        setRows(data);
      }
    })();
  }, []);

  return (
    <div className="rounded-xl border shadow bg-white p-4">
      <h2 className="text-lg font-semibold mb-4">💳 Métodos de pago (último día)</h2>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="total_monto"
            nameKey="metodo"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#3b82f6"
            label
          >
            {rows.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
