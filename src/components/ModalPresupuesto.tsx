import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import type { SaleDraft } from "../api";
import { supabase } from "../lib/supabase";

// ============= Modal de items =============
function ItemsModal({ draft, onClose }: { draft: SaleDraft | null; onClose: () => void }) {
  if (!draft) return null;

  const total = draft.items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  return (
    <AnimatePresence>
      {draft && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-4"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h2 className="text-lg font-semibold">🧾 Items del presupuesto</h2>
              <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} />
              </button>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="p-2 border">SKU</th>
                  <th className="p-2 border">Nombre</th>
                  <th className="p-2 border text-right">Cant.</th>
                  <th className="p-2 border text-right">Precio</th>
                  <th className="p-2 border text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((i, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{i.sku}</td>
                    <td className="p-2">{i.nombre}</td>
                    <td className="p-2 text-right">{i.cantidad}</td>
                    <td className="p-2 text-right">${i.precio}</td>
                    <td className="p-2 text-right">${i.precio * i.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 text-right font-semibold">
              Total: ${total}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============= Modal principal =============
interface Props {
  open: boolean;
  onClose: () => void;
  onSelectPresupuesto: (presupuesto: SaleDraft) => void;
}

export default function PresupuestosModal({ open, onClose, onSelectPresupuesto }: Props) {
  const [results, setResults] = useState<SaleDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<SaleDraft | null>(null);

  const fetchAllDrafts = async () => {
    setLoading(true);

    const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("borradores")
      .select("id, cliente_id, cliente_nombre, cliente_apellido, cliente_telefono, cliente_direccion, items, total, created_at")
      .gte("created_at", since)
      .eq("estado", "Borrador")
      .order("created_at", { ascending: false })
      .limit(10);
      

    if (error) {
      console.error("❌ Error cargando borradores:", error.message);
      setResults([]);
    } else {
      const mapped: SaleDraft[] = (data ?? []).map((d) => ({
        id: d.id,
        clienteId: d.cliente_id,
        clienteNombre: d.cliente_nombre,
        clienteApellido: d.cliente_apellido,
        clienteTelefono: d.cliente_telefono,
        clienteDireccion: d.cliente_direccion,
        items: d.items ?? [],
        total: Number(d.total),
        createdAt: d.created_at,
      }));
      setResults(mapped);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("borradores").delete().eq("id", id);
    if (error) {
      console.error("❌ Error borrando borrador:", error.message);
    } else {
      setResults((prev) => prev.filter((d) => d.id !== id));
    }
  };

  useEffect(() => {
    if (open) fetchAllDrafts();
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-4"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h2 className="text-lg font-semibold">📂 Cargar presupuestos</h2>
                <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X size={18} />
                </button>
              </div>

              {/* Tabla */}
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="p-2 border">Cliente</th>
                      <th className="p-2 border">Teléfono</th>
                      <th className="p-2 border">Total</th>
                      <th className="p-2 border">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4">⏳ Cargando...</td>
                      </tr>
                    ) : results.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-gray-400">Sin resultados</td>
                      </tr>
                    ) : (
                      results.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-2">{p.clienteNombre} {p.clienteApellido}</td>
                          <td className="p-2">{p.clienteTelefono || "—"}</td>
                          <td className="p-2 font-medium">${p.total}</td>
                          <td className="p-2 flex gap-2">
                            <button
                              onClick={() => {
                                onSelectPresupuesto(p);
                                onClose();
                              }}
                              className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:opacity-90"
                            >
                              Seleccionar
                            </button>
                            <button
                              onClick={() => setSelectedDraft(p)}
                              className="px-2 py-1 text-xs rounded bg-gray-500 text-white hover:opacity-90"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => handleDelete(p.id!)}
                              className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:opacity-90 flex items-center gap-1"
                            >
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de items */}
      <ItemsModal draft={selectedDraft} onClose={() => setSelectedDraft(null)} />
    </>
  );
}
