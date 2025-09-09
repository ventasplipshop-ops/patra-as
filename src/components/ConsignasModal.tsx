import { useState, useEffect } from "react";
import { performAction } from "../actions/performAction";

interface ConsignasModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ConsignasModal({ open, onClose }: ConsignasModalProps) {
  const [consignas, setConsignas] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [montoPago, setMontoPago] = useState(0);
  const [metodo, setMetodo] = useState("efectivo");
  const [loadingPago, setLoadingPago] = useState(false);
  const [successPago, setSuccessPago] = useState(false);

  useEffect(() => {
    if (open) loadConsignas();
  }, [open]);

  const loadConsignas = async () => {
    const res = await performAction("getConsignas", undefined as any);
    if (res.ok) setConsignas(res.consignas);
  };

  const loadDetalle = async (ventaId: number) => {
    const res = await performAction("getConsignaDetalle", { ventaId });
    if (res.ok) {
      setDetalles(res.detalles);
      setPagos(res.pagos.map((p: any) => ({ ...p, monto: Number(p.monto) })));
    }
  };

  // 👉 calculamos total de pagos y saldo restante
  const totalPagos = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const restante = selected ? Math.max(selected.total - totalPagos, 0) : 0;

  useEffect(() => {
    if (selected) setMontoPago(restante);
  }, [selected, restante]);

  const handleAddPago = async () => {
    if (!selected) return;
    if (montoPago <= 0) return alert("El monto debe ser mayor a 0");

    setLoadingPago(true);
    const pagoFinal = Math.min(montoPago, restante);

    const res = await performAction("addConsignaPago", {
      ventaId: selected.id,
      metodo,
      monto: pagoFinal,
    });

    setLoadingPago(false);

    if (res.ok) {
      await loadDetalle(selected.id);

      if (restante - pagoFinal <= 0) {
        // ✅ mostrar feedback de éxito
        setSuccessPago(true);

        // ⏳ volver al listado después de 3 segundos
        setTimeout(async () => {
          setSuccessPago(false);
          setSelected(null);
          await loadConsignas();
        }, 3000);
      } else {
        setMontoPago(restante - pagoFinal);
      }
    } else {
      alert("❌ Error agregando pago");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[700px] max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-3">📦 Consignas</h3>

        {!selected ? (
          <table className="w-full text-sm border">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {consignas.map((c) => {
                const pagada = c.estado?.toLowerCase() === "consigna pagada";
                return (
                  <tr key={c.id} className="border-t">
                    <td>{c.id}</td>
                    <td>
                      {c.cliente?.nombre} {c.cliente?.apellido}
                    </td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>${c.total}</td>
                    <td>
                      {pagada ? (
                        <span className="text-green-600 animate-bounce">
                          😄 Pagada
                        </span>
                      ) : (
                        <span className="text-yellow-600">⏳ Pendiente</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="px-2 py-1 border rounded"
                        onClick={() => {
                          setSelected(c);
                          loadDetalle(c.id);
                        }}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : successPago ? (
          <div className="flex flex-col items-center justify-center py-10">
            <span className="text-5xl animate-bounce text-green-600">🤝</span>
            <p className="mt-3 text-green-600 font-semibold">
              Consigna pagada en su totalidad
            </p>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelected(null)}
              className="mb-3 px-2 py-1 border rounded"
            >
              ← Volver
            </button>
            <h4 className="font-semibold mb-2">Detalle #{selected.id}</h4>
            <ul className="mb-3">
              {detalles.map((d) => (
                <li key={d.id}>
                  {d.cantidad} × {d.sku} (${d.precio_unitario}) → ${d.subtotal}
                </li>
              ))}
            </ul>

            <h4 className="font-semibold mb-2">Pagos</h4>
            <ul className="mb-3">
              {pagos.map((p) => (
                <li key={p.id}>
                  {p.metodo}: ${p.monto} (
                  {new Date(p.created_at).toLocaleString()})
                </li>
              ))}
            </ul>

            <p className="mb-2 text-sm">
              <strong>Total:</strong> ${selected.total} —{" "}
              <strong>Pagado:</strong> ${totalPagos} —{" "}
              <strong>Restante:</strong> ${restante}
            </p>

            <div className="flex gap-2">
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="border rounded px-2"
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="tarjeta">💳 Tarjeta</option>
                <option value="transferencia">🔄 Transferencia</option>
              </select>
              <input
                type="number"
                value={montoPago}
                onChange={(e) =>
                  setMontoPago(Math.min(Number(e.target.value), restante))
                }
                min={0}
                max={restante}
                placeholder="Monto"
                className="border rounded px-2 w-24 text-right"
              />
              <button
                onClick={handleAddPago}
                disabled={restante === 0 || loadingPago}
                className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 flex items-center gap-2"
              >
                {loadingPago ? (
                  <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                ) : (
                  "Agregar Pago"
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

