import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PlusCircle, MinusCircle } from "lucide-react";
import { performAction } from "../actions/performAction";
import type { VentaCompleta } from "../api";
import { useAuth } from "../context/AuthContext";
import AdminAuthModal from "./AdminAuthModal";
import SearchDropdown from "./ui/SearchDropdown";
import { resourcesProductos } from "../config/searchResources";
import type { CartItem } from "../context/CartContext";

export default function HistorialModal({
  ventaId,
  open,
  onClose,
}: {
  ventaId: number;
  open: boolean;
  onClose: () => void;
}) {
  const [venta, setVenta] = useState<VentaCompleta | null>(null);
  const [loading, setLoading] = useState(false);

  const [showDevolucion, setShowDevolucion] = useState(false);
  const [tipoDevolucion, setTipoDevolucion] = useState<"completa" | "parcial" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [reembolso, setReembolso] = useState<{ metodo: string; monto: number }[]>([]);
  const [mensajeFinal, setMensajeFinal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);


  const { user } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);


  const requireAdmin = (action: () => void) => {
    setPendingAction(() => action);
    setAuthOpen(true);
  };

  const handleAdminConfirm = () => {
    if (pendingAction) pendingAction();
    setAuthOpen(false);
    setPendingAction(null);
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      performAction("getSaleDetail", { ventaId }).then((res) => {
        if (res.ok) {
          setVenta(res.venta);
          // inicializamos vacío, el user puede elegir
          setReembolso([]);
        }
        setLoading(false);
      });
    }
  }, [open, ventaId]);

  if (!open) return null;

  async function handleDevolucion() {
    if (!venta) return;

    const detalles =
      tipoDevolucion === "completa"
        ? venta.detalles.map((d) => ({
            sku: d.sku,
            cantidad: d.cantidad,
            precio_unitario: d.precio,
          }))
        : venta.detalles
            .filter((d: any) => d.devolver && d.devolver > 0)
            .map((d: any) => ({
              sku: d.sku,
              cantidad: d.devolver,
              precio_unitario: d.precio,
            }));
    const totalPagado = venta.pagos.reduce((acc, p) => acc + p.monto, 0);
    const totalDevolucion =
  tipoDevolucion === "completa"
    ? totalPagado // 👈 límite real = lo que se pagó
    : detalles.reduce((acc, d) => acc + d.cantidad * d.precio_unitario, 0);

    const totalReembolso = reembolso.reduce((acc, p) => acc + p.monto, 0);

    if (totalReembolso > totalDevolucion) {
      alert("⚠️ El total de reembolso no puede ser mayor que el total pagado");
      return;
    }

    const res = await performAction("saveDevolucion", {
      ventaId: venta.venta.id,
      detalles,
      pagos: reembolso,
      motivo,
      userId: String(user?.id),
    });

    if (res.ok) {
      setMensajeFinal(true);
      setTimeout(() => {
        setMensajeFinal(false);
        setShowDevolucion(false);
        setMotivo("");
        setReembolso([]);
      }, 3000);
    } else {
      alert("❌ " + res.error);
    }
  }



  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-4 max-h-[90vh] overflow-auto"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h2 className="text-lg font-semibold">🧾 Detalle de Venta</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <p className="text-center py-4">⏳ Cargando...</p>
          ) : !venta ? (
            <p className="text-center text-gray-400">No se encontró la venta</p>
          ) : (
            <div>
              <h3 className="font-semibold mb-2">
                Venta #{venta.venta.id} — {venta.cliente?.nombre} {venta.cliente?.apellido}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Fecha: {new Date(venta.venta.created_at).toLocaleString()} · Estado:{" "}
                {venta.venta.estado} · Total: ${venta.venta.total}
              </p>

              <h4 className="font-semibold">Detalles</h4>
              <table className="w-full text-sm mb-3 border">
                <thead>
                  <tr>
                    <th className="p-1 border">SKU</th>
                    <th className="p-1 border">Nombre</th>
                    <th className="p-1 border text-right">Cant.</th>
                    <th className="p-1 border text-right">Precio</th>
                    <th className="p-1 border text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {venta.detalles.map((d, idx) => (
                    <tr key={idx}>
                      <td className="p-1 border">{d.sku}</td>
                      <td className="p-1 border">{d.nombre}</td>
                      <td className="p-1 border text-right">{d.cantidad}</td>
                      <td className="p-1 border text-right">${d.precio}</td>
                      <td className="p-1 border text-right">${d.cantidad * d.precio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 className="font-semibold">Pagos</h4>
{venta.pagos.length === 0 ? (
  <p className="text-sm text-gray-400 mb-4">Sin pagos registrados</p>
) : (
  <table className="w-full text-sm mb-4 border">
    <thead>
      <tr>
        <th className="p-1 border">Método</th>
        <th className="p-1 border text-right">Monto</th>
        <th className="p-1 border">Fecha</th>
      </tr>
    </thead>
    <tbody>
      {venta.pagos.map((p, idx) => (
        <tr key={idx}>
          <td className="p-1 border">{p.metodo}</td>
          <td className="p-1 border text-right">${p.monto}</td>          
        </tr>
      ))}
    </tbody>
  </table>
)}

              <div className="flex gap-2">
                {venta.venta.estado === "entregado" && (
                  <>
                    <button
                      onClick={() =>
                        requireAdmin(() => {
                          setTipoDevolucion("completa");
                          setShowDevolucion(true);
                        })
                      }
                      className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                      ↩️ Devolución Completa
                    </button>
                    <button
                      onClick={() =>
                        requireAdmin(() => {
                          setTipoDevolucion("parcial");
                          setShowDevolucion(true);
                        })
                      }
                      className="px-3 py-1 bg-orange-600 text-white rounded"
                    >
                      ↩️ Devolución Parcial
                    </button>
                  </>
                )}
                <button className="px-3 py-1 bg-blue-600 text-white rounded">🖨️ Reimprimir</button>
              </div>




              {/* Bloque devolución */}
              {showDevolucion && (
                <div className="mt-5 border-t pt-3">
                  {mensajeFinal ? (
                    <p className="text-center text-red-600 font-semibold py-4">
                      😢 Qué triste… esperamos que todo se resuelva pronto.
                    </p>
                  ) : (
                    <>
                      <h4 className="font-semibold mb-2">
                        {tipoDevolucion === "completa"
                          ? "Devolución completa"
                          : "Devolución parcial"}
                      </h4>

                      {tipoDevolucion === "parcial" && (
                        <table className="w-full text-sm mb-3 border">
                          <thead>
                            <tr>
                              <th className="p-1 border">SKU</th>
                              <th className="p-1 border">Nombre</th>
                              <th className="p-1 border text-right">Cant. a devolver</th>
                            </tr>
                          </thead>
                          <tbody>
                            {venta.detalles.map((d, idx) => (
                              <tr key={idx}>
                                <td className="p-1 border">{d.sku}</td>
                                <td className="p-1 border">{d.nombre}</td>
                                <td className="p-1 border text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    max={d.cantidad}
                                    value={(d as any).devolver ?? 0}   // siempre <= cantidad
                                    className="w-16 border rounded px-1"
                                    onChange={(e) => {
                                      let qty = Number(e.target.value);
                                      if (isNaN(qty) || qty < 0) qty = 0;
                                      if (qty > d.cantidad) qty = d.cantidad;
                                      setVenta((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              detalles: prev.detalles.map((det, i) =>
                                                i === idx ? { ...det, devolver: qty } : det
                                              ),
                                            }
                                          : prev
                                      );
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}

                          </tbody>
                        </table>
                      )}

                      <h4 className="font-semibold mb-1">Métodos de reembolso</h4>
                      <ul className="mb-3 max-h-40 overflow-y-auto pr-1">
                        {reembolso.map((p, idx) => (
                          <li key={idx} className="flex items-center gap-2 mb-1">
                            <select
                              value={p.metodo}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReembolso((prev) =>
                                  prev.map((rp, i) => (i === idx ? { ...rp, metodo: val } : rp))
                                );
                              }}
                              className="border rounded px-2 py-1"
                            >
                              <option value="efectivo">Efectivo</option>
                              <option value="tarjeta">Tarjeta</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="uala">Ualá</option>
                              <option value="brubank">Brubank</option>
                            </select>

                            <input
                              type="number"
                              value={p.monto}
                              min={0}
                              max={venta?.venta.total ?? 0} // 👈 límite según total de venta
                              onChange={(e) => {
                                let val = Number(e.target.value);
                                if (val < 0) val = 0;

                                // limitar al total de la venta
                                const max = venta?.venta.total ?? 0;
                                if (val > max) val = max;

                                setReembolso((prev) =>
                                  prev.map((rp, i) => (i === idx ? { ...rp, monto: val } : rp))
                                );
                              }}
                              className="border rounded px-2 py-1 w-24"
                            />

                            <button
                              onClick={() =>
                                setReembolso((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-red-600"
                            >
                              <MinusCircle size={18} />
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* Botón agregar método */}
                      <button
                        onClick={() =>
                          setReembolso((prev) => [
                            ...prev,
                            { metodo: "efectivo", monto: venta?.venta.total ?? 0 }, // 👈 si es devolución completa, arranca con total
                          ])
                        }
                        className="flex items-center gap-1 text-green-600 mb-3"
                      >
                        <PlusCircle size={18} /> Agregar método
                      </button>

                      <textarea
                        placeholder="Motivo de la devolución"
                        className="w-full border rounded p-2 mb-2"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={handleDevolucion}
                          className="px-3 py-1 bg-green-600 text-white rounded"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => {
                            setShowDevolucion(false);
                            setMotivo("");
                            setReembolso([]);
                          }}
                          className="px-3 py-1 bg-gray-400 text-white rounded"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {modoEdicion && (
  <div className="mt-5 border-t pt-3">
    <h4 className="font-semibold mb-2">✏️ Editar venta</h4>

    {/* Tabla editable de productos */}
    <table className="w-full text-sm mb-3 border">
      <thead>
        <tr>
          <th className="p-1 border">SKU</th>
          <th className="p-1 border">Nombre</th>
          <th className="p-1 border text-right">Cantidad</th>
          <th className="p-1 border text-right">Precio</th>
          <th className="p-1 border text-right">Subtotal</th>
          <th className="p-1 border"></th>
        </tr>
      </thead>
      <tbody>
        {venta?.detalles.map((d, idx) => (
          <tr key={idx}>
            <td className="p-1 border">{d.sku}</td>
            <td className="p-1 border">{d.nombre}</td>
            <td className="p-1 border text-right">
              <input
                type="number"
                min={0}
                value={d.cantidad}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVenta((prev) =>
                    prev
                      ? {
                          ...prev,
                          detalles: prev.detalles.map((det, i) =>
                            i === idx ? { ...det, cantidad: val } : det
                          ),
                        }
                      : prev
                  );
                }}
                className="w-16 border rounded px-1"
              />
            </td>
            <td className="p-1 border text-right">${d.precio}</td>
            <td className="p-1 border text-right">
              ${(d.precio * d.cantidad).toFixed(2)}
            </td>
            <td className="p-1 border text-center">
              <button
                onClick={() =>
                  setVenta((prev) =>
                    prev
                      ? {
                          ...prev,
                          detalles: prev.detalles.filter((_, i) => i !== idx),
                        }
                      : prev
                  )
                }
                className="text-red-600"
              >
                ❌
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* Botón para agregar producto */}
    {/* Botón para agregar producto (con buscador) */}
      <div className="mb-3">
        <SearchDropdown
          resources={resourcesProductos}
          placeholder="🔎 Buscar producto SKU / Código / Nombre"
          onSelect={(row) =>
            setVenta((prev) =>
              prev
                ? {
                    ...prev,
                    detalles: [
                      ...prev.detalles,
                      {
                        id: String(row.id),   // 👈 lo forzamos a string
                        sku: row.sku,
                        nombre: row.nombre,
                        precio: row.precio,
                        cantidad: 1,
                      } as CartItem,
                    ],
                  }
                : prev
            )
          }
        />

      </div>



    {/* Editar pagos */}
    <h4 className="font-semibold mb-1">Editar pagos</h4>
    <ul className="mb-3">
      {venta?.pagos.map((p, idx) => (
        <li key={idx} className="flex items-center gap-2 mb-1">
          <select
            value={p.metodo}
            onChange={(e) =>
              setVenta((prev) =>
                prev
                  ? {
                      ...prev,
                      pagos: prev.pagos.map((pg, i) =>
                        i === idx ? { ...pg, metodo: e.target.value } : pg
                      ),
                    }
                  : prev
              )
            }
            className="border rounded px-2 py-1"
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="uala">Ualá</option>
            <option value="brubank">Brubank</option>
          </select>
          <input
            type="number"
            value={p.monto}
            onChange={(e) => {
              const val = Number(e.target.value);
              setVenta((prev) =>
                prev
                  ? {
                      ...prev,
                      pagos: prev.pagos.map((pg, i) =>
                        i === idx ? { ...pg, monto: val } : pg
                      ),
                    }
                  : prev
              );
            }}
            className="border rounded px-2 py-1 w-24"
          />
        </li>
      ))}
    </ul>

    {/* Motivo */}
    <textarea
      placeholder="Motivo de la modificación"
      className="w-full border rounded p-2 mb-2"
      value={motivo}
      onChange={(e) => setMotivo(e.target.value)}
    />

    {/* Botones acción */}
    <div className="flex gap-2">
      <button
        onClick={async () => {
          if (!venta) return;
          const detalles = venta.detalles.map((d) => ({
            sku: d.sku,
            cantidad: d.cantidad,
            precio_unitario: d.precio,
          }));
          const pagos = venta.pagos.map((p) => ({
            metodo: p.metodo,
            monto: p.monto,
          }));

          const res = await performAction("modifySale", {
            ventaId: venta.venta.id,
            motivo,
            detalles,
            pagos,
            userId: String(user?.id),
          });

          if (res.ok) {
            alert("✅ Venta modificada correctamente");
            setModoEdicion(false);
            onClose();
          } else {
            alert("❌ " + res.error);
          }
        }}
        className="px-3 py-1 bg-green-600 text-white rounded"
      >
        Confirmar modificación
      </button>
      <button
        onClick={() => setModoEdicion(false)}
        className="px-3 py-1 bg-gray-400 text-white rounded"
      >
        Cancelar
      </button>
    </div>
  </div>
)}


          <AdminAuthModal
            open={authOpen}
            onClose={() => setAuthOpen(false)}
            onConfirm={handleAdminConfirm}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
