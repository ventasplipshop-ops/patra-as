import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { RefreshCw, Search, Edit3, Check, X } from "lucide-react";

interface InventarioItem {
  id: number;
  sku: string;
  nombre: string | null;
  stock: number;
  precio: number;
  updated_at: string | null;
}

export default function InventarioView() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState<string>("");
  const [nuevoStock, setNuevoStock] = useState<number>(0);
  const [nuevoPrecio, setNuevoPrecio] = useState<number>(0);

  // =============================
  // 🔄 Cargar inventario
  // =============================
  const fetchInventario = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventario")
      .select("id, sku, nombre, stock, precio, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("❌ Error cargando inventario:", error.message);
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventario();
  }, []);

  // =============================
  // ✏️ Guardar cambios
  // =============================
  const handleGuardar = async (id: number) => {
    const { error } = await supabase
      .from("inventario")
      .update({
        nombre: nuevoNombre,
        stock: nuevoStock,
        precio: nuevoPrecio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("❌ Error al guardar: " + error.message);
      return;
    }

    alert("✅ Inventario actualizado correctamente");
    setEditando(null);
    fetchInventario();
  };

  // =============================
  // 🔍 Filtro
  // =============================
  const filtrados = items.filter(
    (i) =>
      i.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
      (i.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // =============================
  // 🧱 UI
  // =============================
  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <header className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">📦 Inventario</h2>
        <button
          onClick={fetchInventario}
          className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </header>

      {/* Buscador */}
      <div className="flex items-center gap-2">
        <Search size={18} />
        <input
          type="text"
          placeholder="Buscar por SKU o nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto border rounded-xl bg-white dark:bg-gray-800">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <tr>
              
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border text-right">Stock</th>
              <th className="p-2 border text-right">Precio</th>
              <th className="p-2 border text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4">⏳ Cargando...</td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtrados.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                  
                  <td className="p-2">
                    {editando === item.id ? (
                      <input
                        type="text"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        className="w-full border rounded px-1"
                      />
                    ) : (
                      item.nombre ?? "—"
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {editando === item.id ? (
                      <input
                        type="number"
                        value={nuevoStock}
                        onChange={(e) => setNuevoStock(Number(e.target.value))}
                        className="w-20 border rounded px-1 text-right"
                      />
                    ) : (
                      item.stock
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {editando === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={nuevoPrecio}
                        onChange={(e) => setNuevoPrecio(Number(e.target.value))}
                        className="w-20 border rounded px-1 text-right"
                      />
                    ) : (
                      `$${item.precio}`
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {editando === item.id ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleGuardar(item.id)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs flex items-center gap-1"
                        >
                          <Check size={14} /> Guardar
                        </button>
                        <button
                          onClick={() => setEditando(null)}
                          className="px-2 py-1 bg-gray-400 text-white rounded text-xs flex items-center gap-1"
                        >
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditando(item.id);
                          setNuevoNombre(item.nombre ?? "");
                          setNuevoStock(item.stock);
                          setNuevoPrecio(Number(item.precio));
                        }}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1 hover:opacity-90"
                      >
                        <Edit3 size={14} /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
