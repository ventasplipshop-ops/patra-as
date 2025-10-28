import { useRef, useState, useEffect, useMemo } from "react";
import { useCart } from "../context/CartContext";
import SearchDropdown from "../components/ui/SearchDropdown";
import { resourcesProductos, resourcesClientes } from "../config/searchResources";
import { getAperturaCaja, type SaleDraft } from "../api";
import {
  calculateSubtotal,
  calculateTax,
  calculateTotal,
  formatCurrency,
  calculateTotalPayments,
  calculateRemainingBalance,
} from "../actions/calculations";
import { performAction } from "../actions/performAction";
import PresupuestosModal from "../components/ModalPresupuesto";
import { useAuth } from "../context/AuthContext";
import type { Payment, PaymentMethod } from "../actions/types";
import AdminAuthModal from "../components/AdminAuthModal";
import ImprimirPresupuesto from "../components/print/PdfUploader";
import { PaymentMethods } from "../components/PaymentMethods";
import EffectsManager from "../components/effects/EffectsManager";
import { useEffects } from "../components/effects/useEffects";
import AperturaModal from "../components/AperturaModal";
import { delay } from "framer-motion";
import ImprimirEtiqueta from "../components/print/ImprimirEtiqueta";


export default function CajaView({
  onOpenHistory,
  openPresupuestos,
  onClosePresupuestos,
}: {
  onOpenHistory: () => void;
  openPresupuestos: boolean;
  onClosePresupuestos: () => void;
}) {
  const { cart, addItem, removeItem, updateQty, setCart, setClienteId } = useCart();
  const [cliente, setCliente] = useState<any | null>(null);

  // valores por defecto
  const [origen, setOrigen] = useState<"Puerta" | "Web" | "Redes" | "Mercado_libre">("Puerta");
  const [tipoConsumidor, setTipoConsumidor] = useState<
    "minorista" | "mayorista" | "consumidor_final" | "monotributo"
  >("minorista");

  const [discount, setDiscount] = useState(0);
  const [taxType, setTaxType] = useState<"sin_iva" | "medio_iva" | "con_iva">("sin_iva");
  const [pagos, setPagos] = useState<Payment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [tempAmount, setTempAmount] = useState(0);

  // loading de registrar
  const [isRegistering, setIsRegistering] = useState(false);

  // 🔐 modal admin
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "consigna">(null);

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart]);
  const taxRate = taxType === "medio_iva" ? 0.105 : taxType === "con_iva" ? 0.21 : 0;
  const tax = useMemo(() => calculateTax(subtotal, taxRate), [subtotal, taxRate]);
  const total = useMemo(() => calculateTotal(subtotal, discount, tax), [subtotal, discount, tax]);
  const totalPagos = useMemo(() => calculateTotalPayments(pagos), [pagos]);
  const restante = useMemo(() => calculateRemainingBalance(pagos, total), [pagos, total]);
  const [resetKey, setResetKey] = useState(0);
  const { user } = useAuth();

  const { effects, triggerEffect } = useEffects();
  const [presupuestoId, setPresupuestoId] = useState<number  | null>(null);
  const imprimirRef = useRef<{ print: () => void }>(null); 
  const imprimirEtiquetaRef = useRef<{ print: () => void }>(null); 

  const [aperturaModalOpen, setAperturaModalOpen] = useState(false);

  const [estadoDraft, setEstadoDraft] = useState<"Borrador" | "Pendiente en deposito" | "Presupuesto">("Pendiente en deposito");

  // pagos sincronizados
  const paymentOptions = [
    { key: "efectivo", icon: "💵" },
    { key: "tarjeta", icon: "💳" },
    { key: "transferencia", icon: "🔄" },
    { key: "uala", icon: "🦧" },
    { key: "brubank", icon: "🏦" },
  ];

  // Abrir modal
  const handleSelectPayment = (method: PaymentMethod) => {
    const pagado = pagos.reduce((sum, p) => sum + p.amount, 0);
    const restante = Math.max(total - pagado, 0);

    setSelectedMethod(method);
    setTempAmount(restante); // 👈 ahora arranca con lo que falta pagar
    setShowPaymentModal(true);
  };


useEffect(() => {
  if (!user?.id) return;

  const checkApertura = async () => {
    try {
      const res = await performAction("getAperturaCaja", { userId: String(user?.id) });

      if (res.ok && res.apertura) {
        // ✅ Hay apertura → aseguramos que el modal esté cerrado
        setAperturaModalOpen(false);
      } else {
        // ❌ No hay apertura → bloqueamos caja
        setAperturaModalOpen(true);
      }
    } catch (err) {
      console.error("⚠️ Error verificando apertura de caja:", err);
      setAperturaModalOpen(true);
    }
  };

  checkApertura();
}, [user?.id]);




useEffect(() => {
  console.log("🧾 Cliente en Caja:", cliente);
}, [cliente]);


  // Guardar pago
  const handleConfirmPayment = () => {
    if (!selectedMethod || tempAmount <= 0) return;

    setPagos((prev) => [...prev, { method: selectedMethod, amount: tempAmount }]);

    setShowPaymentModal(false);
    setSelectedMethod(null);
    setTempAmount(0);
  };

  const resetCaja = () => {
  setCart([]);
  setCliente(null);
  setPagos([]);
  setDiscount(0);
  setTaxType("sin_iva");
  setSelectedMethod(null);
  setTempAmount(0);
  setResetKey((prev) => prev + 1);
  setEstadoDraft("Pendiente en deposito");     // 👈 resetea el estado
  setPresupuestoId(null);         // 👈 limpia ID presupuesto
};


  // guardar borrador
  const handleSaveDraft = async (estado: "Borrador" | "Pendiente en deposito" | "Presupuesto") => {
  const draft: SaleDraft = {
    clienteId: cliente?.id ?? "1",
    items: cart.map((p) => ({
      id: p.id.toString(),
      sku: p.sku.toString(),
      nombre: p.nombre,
      cantidad: p.cantidad,
      precio: p.precio_final ?? p.precio,
    })),
    total,
    pagos: pagos.map((p) => ({
      metodo: p.method,
      monto: p.amount,
    })),
    createdAt: new Date().toISOString(),
    estado, // 👈 viene del parámetro, no del state
  };

  const result = await performAction("saveDraft", {
    draft,
    userId: String(user?.id),
  });

  if (result.ok && "id" in result) {
    setPresupuestoId(result.id);
    triggerEffect("confeti", 4000);
    alert(`📄 Presupuesto guardado con ID ${result.id}`);
    setShowPaymentModal(false);
    setTimeout(() => {
      resetCaja();
    }, 1000);
    return result.id;
  } else {
    alert(`❌ Error al guardar presupuesto: ${result.error}`);
  }
};


  const handleSaveAndPrint = async () => {
    
    
    setTimeout(() => {
        setEstadoDraft("Pendiente en deposito");
      }, 600);
    const id = await handleSaveDraft(estadoDraft);
    if (!id) {
      alert("❌ No se pudo guardar el presupuesto.");
      return;
    }
    
    setTimeout(() => {
        imprimirEtiquetaRef.current?.print();
      }, 600);
      };


  // registrar venta


  const handleRegistrarVentaConPagos = async (pagosFinal: Payment[]) => {
  const detalles = cart.map((item) => ({
    sku: item.sku.toString(),
    cantidad: item.cantidad,
    precio_unitario: item.precio_final ?? item.precio,
  }));

  const params = {
    p_cliente_id: cliente?.id ? Number(cliente.id) : 1,
    p_origen: origen,
    p_tipo_consumidor: tipoConsumidor,
    p_tipo_iva: taxType,
    p_observaciones: "entregado",
    p_detalles: detalles,
    p_pagos: pagosFinal.map((p) => ({ metodo: p.method, monto: p.amount })),
    p_user_id: String(user?.id),
  };

  console.log("📤 Enviando a RPC (con pagos):", params.p_pagos);

  const result = await performAction("saveSale", params);

  if (result.ok) {
    alert(`✅ Venta registrada con ID ${result.saleId}`);
    resetCaja();
  } else {
    alert(`❌ Error al registrar venta: ${result.error}`);
  }
};

  const handleRegistrarVenta = async () => {
    const detalles = cart.map((item) => ({
      sku: item.sku.toString(),
      cantidad: item.cantidad,
      precio_unitario: item.precio_final ?? item.precio ,
    }));

    const params = {
      p_cliente_id: cliente?.id ? Number(cliente.id) : 1,
      p_origen: origen,
      p_tipo_consumidor: tipoConsumidor,
      p_tipo_iva: taxType,
      p_observaciones: "entregado", // fijo
      p_detalles: detalles,
      p_pagos: pagos
        .filter((p) => p.method && p.amount > 0)
        .map((p) => ({ metodo: p.method, monto: p.amount })),
      p_user_id: String(user?.id),
    };

    console.log("🧾 Enviando venta con pagos:", params.p_pagos);

    console.log("🧾 Pagos listos para enviar:", pagos);

    const result = await performAction("saveSale", params);

    if (result.ok) {
      triggerEffect("confeti", 5000);
      triggerEffect("caraUff", 5000);
      resetCaja();
    } else {
      alert(`❌ Error al registrar venta: ${result.error}`);
    }
  };

  // cargar borrador en la vista
  const handleLoadDraft = (draft: SaleDraft) => {
    console.log("📦 Cargando borrador:", draft);

    if (draft.clienteId) {
      setCliente({
        id: draft.clienteId,
        nombre: draft.clienteNombre ?? "Cliente sin nombre",
        telefono: draft.clienteTelefono ?? "",
      });
      setClienteId(draft.clienteId);
    }

    if (Array.isArray(draft.items) && draft.items.length > 0) {
      setCart(
        draft.items.map((i) => ({
          id: String(i.id ?? ""), // ✅ convertir a string
          sku: String(i.sku ?? ""),
          nombre: i.nombre ?? "Producto sin nombre",
          cantidad: Number(i.cantidad ?? 1),
          precio: Number(i.precio ?? 0),
        }))
      );
    } else {
      console.warn("⚠️ Este borrador no tiene items.");
      setCart([]);
    }
  };



  // hanle cargar o guardar consigna
  const handleRegistrarConsigna = async () => {
    const detalles = cart.map((item) => ({
      sku: item.sku.toString(),
      cantidad: item.cantidad,
      precio_unitario: item.precio_final ?? item.precio,
    }));

    const params = {
      p_cliente_id: cliente?.id ? Number(cliente.id) : 1,
      p_origen: origen,
      p_tipo_consumidor: tipoConsumidor,
      p_tipo_iva: taxType,
      p_observaciones: "consigna", // 👈 diferencia clave
      p_detalles: detalles,
      p_pagos: pagos.map((p) => ({ metodo: p.method, monto: p.amount })),
      p_user_id: String(user?.id),
    };

    const result = await performAction("saveSale", params);

    if (result.ok) {
      triggerEffect("confeti", 5000);
      triggerEffect("caraFeliz", 5000);
      resetCaja();
    } else {
      alert(`❌ Error al registrar consigna: ${result.error}`);
    }
  };

  

  return (
    <div>

      <AperturaModal
            open={aperturaModalOpen}
            onClose={() => setAperturaModalOpen(false)}
          />
          <div className={`space-y-4 h-full ${aperturaModalOpen ? "pointer-events-none opacity-40" : ""}`}>
      <header className="flex flex-row items-center justify-between gap-4 flex-wrap">
        {/* Título */}
        <div>
          <h2 className="text-lg font-semibold">Caja</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Plipshop · Av. Jujuy 50</p>
        </div>

        {/* Botón IVA */}
        <button
          type="button"
          onClick={() => {
            const options: ("sin_iva" | "medio_iva" | "con_iva")[] = ["sin_iva", "medio_iva", "con_iva"];
            const next = options[(options.indexOf(taxType) + 1) % options.length];
            setTaxType(next);
          }}
          className={`px-3 py-2 rounded-lg text-sm border ${
            taxType === "sin_iva"
              ? "bg-white text-black border-gray-400"
              : taxType === "medio_iva"
              ? "bg-gray-500 text-white border-gray-500"
              : "bg-black text-white border-black"
          }`}
        >
          {taxType === "sin_iva" ? "Sin IVA" : taxType === "medio_iva" ? "IVA 10.5%" : "IVA 21%"}
        </button>
        <button onClick={onOpenHistory} className="px-3 py-2 rounded-lg border text-sm">
          Ver Historial
        </button>
        <button
          onClick={async () => {
                      if (cart.length === 0) {
                        alert("⚠️ Debe registrar al menos un producto antes de guardar una consiga culero.");
                        return;
                      }
                      setAdminModalOpen(true)}}
          className="px-3 py-2 rounded-lg border text-sm bg-yellow-500 text-white"
        >
          Consigna
        </button>

        <button
          onClick={() => handleSaveDraft("Borrador")}
          className="px-3 py-2 rounded-lg border text-sm bg-gray-500 text-white"
        >
          💾 Guardar
        </button>

        <ImprimirPresupuesto
        ref={imprimirRef} // 👈 aquí conectamos el ref
        customer={cliente}
        user={user}
        cartItems={cart}
        subtotal={subtotal}
        taxType={taxType}
        total={total}
        presupuestoId={presupuestoId}
        />
        
        {/* boton oculto de imprimir etiqueta */}
        <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
          <ImprimirEtiqueta
            ref={imprimirEtiquetaRef}
            customer={cliente}
            cartItems={cart}
            borradorId={presupuestoId} 
          />
        </div>
        
        {/* Cliente */}
        <div className="relative w-full max-w-xs md:max-w-sm">
          <label className="block text-xs font-medium mb-1">Cliente</label>
          {cliente === null ? (
            <SearchDropdown
              resources={resourcesClientes}
              placeholder="Buscar cliente..."
              onSelect={(row) => setCliente(row)}
            />
          ) : (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 text-sm">
              <div>
                <span className="font-medium">{cliente.nombre}</span>{" "}
                <span className="text-gray-500">({cliente.telefono || "sin teléfono"})</span>
              </div>
              <button
                onClick={() => setCliente(null)}
                className="ml-2 px-2 py-1 rounded-md border text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ❌
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Carrito */}
      <section className="flex gap-3">
        {/* Bloque izquierdo: fijo */}
        <div className="w-80 p-3 rounded-xl border space-y-4">
          {/* Buscar producto */}
          <div>            
            <SearchDropdown
              resources={resourcesProductos}
              placeholder=" 🔎 Buscar producto SKU / Código / Nombre"
              onSelect={(row) =>
                addItem({
                  id: row.id,
                  nombre: row.nombre,
                  sku: row.sku,
                  precio: row.precio,
                  cantidad: 1,
                })
              }
            />
          </div>
          

          {/* Pagos */}
          <div>
            <h4 className="text-sm font-semibold mb-2">¿Te Sirve?</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                      if (cart.length === 0) {
                        alert("⚠️ Debe registrar al menos un producto antes de cerrar la venta.");
                        return;
                      }
                      setShowPaymentModal(true)}}
                className="px-3 py-2 rounded-lg border text-sm"
              >
                💳 Cerrar Venta
              </button>
            </div>            
          </div>
        </div>

        {/* Bloque derecho: ocupa el resto */}
        <div className="flex-1 p-3 rounded-xl border overflow-hidden">
          <div className="px-3 py-2 text-xs uppercase tracking-wide bg-gray-50 dark:bg-gray-900 text-gray-500">
            🛒 Carrito
          </div>
          <div className="max-h-[180px] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="py-2 px-2">Artículo</th>
                  <th className="py-2 px-2 text-right">Cant.</th>
                  <th className="py-2 px-2 text-right">Precio</th>
                  <th className="py-2 px-2 text-right">Subtotal</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-400">
                      🛍 Carrito vacío
                    </td>
                  </tr>
                )}
                {cart.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-2">{p.nombre}</td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min={1}
                        value={p.cantidad}
                        onChange={(e) => updateQty(p.id, Number(e.target.value))}
                        className="w-16 border rounded px-1 text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={p.precio_final ?? p.precio}
                        onChange={(e) =>
                          setCart((prev) =>
                            prev.map((x) =>
                              x.id === p.id ? { ...x, precio_final: Number(e.target.value) } : x
                            )
                          )
                        }
                        className="w-20 border rounded px-1 text-right"
                      />
                    </td>

                    <td className="py-2 px-2 text-right">
                      ${((p.precio_final ?? p.precio) * p.cantidad).toLocaleString("es-AR")}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => removeItem(p.id)}
                        className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Totales */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Totales */}
        <div className="p-3 rounded-xl border">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span>IVA:</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Descuento:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1">
              <span>Total:</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>

          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm">Descuento:</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-20 border rounded px-2 py-1 text-right text-sm"
              placeholder="0"
            />
          </div>

          {/* Modal de presupuestos */}
          <PresupuestosModal
            open={openPresupuestos}
            onClose={onClosePresupuestos}
            onSelectPresupuesto={(p) => handleLoadDraft(p)}
          />
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-96">
                <h3 className="text-lg font-semibold mb-3">💳 Pagos</h3>

                <PaymentMethods
                  total={total}
                  resetTrigger={resetKey}
                  onChange={(p) => setPagos(p)}
                />

                {/* Totales */}
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pagado:</span>
                    <span>{formatCurrency(totalPagos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restante:</span>
                    <span className={restante > 0 ? "text-red-500" : "text-green-600"}>
                      {formatCurrency(restante)}
                    </span>
                  </div>
                </div>

                {/* Botones */}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (cart.length === 0) {
                        alert("⚠️ Debe registrar al menos un producto antes de enviar a depósito.");
                        return;
                      }

                      if (!cliente) {
                        alert("⚠️ Debe seleccionar un cliente antes de enviar a depósito.");
                        return;
                      }

                      if (!cliente.direccion || cliente.direccion.trim() === "") {
                        alert("⚠️ El cliente debe tener una dirección registrada.");
                        return;
                      }
                      await setEstadoDraft ("Pendiente en deposito");
                      await new Promise((resolve) => setTimeout(resolve, 300));
                      // ✅ Si pasa todas las validaciones
                      await handleSaveAndPrint();
                    }}
                    className="px-3 py-2 rounded-lg border bg-green-600 text-white"
                  >
                    👉 📦 Enviar a Depósito
                  </button>
                  <button
                    onClick={async () => {
                      if (cart.length === 0) {
                        alert("⚠️ Debe registrar al menos un producto.");
                        return;
                      }
                      if (pagos.length === 0) {
                        alert("⚠️ Debe seleccionar al menos un medio de pago.");
                        return;
                      }

                      setIsRegistering(true);
                      await handleRegistrarVenta();
                      setIsRegistering(false);
                      setShowPaymentModal(false);
                      resetCaja();
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                    disabled={restante > 0 || isRegistering}
                  >
                    {isRegistering ? "⏳ Registrando..." : "Registrar Venta"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <AdminAuthModal
            open={adminModalOpen}
            onClose={() => setAdminModalOpen(false)}
            onConfirm={() => {
              setAdminModalOpen(false);
              handleRegistrarConsigna();
            }}
          />

          <EffectsManager effects={effects} />

          
        </div>
      </section>
    </div>
    </div>
  );
}
