import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { performAction } from "../actions/performAction";

interface RegistrarPedidoMLModalProps {
  open: boolean;
  onClose: () => void;
}

export default function RegistrarPedidoMLModal({ open, onClose }: RegistrarPedidoMLModalProps) {
  const { user } = useAuth();
  const [mlOrderId, setMlOrderId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);


  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // cuando abre el modal, enfoco el input oculto
  useEffect(() => {
    if (open) {
      setMlOrderId("");
      setTimeout(() => hiddenInputRef.current?.focus(), 200);
    }
  }, [open]);


  const handleEnter = () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);

  timeoutRef.current = setTimeout(() => {
    handleRegistrar();
  }, 2000); // espera 2 segundos
};


  const handleScan = (raw: string) => {
    console.log("📦 String recibido:", raw);
    const match = raw.match(/"id":"(\d+)"/);
    if (match) {
      setMlOrderId(match[1]);
      setError(null);
      setMensaje(null);
    } else {
      setError("No se pudo leer el ID del QR");
    }
  };

  const handleRegistrar = async () => {
    if (!mlOrderId) {
      setError("Debes escanear un ID de Mercado Libre");
      return;
    }

    setLoading(true);
    setError(null);
    setMensaje(null);

    try {
      const res = await performAction("registrarPedidoML", {
        p_ml_order_id: mlOrderId,
        p_observaciones: observaciones || undefined,
        p_items: undefined,
        p_user_id: String(user?.id),
      });

      if (res.ok) {
        setMensaje(res.mensaje);
        setMlOrderId("");
        setObservaciones("");
        hiddenInputRef.current?.focus();
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message ?? "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Registrar pedido Mercado Libre</h2>

        {/* input oculto para recibir datos del escáner */}
        <input
          ref={hiddenInputRef}
          type="text"
          className="absolute opacity-0 pointer-events-none"
          onInput={(e) => handleScan((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
                if (e.key === "Enter") {
                e.preventDefault(); // evita submit accidental
                handleEnter();
                }
            }}
          onBlur={() => {
            if (document.activeElement === document.body) {
                hiddenInputRef.current?.focus();
            }
            }}
          
        />

        <div className="flex flex-col gap-3">
          <input
            className="border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            placeholder="ID de Mercado Libre"
            value={mlOrderId}
            onChange={(e) => setMlOrderId(e.target.value)} // fallback manual
          />
          {/* <textarea
            className="border rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            placeholder="Observaciones (opcional)"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          /> */}

          {mensaje && <p className="text-green-600 text-sm">{mensaje}</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleRegistrar}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
