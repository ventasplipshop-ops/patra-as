import { LayoutGrid, Settings } from "lucide-react";
import LogoutButton from "../components/ui/LogoutButton";
import { useAuth } from "../context/AuthContext";

export default function Header({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Lado izquierdo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSidebar}
            className="mr-2 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            aria-label="Abrir menú"
          >
            <LayoutGrid size={18} />
          </button>
          <span className="font-semibold">POS — Multirubro</span>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center gap-4">
          {/* 👤 Nombre de usuario */}
          {user && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Hola, {user.nombre}
            </span>
          )}

          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <LogoutButton />
            <Settings size={16} /> Configuración
          </button>
        </div>
      </div>
    </header>
  );
}
