import { useDraggable } from "@dnd-kit/core";

export function Card({ lead }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border text-sm cursor-grab hover:shadow-md transition"
    >
      <div className="font-medium">
        {lead.nombre} {lead.apellido ?? ""}
      </div>

      <div className="text-xs text-gray-500">
        📞 {lead.telefono ?? "—"}
      </div>

      <div className="text-xs text-gray-400 mt-1">
        {lead.ultimo_contacto
          ? new Date(lead.ultimo_contacto).toLocaleDateString()
          : "sin contacto"}
      </div>
    </div>
  );
}