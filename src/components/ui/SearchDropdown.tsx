import { useState, useEffect, useRef } from "react";
import { searchMulti } from "../../api/search";
import type { SearchResource, SearchResult } from "../../api/search";

interface SearchDropdownProps {
  resources: SearchResource[];
  placeholder?: string;
  onSelect?: (row: any, resource: SearchResource) => void;
}

export default function SearchDropdown({ resources, placeholder, onSelect }: SearchDropdownProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setHighlightIndex(-1);
      return;
    }
    const delay = setTimeout(() => {
      setLoading(true);
      searchMulti(query, resources)
        .then(res => {
          setResults(res);
          setHighlightIndex(-1);

          // 🔥 Autoselección inteligente
          const allRows = res.flatMap(r => r.rows);
          if (allRows.length === 1) {
            const row = allRows[0];
            onSelect?.(row, resources.find(r => r.table === res[0].table)!);
            setQuery("");
            setResults([]);
            inputRef.current?.focus();
          }
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(delay);
  }, [query, resources]);

  const handleSelect = (row: any, table: string) => {
    onSelect?.(row, resources.find(r => r.table === table)!);
    setQuery("");
    setResults([]);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allRows = results.flatMap((r) => r.rows.map((row) => ({ row, table: r.table })));

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < allRows.length - 1 ? prev + 1 : 0));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : allRows.length - 1));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      // Si hay highlight, seleccionar ese
      if (highlightIndex >= 0 && allRows[highlightIndex]) {
        handleSelect(allRows[highlightIndex].row, allRows[highlightIndex].table);
      }
      // Si no hay highlight, pero hay resultados → seleccionar primero
      else if (allRows.length > 0) {
        handleSelect(allRows[0].row, allRows[0].table);
      }
    }
  };

  const allRows = results.flatMap((res) =>
    res.rows.map((row, i) => ({ row, table: res.table, idx: i }))
  );

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Buscar..."}
        className="border rounded w-full p-2"
      />

      {loading && <p className="absolute top-full mt-1 text-sm text-gray-500">Buscando...</p>}

      {allRows.length > 0 && (
        <ul className="absolute z-10 w-full bg-black border rounded mt-1 max-h-60 overflow-auto shadow-lg">
          {allRows.map(({ row, table }, i) => (
            <li
              key={`${table}-${i}`}
              className={`p-2 cursor-pointer ${
                i === highlightIndex ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              onClick={() => handleSelect(row, table)}
            >
              {row.nombre || row.sku || JSON.stringify(row)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
