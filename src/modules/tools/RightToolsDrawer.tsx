import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Wrench, CreditCard, Percent, Printer, BarChart3, QrCode, Upload, Download, ClipboardList, History } from "lucide-react";

const herramientas = {
  caja: [
    { label: "Agregar cliente", icon: <Percent size={16} /> },
    { label: "Cierre de caja", icon: <Printer size={16} /> },
    { label: "TopTen", icon: <BarChart3 size={16} /> },
    { label: "Ver consignas", icon: <QrCode size={16} /> },
    { label: "Cargar presupuestos", icon: <ClipboardList size={16} /> },
    { label: "Aqui no hace nada", icon: <CreditCard size={16} /> }, 
  ],
  deposito: [
    { label: "Registrar pedido ML", icon: <Upload size={16} /> },
    { label: "Gestionar pedidos ML", icon: <Download size={16} /> },
    { label: "Ajuste de inventario", icon: <Wrench size={16} /> },
    { label: "Pendientes de compra", icon: <ClipboardList size={16} /> },
    { label: "Historial movimientos", icon: <History size={16} /> },
  ],
  dashboard: [
    { label: "que flojo es edwin ", icon: <Upload size={16} /> },

  ],
  inventario: [
    { label: "Registrar producto", icon: <Upload size={16} /> },

  ],
} as const;

export default function RightToolsDrawer({ open, vista, onClose, onToolSelect, }: { open: boolean; vista: "caja" | "deposito" | "dashboard" | "inventario"; onClose: () => void;  onToolSelect?: (label: string) => void; }) {
  const items = herramientas[vista];

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="absolute inset-y-0 right-0 w-80 rounded-l-2xl bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-auto z-30"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Herramientas — {vista === "caja" ? "Caja" : "Depósito"}</h3>
            <Wrench size={16} />
          </div>
          <div className="space-y-2">
            {items.map((h) => (
              <button 
                key={h.label}
                onClick={() => {
                  if (onToolSelect) onToolSelect(h.label);
                  onClose(); // ✅ cerrar drawer apenas seleccionás una herramienta
                }} 
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                
                <span className="inline-flex items-center gap-2">{h.icon} {h.label}</span>
                <ChevronLeft size={14} className="opacity-60" />
              </button>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
