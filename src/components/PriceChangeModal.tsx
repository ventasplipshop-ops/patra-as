import { useMemo, useState } from "react";
import Button from "./ui/Button";

export interface ItemPreview {
  id: number;
  nombre: string | null;
  precio: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (porcentaje: number, modo: "increase" | "revert") => void;
  selectedCount: number;
  items: ItemPreview[];
}

export default function PriceChangeModal({
  open,
  onClose,
  onConfirm,
  selectedCount,
  items,
}: Props) {
  const [porcentaje, setPorcentaje] = useState<number>(10);
  const [modo, setModo] = useState<"increase" | "revert">("increase");



  const preview = useMemo(() => {
    return items.map((item) => {
      let nuevo = item.precio;

      if (modo === "increase") {
        const conAumento = item.precio * (1 + porcentaje / 100);
        nuevo = Math.ceil(conAumento / 100) * 100;
      } else {
        const base = item.precio / (1 + porcentaje / 100);
        nuevo = Math.floor(base / 100) * 100;
      }

      return { ...item, nuevo };
    });
  }, [items, porcentaje, modo]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-5 w-[480px] space-y-4">

        <h3 className="text-lg font-semibold">
          💰 Modificar precios ({selectedCount})
        </h3>

        {/* explicación */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          El porcentaje indica cuánto se ajusta el precio actual.
          <br />
          Ejemplo: 10% → $1000 pasa a $1100 (antes del redondeo).
        </div>

        {/* modo */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModo("increase")}
            className={`p-3 rounded-lg border text-left ${
              modo === "increase"
                ? "bg-green-100 border-green-500"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="font-semibold">➕ Aumentar</div>
            <div className="text-xs text-gray-500">Sube los precios</div>
          </button>

          <button
            onClick={() => setModo("revert")}
            className={`p-3 rounded-lg border text-left ${
              modo === "revert"
                ? "bg-red-100 border-red-500"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="font-semibold">➖ Disminuir</div>
            <div className="text-xs text-gray-500">Baja los precios</div>
          </button>
        </div>

        {/* input */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">%</span>

          <input
            type="number"
            min={0}
            step={1}
            value={porcentaje}
            onChange={(e) => {
              const val = Math.max(0, Number(e.target.value));
              setPorcentaje(val);
            }}
            className="w-24 border rounded px-2 py-1 text-sm text-right"
          />
        </div>

        {/* preview */}
        <div className="border rounded-lg p-3 text-sm">
          <div className="font-semibold mb-2">Vista previa:</div>

          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {preview.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b last:border-none pb-1"
              >
                <span className="truncate">{item.nombre ?? "—"}</span>
                <span>
                  ${item.precio} → <b>${item.nuevo}</b>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* acciones */}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onConfirm(porcentaje, modo)}
            disabled={porcentaje <= 0}
          >
            Aplicar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}