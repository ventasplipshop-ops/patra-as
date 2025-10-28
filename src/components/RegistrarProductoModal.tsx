import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Upload, Plus, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// === Rubros y categorías ===
const rubros = [
  "logistica",
  "papeleria",
  "hogar_cuidado_personal",
  "deporte_y_bienestar",
  "otros",
  "kit",
];

const categoriasPorRubro: Record<string, string[]> = {
  logistica: ["Embalaje"],
  papeleria: ["Papelería Oficina", "Encuadernación"],
  hogar_cuidado_personal: ["Blanquería", "Higiene", "Hogar", "Perfumería"],
  deporte_y_bienestar: ["Yoga y Fitness"],
  otros: ["Otros"],
  kit: ["Kits personalizados"],
};

// === Opciones de variantes ===
const variantOptions = [
  { key: "color", label: "Color" },
  { key: "material", label: "Material" },
  { key: "micronaje", label: "Micronaje o Espesor" },
  { key: "medida", label: "Medida o Diámetro" },
  { key: "formato", label: "Formato / Presentación" },
  { key: "gramaje", label: "Gramaje" },
  { key: "resistencia", label: "Resistencia" },
  { key: "uso_recomendado", label: "Uso recomendado" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RegistrarProductoModal({ open, onClose }: Props) {
  const { user } = useAuth();

  // --- Campos base del producto ---
  const [nombre, setNombre] = useState("");
  const [proveedorId, setProveedorId] = useState<number>(1);
  const [rubro, setRubro] = useState("");
  const [categoria, setCategoria] = useState("");
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<any[]>([]);

  // --- Variantes ---
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any[]>>({});
  const [currentVariant, setCurrentVariant] = useState<string>("");
  const [tempNombre, setTempNombre] = useState("");
  const [tempPrecio, setTempPrecio] = useState("");
  const [tempStock, setTempStock] = useState("");

  const categoriasDisponibles = rubro ? categoriasPorRubro[rubro] || [] : [];

  // Cargar últimos registros de inventario (para vista previa)
  const fetchInventario = async () => {
    const { data, error } = await supabase
      .from("inventario")
      .select("id, sku, nombre, stock, precio, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8);

    if (!error) setProductos(data || []);
  };

  useEffect(() => {
    if (open) fetchInventario();
  }, [open]);

  // === Agregar tipo de variante (ej: color, material) ===
  const handleAddVariantType = () => {
    if (!currentVariant) return;
    if (selectedVariants[currentVariant]) return;
    setSelectedVariants((prev) => ({ ...prev, [currentVariant]: [] }));
    setCurrentVariant("");
  };

  // === Agregar valor a la variante ===
  const handleAddVariantValue = (key: string) => {
    if (!tempNombre.trim()) return;
    const variantObj = {
      nombre: tempNombre.trim(),
      precio: Number(tempPrecio) || 0,
      stockv: Number(tempStock) || 0,
      codigo_barras: null,
      link: null,
      unidades_por_paquete: 1,
      paquetes_por_caja: 1,
    };
    setSelectedVariants((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), variantObj],
    }));
    setTempNombre("");
    setTempPrecio("");
    setTempStock("");
  };

  // === Eliminar tipo de variante completo ===
  const handleRemoveVariantType = (key: string) => {
    const updated = { ...selectedVariants };
    delete updated[key];
    setSelectedVariants(updated);
  };

  // === Eliminar valor específico ===
  const handleRemoveValue = (key: string, index: number) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  // === Resetear formulario ===
  const resetForm = () => {
    setNombre("");
    setProveedorId(1);
    setRubro("");
    setCategoria("");
    setSelectedVariants({});
    setCurrentVariant("");
  };

  // === Registrar producto (acoplado a tu función PL/pgSQL) ===
  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      alert("⚠️ El nombre del producto es obligatorio.");
      return;
    }

    setLoading(true);
    const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

    const { data, error } = await supabase.rpc("registrar_producto", {
      p_nombre_principal: nombre.trim(),
      p_proveedor_id: proveedorId,
      p_caracteristicas: selectedVariants || {}, // 👈 tu función ya recibe jsonb
      p_nombre_proveedor: nombre,
      p_nombre_ml: nombre,
      p_nombre_exportador: nombre,
      p_garantia: false,
      p_unidades_por_paquete: 1,
      p_paquetes_por_caja: 1,
      p_cajas_por_pallet: 1,
      p_foto_url: null,
      p_rubro: rubro || "otros",
      p_categoria: categoria || "sin_categoria",
      p_subcategoria: "",
      p_perecedero: false,
      p_tiempo_vencimiento: 0,
      p_temporada_venta: "Todo el año",
      p_codigo_barras: null,
      p_user_id: userId,
    });

    if (error) {
      console.error("❌ Error al registrar producto:", error.message);
      alert("Error al registrar producto: " + error.message);
      setLoading(false);
      return;
    }

    alert("✅ Producto y variantes registrados correctamente.");
    resetForm();
    fetchInventario();
    setLoading(false);
  };

  // === Render ===
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-4 overflow-auto max-h-[90vh]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Upload size={18} /> Registrar producto con variantes
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegistrar} className="space-y-3">
              {/* Nombre */}
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Ej: Cinta adhesiva transparente"
                />
              </div>

              {/* Proveedor y Rubro */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Proveedor ID</label>
                  <input
                    type="number"
                    value={proveedorId}
                    onChange={(e) => setProveedorId(Number(e.target.value))}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Rubro</label>
                  <select
                    value={rubro}
                    onChange={(e) => setRubro(e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="">Seleccioná rubro</option>
                    {rubros.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="text-sm font-medium">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  disabled={!rubro}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Seleccioná categoría</option>
                  {categoriasDisponibles.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variantes */}
              <div className="border-t pt-3">
                <h3 className="font-semibold mb-2">Variantes técnicas</h3>

                <div className="flex gap-2 mb-3">
                  <select
                    value={currentVariant}
                    onChange={(e) => setCurrentVariant(e.target.value)}
                    className="border rounded px-2 py-1 flex-1"
                  >
                    <option value="">Seleccionar variante...</option>
                    {variantOptions
                      .filter((v) => !selectedVariants[v.key])
                      .map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.label}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddVariantType}
                    className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-1"
                  >
                    <Plus size={14} /> Agregar tipo
                  </button>
                </div>

                {/* Listado de variantes */}
                {Object.keys(selectedVariants).map((key) => (
                  <div key={key} className="border rounded p-2 mb-2">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">
                        {variantOptions.find((v) => v.key === key)?.label || key}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantType(key)}
                        className="text-red-500 text-xs flex items-center gap-1"
                      >
                        <XCircle size={14} /> eliminar
                      </button>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <input
                        placeholder="Nombre"
                        value={tempNombre}
                        onChange={(e) => setTempNombre(e.target.value)}
                        className="border rounded px-2 py-1 flex-1"
                      />
                      <input
                        type="number"
                        placeholder="Precio"
                        value={tempPrecio}
                        onChange={(e) => setTempPrecio(e.target.value)}
                        className="border rounded px-2 py-1 w-28 text-right"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        value={tempStock}
                        onChange={(e) => setTempStock(e.target.value)}
                        className="border rounded px-2 py-1 w-24 text-right"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddVariantValue(key)}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="space-y-1 text-xs">
                      {selectedVariants[key].map((val, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded"
                        >
                          <span>
                            {val.nombre} - ${val.precio} (Stock {val.stockv})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveValue(key, idx)}
                            className="text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {Object.keys(selectedVariants).length > 0 && (
                  <pre className="bg-gray-50 p-2 text-xs rounded overflow-auto mt-2">
                    {JSON.stringify(selectedVariants, null, 2)}
                  </pre>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1 border rounded text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm flex items-center gap-2"
                >
                  <Check size={16} />
                  {loading ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
