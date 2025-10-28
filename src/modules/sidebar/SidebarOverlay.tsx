import { AnimatePresence, motion } from "framer-motion";
import { Boxes, ChevronLeft, ShoppingBag } from "lucide-react";

type Vista = "caja" | "deposito" | "dashboard" | "inventario";

export default function SidebarOverlay({
  open,
  vistaActual,
  onClose,
  onSelectVista,
}: {
  open: boolean;
  vistaActual: Vista;
  onClose: () => void;
  onSelectVista: (v: Vista) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-2 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-2 py-2">
              <span className="font-semibold">Menú</span>
              <button
                onClick={onClose}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Cerrar menú"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            <nav className="mt-2 space-y-1">
              <button
                onClick={() => onSelectVista("caja")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  vistaActual === "caja" ? "bg-gray-100 dark:bg-gray-700" : ""
                }`}
              >
                <ShoppingBag size={18} />
                <span>Caja</span>
              </button>
              <button
                onClick={() => onSelectVista("deposito")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  vistaActual === "deposito" ? "bg-gray-100 dark:bg-gray-700" : ""
                }`}
              >

                <ShoppingBag size={18} />
                <span>Depósito</span>
              </button>
              <button
                onClick={() => onSelectVista("dashboard")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  vistaActual === "dashboard" ? "bg-gray-100 dark:bg-gray-700" : ""
                }`}
              >
                <Boxes size={18} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => onSelectVista("inventario")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  vistaActual === "dashboard" ? "bg-gray-100 dark:bg-gray-700" : ""
                }`}
              >
                <Boxes size={18} />
                <span>Inventario</span>
              </button>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
