import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchHistorialVentas } from "../../api";
import { supabase } from "../../lib/supabase";
import SearchDropdown from "../../components/ui/SearchDropdown";
import { resourcesVentas } from "../../config/searchResources";
import  HistorialModal  from "../../components/HistorialModal";

export interface VentaHistorial {
  id: number;
  created_at: string;
  total: number;
  estado: string;
  cliente?: {
    id: number;
    nombre: string;
    apellido?: string;
  } | null;
  pagos?: { metodo: string; monto: number }[];
}

export default function BottomHistoryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [historial, setHistorial] = useState<VentaHistorial[]>([]);
  const [loading, setLoading] = useState(false);
   const [selectedVentaId, setSelectedVentaId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadHistorial();
    }
  }, [open]);

  const normalizeVentas = (rows: any[]): VentaHistorial[] => {
    return (rows ?? []).map((v) => ({
      ...v,
      cliente: Array.isArray(v.cliente) ? v.cliente[0] : v.cliente,
    }));
  };

  const loadHistorial = async () => {
    setLoading(true);
    const res = await fetchHistorialVentas(20);
    setHistorial(normalizeVentas(res));
    setLoading(false);
  };

  // 🔎 callback cuando seleccionás un cliente
  const handleClienteSelect = async (cliente: any) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ventas")
      .select(`
        id,
        created_at,
        total,
        estado,
        cliente:clientes!ventas_cliente_id_fkey(id, nombre, apellido),
        pagos(metodo, monto)
      `)
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false })
      //.limit(20);

    if (!error) {
      setHistorial(normalizeVentas(data ?? []));
    }
    setLoading(false);
  };

  const handleDateSearch = async (fecha: string) => {
  if (!fecha) return loadHistorial();
  setLoading(true);

  const fechaInicio = new Date(`${fecha}T00:00:00`);
  const fechaFin = new Date(`${fecha}T23:59:59`);

  const { data, error } = await supabase
    .from("ventas")
    .select(`
      id,
      created_at,
      total,
      estado,
      cliente:clientes!ventas_cliente_id_fkey(id, nombre, apellido),
      pagos(metodo, monto)
    `)
    .gte("created_at", fechaInicio.toISOString())
    .lte("created_at", fechaFin.toISOString())
    .order("created_at", { ascending: false });

  if (!error) setHistorial(normalizeVentas(data ?? []));
  setLoading(false);
};


  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ y: 320, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="absolute left-0 right-0 bottom-0 z-40 rounded-t-2xl bg-white dark:bg-gray-800 border-t border-x border-gray-200 dark:border-gray-700 shadow-lg"
          style={{ maxHeight: "70vh" }}
        >
          <div className="px-3 py-2 flex items-center justify-between sticky top-0 bg-inherit border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold">Historial de ventas</h3>
            <button
              onClick={onClose}
              className="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>

          {/* Barra de búsqueda con SearchDropdown */}

          <div className="flex gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            {/* Buscar por cliente */}
            <SearchDropdown
              resources={resourcesVentas}
              placeholder="Buscar cliente..."
              onSelect={(row) => handleClienteSelect(row)}
            />

            {/* Buscar por fecha */}
            <input
              type="date"
              onChange={(e) => handleDateSearch(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
          {/* Tabla */}
          <div className="px-3 py-2 max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 dark:text-gray-400 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <tr>
                  <th className="py-2">#</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      ⏳ Cargando...
                    </td>
                  </tr>
                ) : historial.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-400">
                      Sin ventas registradas
                    </td>
                  </tr>
                ) : (
                  historial.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2">{r.id}</td>
                      <td className="py-2">{new Date(r.created_at).toLocaleString("es-AR")}</td>
                      <td className="py-2">
                        {r.cliente?.nombre} {r.cliente?.apellido ?? ""}
                      </td>
                      <td className="py-2 font-medium">${r.total}</td>
                      <td className="py-2">{r.estado}</td>
                      <td className="py-2">
                        <button
                          onClick={() => setSelectedVentaId(r.id)}
                          className="px-2 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          
        </motion.aside>
      )}
    </AnimatePresence>

          <HistorialModal
        ventaId={selectedVentaId ?? 0}
        open={!!selectedVentaId}
        onClose={() => setSelectedVentaId(null)}
      />
    </>

    
  );
}
