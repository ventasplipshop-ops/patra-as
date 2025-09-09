import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { performAction } from "../actions/performAction";
import SearchDropdown from "../components/ui/SearchDropdown";
import { resourcesProductos } from "../config/searchResources";

interface GestionPedidosMLModalProps {
  open: boolean;
  onClose: () => void;
}

interface PedidoML {
  id: number;
  ml_order_id: string;
  estado: string;
  items: { sku: string; cantidad: number; precio_unitario: number }[];
}

export default function GestionPedidosMLModal({ open, onClose }: GestionPedidosMLModalProps) {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoML[]>([]);
  const [selected, setSelected] = useState<PedidoML | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // cargar pedidos al abrir
useEffect(() => {
  if (!open) return;
  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const res = await performAction("getPedidosML");
      if (res.ok) {
        // 👇 Filtramos pedidos ya entregados
        setPedidos(res.pedidos.filter((p: any) => p.estado !== "entregado"));
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
}, [open]);


  const handleAddItemFromSearch = (row: any) => {
    if (!selected) return;
    setSelected({
      ...selected,
      items: [
        ...selected.items,
        {
          sku: row.sku,
          cantidad: 1,
          precio_unitario: row.precio,
        },
      ],
    });
  };

  const handleChangeItem = (index: number, field: string, value: string | number) => {
    if (!selected) return;
    const items = [...selected.items];
    (items[index] as any)[field] =
      field === "cantidad" || field === "precio_unitario" ? Number(value) : value;
    setSelected({ ...selected, items });
  };

  const handleSaveItems = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await performAction("updatePedidoMLItems", {
        id: selected.id,
        items: selected.items,
        userId: String(user?.id),
      });
      console.log("📦 Enviando a updatePedidoMLItems:", res);
      console.log("📦 user?.id:", user?.id, typeof user?.id);
        console.log("📦 Payload:", {
        id: selected.id,
        items: selected.items,
        userId: user?.id || null,   // 👈 importante
        });
      if (res.ok) {
        setMensaje("Items actualizados correctamente");
        setSelected(null);
        // recargar lista
        const refresh = await performAction("getPedidosML");
        if (refresh.ok) setPedidos(refresh.pedidos);
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message ?? "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-6">
        <h2 className="text-lg font-semibold mb-4">Gestión de pedidos ML</h2>

        {loading && <p>Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {mensaje && <p className="text-green-600">{mensaje}</p>}

        {/* Lista de pedidos */}
        {!selected && (
          <ul className="divide-y divide-gray-200">
            {pedidos.map((p) => (
              <li
                key={p.id}
                className="py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 rounded"
                onClick={() => setSelected(p)}
              >
                <div className="flex justify-between">
                  <span>ID ML: {p.ml_order_id}</span>
                  <span className="text-sm text-gray-500">Estado: {p.estado}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Editor de items */}
        {selected && (
          <div>
            <h3 className="font-medium mb-2">Items de {selected.ml_order_id}</h3>

            {/* Buscador de productos */}
            <SearchDropdown
              resources={resourcesProductos}
              placeholder=" 🔎 Buscar producto SKU / Código / Nombre"
              onSelect={handleAddItemFromSearch}
            />

            <table className="w-full text-sm border mt-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">SKU</th>
                  <th className="p-2 border">Cantidad</th>
                  <th className="p-2 border">Precio Unitario</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{item.sku}</td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        className="w-full border px-2 py-1"
                        value={item.cantidad}
                        onChange={(e) =>
                          handleChangeItem(i, "cantidad", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        className="w-full border px-2 py-1"
                        value={item.precio_unitario}
                        onChange={(e) =>
                          handleChangeItem(i, "precio_unitario", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between mt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1 rounded border"
                >
                  Volver
                </button>
                <button
                  onClick={handleSaveItems}
                  className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  disabled={loading}
                >
                  Guardar Items
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
