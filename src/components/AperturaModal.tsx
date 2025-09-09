import { useState } from "react";
import { registrarAperturaCaja } from "../api"; // 👈 ajusta la ruta según tu estructura
import { useAuth } from "../context/AuthContext";

interface AperturaModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AperturaModal({ open, onClose }: AperturaModalProps) {
  const { user } = useAuth();
  const [monto, setMonto] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleAbrirCaja = async () => {
    if (!user?.id) {
      alert("❌ No se encontró usuario autenticado.");
      return;
    }
    if (monto <= 0) {
      alert("⚠️ Ingrese un monto válido.");
      return;
    }

    try {
      setLoading(true);
      await registrarAperturaCaja({ userId: String(user.id), monto });
      alert("✅ Caja abierta correctamente.");
      onClose();
    } catch (err: any) {
      console.error("❌ Error abriendo caja:", err.message);
      alert("❌ Error abriendo caja: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-35">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">🔐 Apertura de Caja</h2>
        <p className="mb-3 text-sm text-gray-600">
          Debe registrar una apertura de caja antes de continuar.
        </p>

        <input
          type="number"
          placeholder="Monto de apertura"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          className="w-full border px-3 py-2 rounded mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded border"
            onClick={() => {
              alert("⚠️ No puede cancelar hasta abrir caja.");
            }}
          >
            Cancelar
          </button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={handleAbrirCaja}
            disabled={loading}
          >
            {loading ? "⏳ Abriendo..." : "Abrir Caja"}
          </button>
        </div>
      </div>
    </div>
  );
}
