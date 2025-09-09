// src/components/PedidoDetalle.tsx
import React from "react";
import type { SaleDraft } from "../api";

export interface DraftWithEstado extends SaleDraft {
  estado:
    | "revision"
    | "visto"
    | "empaquetado"
    | "empaquetado_fin"
    | "recepcion"
    | "entregado";
  items: (SaleDraft["items"][number] & {
    estado: "pendiente" | "listo" | string;
  })[];
}

// 👇 export default SOLO para el componente
export default function PedidoDetallePanel({
  draft,
  onToggleItem,
  onUpdate,
}: {
  draft: DraftWithEstado | null;
  onToggleItem: (sku: string) => void;
  onUpdate: (id: string, estado: DraftWithEstado["estado"]) => void;
}) {
  if (!draft) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        👈 Seleccioná un pedido de la lista
      </div>
    );
  }

  const isEntregado = draft.estado === "entregado";
  const pendientes = draft.items.filter((i) => i.estado === "pendiente").length;
  const listos = draft.items.filter((i) => i.estado === "listo").length;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div
        className={`rounded-2xl border shadow-sm p-6 bg-white dark:bg-gray-800 ${
          isEntregado ? "opacity-60" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Pedido #{draft.numero}</h2>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              draft.estado === "entregado"
                ? "bg-gray-300 text-gray-800"
                : draft.estado === "recepcion"
                ? "bg-purple-200 text-purple-800"
                : draft.estado.includes("empaquetado")
                ? "bg-yellow-200 text-yellow-800"
                : "bg-blue-200 text-blue-800"
            }`}
          >
            {draft.estado}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Cliente: <span className="font-medium">{draft.clienteNombre}</span>
        </p>

        {/* Progreso */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{listos} listos</span>
            <span>{pendientes} pendientes</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{
                width: `${
                  draft.items.length > 0
                    ? (listos / draft.items.length) * 100
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Lista de items con checklist */}
        <ul className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
          {draft.items.map((item) => (
            <li
              key={item.sku}
              className="flex items-center justify-between p-2 rounded-lg border bg-gray-50 dark:bg-gray-700"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.estado === "listo"}
                  onChange={() => onToggleItem(item.sku)}
                  disabled={isEntregado}
                  className="accent-green-600"
                />
                <div>
                  <p className="font-medium">{item.nombre ?? item.sku}</p>
                  <p className="text-xs text-gray-500">
                    {item.cantidad} unidades
                  </p>
                </div>
              </label>
            </li>
          ))}
        </ul>

        {/* Acciones según estado */}
        <div className="flex gap-2 justify-end">
          {draft.estado === "revision" && (
            <button
              onClick={() => onUpdate(draft.id!, "visto")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              👁️ Marcar como visto
            </button>
          )}

          {draft.estado === "empaquetado_fin" && (
            <button
              onClick={() => onUpdate(draft.id!, "recepcion")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              🚚 Enviar a Recepción
            </button>
          )}

          {draft.estado === "recepcion" && (
            <button
              onClick={() => onUpdate(draft.id!, "entregado")}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
            >
              🎉 Marcar como Entregado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
