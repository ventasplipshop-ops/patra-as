import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { RefreshCw, Search, Edit3, Check, X } from "lucide-react";
import Button from "../components/ui/Button";
import PriceChangeModal from "../components/PriceChangeModal";
import { performAction } from "../actions/performAction";

interface InventarioItem {
  id: number;
  sku: string;
  nombre: string | null;
  stock: number;
  precio: number;
  updated_at: string | null;
  link: string | null;
}

export type NivelStock = "BAJO" | "MEDIO" | "ALTO"

export function calcularNivelStock(stock: number): NivelStock {
  if (stock <= 5) return "BAJO"
  if (stock <= 20) return "MEDIO"
  return "ALTO"
}



export default function InventarioView() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState<string>("");
  const [nuevoStock, setNuevoStock] = useState<number>(0);
  const [nuevoPrecio, setNuevoPrecio] = useState<number>(0);
  const [filtroStock, setFiltroStock] = useState<NivelStock | null>(null);
  const [selectedItems, setSelectedItems] = useState<InventarioItem[]>([]);
  const [showPriceModal, setShowPriceModal] = useState(false);


  function toggleSeleccion(item: InventarioItem) {
    const yaSeleccionado = selectedItems.some(i => i.id === item.id)

    if (yaSeleccionado) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id))
    } else {
      setSelectedItems([...selectedItems, item])
    }
  }

    
    const resumenStock = items.reduce(
    (acc, item) => {
      const nivel = calcularNivelStock(item.stock)

      acc[nivel] += 1
      return acc
    },
    { BAJO: 0, MEDIO: 0, ALTO: 0 }
  )

const itemsFiltrados = items.filter((i) => {
  const coincideBusqueda =
    i.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
    (i.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase());

  const coincideStock =
    !filtroStock ||
    calcularNivelStock(i.stock) === filtroStock;

  return coincideBusqueda && coincideStock;
});


  function seleccionarTodos() {
    setSelectedItems(itemsFiltrados)
  }

  function deseleccionarTodos() {
    setSelectedItems([])
  }

  // =============================
  // 🔄 Cargar inventario
  // =============================
  const fetchInventario = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventario")
      .select("id, sku, nombre, stock, precio, updated_at, link")
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

  const actualizarCampo = async (
    id: number,
    campo: string,
    valor: string | number
  ) => {
    const { error } = await supabase
      .from("inventario")
      .update({
        [campo]: valor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("❌ Error actualizando campo:", error.message);
      alert("Error al guardar");
    }
  };



  function generarCSVInventario(items: InventarioItem[]) {
    const headers = ["SKU", "Nombre", "Stock", "Precio"]

    const rows = items.map(item => [
      item.sku,
      item.nombre ?? "",
      item.stock,
      item.precio
    ])

    return [headers, ...rows]
      .map(row => row.join(","))
      .join("\n")
  }

  function descargarCSV(nombreArchivo: string, contenido: string) {
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", nombreArchivo)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handlePriceChange(
  porcentaje: number,
  modo: "increase" | "revert"
) {
  const ids = selectedItems.map(i => String(i.id));

  const res = await performAction("applyPriceChange", {
    productIds: ids,
    porcentaje,
    multiplo: 100,
    mode: modo,
  });

  if (!res.ok) {
    alert("❌ Error aplicando cambio");
    return;
  }

  alert("✅ Precios actualizados");
  setShowPriceModal(false);
  setSelectedItems([]);
  fetchInventario();
}

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

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>

          <Button onClick={() => setFiltroStock("BAJO")}>
            🔴 Bajo ({resumenStock.BAJO})
          </Button>

          <Button onClick={() => setFiltroStock("MEDIO")}>
            🟡 Medio ({resumenStock.MEDIO})
          </Button>

          <Button onClick={() => setFiltroStock("ALTO")}>
            🟢 Alto ({resumenStock.ALTO})
          </Button>

          <Button onClick={() => setFiltroStock(null)}>
            👁 Ver todos
          </Button>
          <Button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={() => {
              const csv = generarCSVInventario(selectedItems)
              descargarCSV("inventario_seleccionado.csv", csv)
            }}
          >
            👐 Descargar seleccionados ({selectedItems.length})
          </Button>
          <Button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={() => setShowPriceModal(true)}
          >
            💰 Cambiar precios ({selectedItems.length})
          </Button>
          <Button
            type="button"
            onClick={seleccionarTodos}
            disabled={itemsFiltrados.length === 0}
          >
            ✅ Seleccionar todos
          </Button>

          <Button
            type="button"
            onClick={deseleccionarTodos}
            disabled={selectedItems.length === 0}
          >
            ❌ Deseleccionar todos
          </Button>
        </div>
        



      {/* Tabla */}
      <div className="flex-1 overflow-auto border rounded-xl bg-white dark:bg-gray-800">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            
            <tr>
              <th>Sel</th>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border text-right">Stock</th>
              <th className="p-2 border text-right">Precio</th>
              <th className="p-2 border text-center">Acciones</th>
              <th className="p-2 border text-center">Link</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4">⏳ Cargando...</td>
              </tr>
            ) : itemsFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              itemsFiltrados.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedItems.some(i => i.id === item.id)}
                      onChange={() => toggleSeleccion(item)}
                    />
                  </td>

                  {/* NOMBRE */}
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

                  {/* STOCK */}
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

                  {/* PRECIO */}
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

                  {/* ACCIONES */}
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

                  {/* 🔥 LINK — editable inline */}
                  <td className="p-2 text-center">
                    <input
                      type="text"
                      defaultValue={item.link ?? ""}
                      className="w-full border rounded px-2 py-1 text-xs"
                      placeholder="https://..."
                      onBlur={(e) => actualizarCampo(item.id, "link", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur(); // dispara el guardado
                        }
                      }}
                    />
                  </td>
                </tr>

              ))
            )}
          </tbody>
        </table>
      </div>
      <PriceChangeModal
        open={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        onConfirm={handlePriceChange}
        selectedCount={selectedItems.length}
        items={selectedItems.map(i => ({
          id: i.id,
          nombre: i.nombre,
          precio: Number(i.precio),
        }))}
      />
    </div>
  );
}
