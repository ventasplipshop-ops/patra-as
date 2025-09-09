import { useEffect, useState } from "react";
import { performAction } from "../actions/performAction";

interface PedidoML {
  id: number;
  ml_order_id: string;
  estado: string;
  items: { sku: string; cantidad: number; precio_unitario: number }[];
}

export default function PedidosMLStats() {
  const [pedidos, setPedidos] = useState<PedidoML[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPedidos = async () => {
      setLoading(true);
      try {
        const res = await performAction("getPedidosML");
        if (res.ok) {
          setPedidos(res.pedidos);
        } else {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err.message ?? "Error inesperado");
      } finally {
        setLoading(false);
      }
    };
    fetchPedidos();
  }, []);

  // 📊 cálculos
  const total = pedidos.length;
  const entregados = pedidos.filter((p) => p.estado === "entregado").length;
  const sinItems = pedidos.filter((p) => !p.items || p.items.length === 0).length;
  const pendientes = pedidos.filter((p) => p.estado !== "entregado").length;

  return (
    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 flex flex-wrap gap-6 text-sm font-medium">
      {loading && <span>⏳ Cargando...</span>}
      {error && <span className="text-red-600">{error}</span>}

      {!loading && !error && (
        <>
          <span>📦 Total: {total}</span>
          <span className="text-green-700 dark:text-green-400">
            ✅ Entregados: {entregados}
          </span>
          <span className="text-red-700 dark:text-red-400">
            ⚠️ Sin ítems: {sinItems}
          </span>
          <span className="text-blue-700 dark:text-blue-400">
            🕒 Pendientes: {pendientes}
          </span>
        </>
      )}
    </div>
  );
}
