// src/components/ui/FilterPanel.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface FilterPanelProps {
  onChange: (filters: Record<string, any>) => void;
}

export default function FilterPanel({ onChange }: FilterPanelProps) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [subcategorias, setSubcategorias] = useState<any[]>([]);
  const [selected, setSelected] = useState<{ categoria?: string; subcategoria?: string }>({});

  useEffect(() => {
    supabase.from("categorias").select("id, nombre").then(({ data }) => {
      if (data) setCategorias(data);
    });
  }, []);

  useEffect(() => {
    if (!selected.categoria) return;
    supabase
      .from("subcategorias")
      .select("id, nombre")
      .eq("categoria_id", selected.categoria)
      .then(({ data }) => {
        if (data) setSubcategorias(data);
      });
  }, [selected.categoria]);

  const handleSelect = (field: string, value: string) => {
    const newFilters = { ...selected, [field]: value };
    setSelected(newFilters);

    // lo devolvemos en formato SearchResource.where
    const mappedFilters: Record<string, any> = {};
    if (newFilters.categoria) mappedFilters["categoria_id"] = newFilters.categoria;
    if (newFilters.subcategoria) mappedFilters["subcategoria_id"] = newFilters.subcategoria;

    onChange(mappedFilters);
  };

  return (
    <div className="flex gap-4 p-3 bg-gray-50 border rounded">
      <div>
        <label className="block text-sm font-semibold">Categoría</label>
        <select
          value={selected.categoria ?? ""}
          onChange={(e) => handleSelect("categoria", e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold">Subcategoría</label>
        <select
          value={selected.subcategoria ?? ""}
          onChange={(e) => handleSelect("subcategoria", e.target.value)}
          className="border rounded px-2 py-1"
          disabled={!selected.categoria}
        >
          <option value="">Todas</option>
          {subcategorias.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
