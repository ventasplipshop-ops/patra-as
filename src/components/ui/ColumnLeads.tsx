import { useDroppable } from "@dnd-kit/core";
import { Card } from "./CardLeads";

export function Column({ id, leads }: any) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="min-w-[260px] max-w-[260px] flex flex-col bg-gray-100 dark:bg-gray-800 rounded-xl">
      
      {/* HEADER FIJO */}
      <div className="p-3 border-b bg-gray-200 dark:bg-gray-700 rounded-t-xl sticky top-0 z-10">
        <h3 className="text-sm font-semibold uppercase text-gray-700 dark:text-gray-200">
          {id} ({leads.length})
        </h3>
      </div>

      {/* SCROLL INTERNO */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        {leads.map((lead: any) => (
          <Card key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}