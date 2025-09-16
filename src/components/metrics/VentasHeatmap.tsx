import { useEffect, useState } from "react";
import { performAction } from "../../actions/performAction";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Scatter,
  ScatterChart,
  ZAxis,
} from "recharts";

interface VentaHora {
  fecha: string;
  dia_semana: number; // 0 = domingo
  hora: number;
  cantidad_ventas: number;
  monto_total: number;
}

const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function VentasHeatmap() {
  const [rows, setRows] = useState<VentaHora[]>([]);

  useEffect(() => {
    (async () => {
      const res = await performAction("getVentasPorHora", undefined);
      if (res.ok) setRows(res.horas);
    })();
  }, []);

  return (
    <div className="rounded-xl border shadow bg-white p-4">
      <h2 className="text-lg font-semibold mb-4">⏰ Ventas por hora y día</h2>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="hora"
            name="Hora"
            domain={[0, 23]}
            ticks={[0, 4, 8, 12, 16, 20, 23]}
            tickFormatter={(v) => `${v}h`}
          />
          <YAxis
            type="number"
            dataKey="dia_semana"
            name="Día"
            domain={[0, 6]}
            ticks={[0, 1, 2, 3, 4, 5, 6]}
            tickFormatter={(v) => dias[v]}
          />
          <ZAxis
            type="number"
            dataKey="cantidad_ventas"
            range={[50, 500]} // tamaño de las burbujas
            name="Cantidad"
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value, name, props) => {
              if (name === "hora") return `${value}h`;
              if (name === "dia_semana") return dias[value as number];
              if (name === "cantidad_ventas") return `${value} ventas`;
              if (name === "monto_total") return `$${value}`;
              return value;
            }}
          />
          <Scatter
            name="Ventas"
            data={rows}
            fill="#3b82f6"
            opacity={0.7}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
