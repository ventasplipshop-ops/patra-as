// src/views/DepositoView.tsx
import { useEffect, useState } from "react";
import { performAction } from "../actions/performAction";
import { useAuth } from "../context/AuthContext";
import PedidosMLStats from "../components/PedidosMLStats";
import PedidoDetallePanel from "../components/PedidoDetalle";
import type { DraftWithEstado } from "../components/PedidoDetalle";

export default function DepositoView() {
  const [drafts, setDrafts] = useState<DraftWithEstado[]>([]);
  const [selected, setSelected] = useState<DraftWithEstado | null>(null);
  const { user } = useAuth();

  // cargar pedidos al montar
  useEffect(() => {
    const loadDrafts = async () => {
      const res = await performAction("getDrafts", undefined);
      if (res.ok) {
        const mapped: DraftWithEstado[] = res.drafts.map((d) => ({
          ...d,
          estado: (d.estado as DraftWithEstado["estado"]) ?? "revision",
          items: d.items.map((i) => ({ ...i, estado: "pendiente" })),
        }));
        setDrafts(mapped);
      }
    };
    loadDrafts();
  }, []);

  const updateEstado = async (
    draftId: string,
    estado: DraftWithEstado["estado"]
  ) => {
    const res = await performAction("updateDraftStatus", {
      id: draftId,
      estado,
      userId: String(user?.id),
    });
    if (res.ok) {
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, estado } : d))
      );
      setSelected((prev) => (prev?.id === draftId ? { ...prev, estado } : prev));
    }
    console.log("🔥 updateEstado ejecutado:", draftId, estado);
  };

  const toggleItemEstado = (sku: string) => {
    if (!selected) return;
    const nuevos = selected.items.map((i) =>
      i.sku === sku
        ? { ...i, estado: i.estado === "pendiente" ? "listo" : "pendiente" }
        : i
    );

    const primerClick =
      selected.items.every((i) => i.estado === "pendiente") &&
      nuevos.some((i) => i.estado === "listo");

    const todosListos = nuevos.every((i) => i.estado === "listo");

    if (primerClick) {
      updateEstado(selected.id!, "empaquetado");
      console.log("👉 toggleItemEstado", { primerClick, todosListos, estadoActual: selected.estado });
    }
    if (todosListos) {
      updateEstado(selected.id!, "empaquetado_fin");
      console.log("👉 toggleItemEstado", { primerClick, todosListos, estadoActual: selected.estado });
    }
console.log("👉 toggleItemEstado", { primerClick, todosListos, estadoActual: selected.estado });
    setSelected({ ...selected, items: nuevos });
    setDrafts((prev) =>
      prev.map((d) => (d.id === selected.id ? { ...d, items: nuevos } : d))
    );
  };

  return (
    <div className="flex h-full">
      {/* Panel de estadísticas */}
      {/* <PedidosMLStats /> */}

      {/* Panel izquierdo: detalle */}
      <div className="flex-1 p-4 border-r bg-gray-50 dark:bg-gray-900">
        <PedidoDetallePanel
          draft={selected}
          onToggleItem={toggleItemEstado}
          onUpdate={updateEstado}
        />
      </div>

      {/* Panel derecho: pipeline de pedidos */}
      <div className="w-80 p-3 overflow-y-auto bg-white dark:bg-gray-800 border-l">
        <h3 className="font-semibold mb-4">Pedidos en curso</h3>
        <div className="space-y-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelected(d)}
              className={`p-3 rounded-lg cursor-pointer border shadow-sm transition ${
                selected?.id === d.id
                  ? "bg-blue-50 border-blue-400"
                  : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm">#{d.numero}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    d.estado === "entregado"
                      ? "bg-gray-300 text-gray-800"
                      : d.estado === "recepcion"
                      ? "bg-purple-200 text-purple-800"
                      : d.estado.includes("empaquetado")
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-blue-200 text-blue-800"
                  }`}
                >
                  {d.estado}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {d.clienteNombre}
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full"
                  style={{
                    width: `${
                      d.items.length > 0
                        ? (d.items.filter((i) => i.estado === "listo").length /
                            d.items.length) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
