import { useEffect, useState } from "react";
import { DndContext, closestCorners } from "@dnd-kit/core";
import { performAction } from "../actions/performAction";
import { RefreshCw } from "lucide-react";
import { Column } from "../components/ui/ColumnLeads";

const estados = [
  "nuevo",
  "contactado",
  "interesado",
  "negociacion",
  "cliente",
  "perdido",
];



export default function LeadsBoardView() {
  const [board, setBoard] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  const loadBoard = async () => {
    setLoading(true);
    const res = await performAction("getLeadsBoard");
    if (res.ok) setBoard(res.board);
    setLoading(false);
  };

  useEffect(() => {
    loadBoard();
  }, []);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = Number(active.id);
    const nuevoEstado = over.id;

    await performAction("moveLead", {
      id: leadId,
      estado: nuevoEstado,
    });

    loadBoard();
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">📊 Leads</h2>
        <button
          onClick={loadBoard}
          className="px-3 py-2 border rounded-lg flex items-center gap-2 text-sm"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {/* BOARD */}
      {loading ? (
        <div className="text-center py-10">⏳ Cargando...</div>
      ) : (
        <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {estados.map((estado) => (
              <Column key={estado} id={estado} leads={board[estado] || []} />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}