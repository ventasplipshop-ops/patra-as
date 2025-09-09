// src/components/ui/Search.tsx
import { useState, useEffect } from "react";
import { searchMulti } from "../../api/search";
import type { SearchResource, SearchResult } from "../../api/search";

interface SearchProps {
  resources: SearchResource[];
  placeholder?: string;
  onSelect?: (row: any, resource: SearchResource) => void;
}

export default function Search({ resources, placeholder, onSelect }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const delay = setTimeout(() => {
      setLoading(true);
      searchMulti(query, resources)
        .then((res) => {
          console.debug("🔍 searchMulti DEBUG:", res); // Debug visual en consola
          setResults(res);
          setHighlightIndex(0);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(delay);
  }, [query, resources]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const flat = results.flatMap((res) =>
      res.rows.map((row) => ({ row, table: res.table }))
    );
    if (!flat.length) return;

    if (e.key === "ArrowDown") {
      setHighlightIndex((prev) => (prev + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      setHighlightIndex((prev) => (prev - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      const selected = flat[highlightIndex];
      if (selected) {
        onSelect?.(selected.row, resources.find((r) => r.table === selected.table)!);
      }
    }
  };

  return (
    <div className="w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Buscar..."}
        className="border rounded w-full p-2"
      />

      {loading && <p className="text-sm text-gray-500">Buscando...</p>}

      {results.map((res) => (
        <div key={res.table} className="mt-2">
          {res.tag && <h4 className="font-bold text-sm">{res.tag}</h4>}
          {res.rows.length === 0 && (
            <p className="text-gray-400 text-xs">Sin resultados</p>
          )}
          <ul>
            {res.rows.map((row, i) => {
              const flatIndex =
                results.slice(0, results.indexOf(res)).reduce((acc, r) => acc + r.rows.length, 0) + i;
              const isHighlighted = flatIndex === highlightIndex;
              return (
                <li
                  key={i}
                  className={`p-2 cursor-pointer ${
                    isHighlighted ? "bg-blue-100" : "hover:bg-gray-100"
                  }`}
                  onClick={() => onSelect?.(row, resources.find((r) => r.table === res.table)!)}
                >
                  {row.sku || row.nombre || JSON.stringify(row)}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
