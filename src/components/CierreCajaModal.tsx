// src/components/CierreCajaModal.tsx
import React, { useEffect, useState } from "react";
import { formatCurrency } from "../actions/calculations";
import { performAction } from "../actions/performAction";
import { useAuth } from "../context/AuthContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CierreCajaModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [cierre, setCierre] = useState<any | null>(null);
  const [montoReal, setMontoReal] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const { user, signOut  } = useAuth();
  const userId = String(user?.id);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const res = await performAction("getCierreCaja", { userId });
      console.log("🔍 ver que trae getCierreCaja:", res);
      if (res.ok) {
        setCierre(res.cierre);
      } else {
        alert(res.error || "❌ Error al traer datos de cierre");
      }
      setLoading(false);
    };
    load();
  }, [open, userId]);

  if (!open) return null;

  const esperado = cierre
    ? Object.values(cierre.pagos_metodo || {}).reduce(
        (acc: number, val: any) => acc + (val?.monto ?? 0),
        cierre.monto_apertura ?? 0
      )
    : 0;

  const diferencia = montoReal - esperado;

  const handleClose = async () => {
    if (!cierre) return;
    if (!window.confirm("¿Confirmar cierre de caja?")) return;

    setSaving(true);
    const res = await performAction("closeRegister", {
      userId,
      amount: montoReal,
    });
    setSaving(false);

    if (res.ok) {
      alert("✅ Caja cerrada correctamente");
      onClose();
      signOut();
    } else {
      alert(res.error || "❌ Error al cerrar caja");
    }
  };

  // preparar data para gráfico de pagos
  const chartData =
    cierre && cierre.pagos_metodo
      ? Object.entries(cierre.pagos_metodo).map(([metodo, val]: any) => ({
          name: metodo,
          value: val.monto,
        }))
      : [];

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-[650px] shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Cierre de Caja</h2>

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : cierre ? (
          <div className="space-y-4 text-sm">
            {/* Fechas */}
            <div className="text-gray-500">
              <p>
                <span className="font-medium">Inicio:</span>{" "}
                {new Date(cierre.inicio).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Fin:</span>{" "}
                {new Date(cierre.fin).toLocaleString()}
              </p>
            </div>

            {/* Monto apertura */}
            <div className="flex justify-between">
              <span className="text-gray-600">Monto Apertura</span>
              <span className="font-medium">
                {formatCurrency(cierre.monto_apertura)}
              </span>
            </div>

            {/* Ventas por estado */}
            <div>
              <h4 className="font-semibold mb-1">Ventas por Estado</h4>
              <ul className="border rounded p-2 bg-gray-50 dark:bg-gray-800">
                {Object.entries(cierre.ventas_estado || {}).map(
                  ([estado, val]: any) => {
                    const label = estado === "entregado" ? "Al contado" : estado;
                    return (
                      <li
                        key={estado}
                        className="flex justify-between py-0.5 border-b last:border-0"
                      >
                        <span>{label}</span>
                        <span>
                          {val.cantidad} · {formatCurrency(val.monto)}
                        </span>
                      </li>
                    );
                  }
                )}
              </ul>
            </div>


            {/* Ventas por consumidor */}
            <div>
              <h4 className="font-semibold mb-1">Ventas por Consumidor</h4>
              <ul className="border rounded p-2 bg-gray-50 dark:bg-gray-800">
                {Object.entries(cierre.ventas_consumidor || {}).map(
                  ([tipo, val]: any) => (
                    <li
                      key={tipo}
                      className="flex justify-between py-0.5 border-b last:border-0"
                    >
                      <span>{tipo}</span>
                      <span>
                        {val.cantidad} · {formatCurrency(val.monto)}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Pagos por método */}
            <div>
              <h4 className="font-semibold mb-2">Ingresos por Método</h4>
              <div className="flex gap-4 items-center">
                <ul className="flex-1 border rounded p-2 bg-gray-50 dark:bg-gray-800">
                  {Object.entries(cierre.pagos_metodo || {}).map(
                    ([metodo, val]: any) => (
                      <li
                        key={metodo}
                        className="flex justify-between py-0.5 border-b last:border-0"
                      >
                        <span>{metodo}</span>
                        <span>{formatCurrency(val.monto)}</span>
                      </li>
                    )
                  )}
                </ul>
                <div className="w-40 h-40">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        label
                      >
                        {chartData.map((_, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={COLORS[i % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Totales */}
            <div className="flex justify-between font-semibold">
              <span>Total Esperado</span>
              <span>{formatCurrency(esperado)}</span>
            </div>

            <div className="flex justify-between items-center">
              <label>Monto Real contado:</label>
              <input
                type="number"
                value={montoReal}
                onChange={(e) => setMontoReal(Number(e.target.value))}
                className="border rounded px-2 py-1 text-right w-40"
              />
            </div>

            <div className="flex justify-between">
              <span>Diferencia</span>
              <span
                className={`font-bold ${
                  diferencia === 0
                    ? "text-green-600"
                    : diferencia > 0
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(diferencia)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-red-500">No se pudo cargar cierre de caja.</p>
        )}

        {/* Botones */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleClose}
            disabled={saving || !cierre}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "⏳ Guardando..." : "Cerrar Caja"}
          </button>
        </div>
      </div>
    </div>
  );
}
