import { useEffect, useMemo, useRef, useState } from "react";

export type Option<V extends string | number = string> = {
  value: V;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export interface DropdownProps<V extends string | number = string> {
  value: V | null;
  onChange: (v: V) => void;
  options: Option<V>[];
  placeholder?: string;
  className?: string;
  searchable?: boolean;      // si true, muestra input para filtrar
  disabled?: boolean;
  maxHeight?: number;        // px para la lista (default 240)
}

export default function Dropdown<V extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  className = "",
  searchable = false,
  disabled = false,
  maxHeight = 240,
}: DropdownProps<V>) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const btnRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        (o.hint?.toLowerCase().includes(term) ?? false)
    );
  }, [options, q]);

  // cerrar con click afuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // navegación con teclado
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => {
          let next = i;
          do {
            next = (next + 1) % filtered.length;
          } while (filtered[next]?.disabled && next !== i);
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => {
          let next = i < 0 ? filtered.length - 1 : i;
          do {
            next = (next - 1 + filtered.length) % filtered.length;
          } while (filtered[next]?.disabled && next !== i);
          return next;
        });
      } else if (e.key === "Enter") {
        if (activeIdx >= 0 && filtered[activeIdx] && !filtered[activeIdx].disabled) {
          onChange(filtered[activeIdx].value);
          setOpen(false);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIdx, onChange]);

  // reset índice activo cuando cambia lista o se abre
  useEffect(() => {
    setActiveIdx(filtered.findIndex((o) => !o.disabled));
  }, [open, q, filtered.length]);

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm 
          ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800"}
          border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate flex items-center gap-2">
          {selected?.icon}
          {selected ? selected.label : <span className="text-gray-500">{placeholder}</span>}
        </span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-sm outline-none"
              />
            </div>
          )}
          <ul
            role="listbox"
            style={{ maxHeight }}
            className="overflow-auto divide-y divide-gray-100 dark:divide-gray-800"
          >
            {filtered.map((o, idx) => {
              const active = idx === activeIdx;
              return (
                <li
                  key={`${o.value}`}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => {
                    if (o.disabled) return;
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between
                    ${o.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800"}
                    ${active ? "bg-gray-50 dark:bg-gray-800" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                  </div>
                  {o.hint && <span className="text-[11px] text-gray-500 ml-2">{o.hint}</span>}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
