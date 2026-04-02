import { useDraggable } from "@dnd-kit/core";
import { MessageCircle } from "lucide-react";

export function Card({ lead, isOverlay = false }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const style =
    isOverlay
      ? { transform: "none" }
      : transform
      ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
      : undefined;
  
  const waLink = generarLinkWhatsApp(lead.telefono, lead.nombre);
 console.log("WA LINK:", waLink);
  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      className={`bg-white dark:bg-gray-700 p-3 rounded-lg shadow
        ${
          isOverlay
            ? "opacity-90 scale-105 pointer-events-none"
            : "cursor-grab active:cursor-grabbing"
        }`}
    >
      <div className="font-medium">{lead.nombre}</div>
      <div className="text-xs text-gray-500">{lead.telefono}</div>
      <div className="text-xs text-gray-400 mt-1">
        {lead.ultimo_contacto
          ? new Date(lead.ultimo_contacto).toLocaleDateString()
          : "sin contacto"}
      </div>

      {/* 🔥 BOTÓN WHATSAPP */}
      {!isOverlay && waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            window.open(waLink, "_blank"); // 🔥 fuerza apertura
          }}
          onPointerDown={(e) => e.stopPropagation()} // 🔥 evita que drag capture el click
          className="flex items-center justify-center gap-2 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-md"
        >
          <MessageCircle size={10} />
          WhatsApp
        </a>
      )}

    </div>
  );
}

function generarLinkWhatsApp(telefono?: string, nombre?: string) {
  if (!telefono) return null;

  let limpio = telefono.replace(/\D/g, "");

  // 🔥 Normalizar Argentina
  if (limpio.startsWith("0")) limpio = limpio.slice(1);

  // Si empieza con 54 pero no tiene 9 → agregarlo
  if (limpio.startsWith("54") && limpio[2] !== "9") {
    limpio = "549" + limpio.slice(2);
  }

  // Si no tiene código país → asumir Argentina
  if (!limpio.startsWith("54")) {
    limpio = "549" + limpio;
  }

  const mensaje = encodeURIComponent(
    `Hola ${nombre ?? ""}, te escribo por el tema de embalaje 👋`
  );
  

  return `https://api.whatsapp.com/send?phone=${limpio}&text=${mensaje}`;
}