// src/components/print/PrintTemplate.tsx
import React from "react";
import { formatCurrency } from "../../actions/calculations";
import PrintHeader from "./PrintHeader";

interface PrintTemplateProps {
  customer: any;
  user: any;
  cartItems: any[];
  subtotal: number;
  taxType: string;
  total: number;
  presupuestoId?: number;
}

export const PrintTemplate = React.forwardRef<HTMLDivElement, Omit<PrintTemplateProps, "printRef">>(
  ({ customer, user, cartItems, subtotal, taxType, total, presupuestoId }, printRef) => {
  return (
    <div ref={printRef} className="print-container bg-white p-6">
      <PrintHeader
        title="PRESUPUESTO"
        subtitle="(No válido como factura)"
        reference={presupuestoId ? presupuestoId.toString().padStart(4, "0") : "—"}
      />

      <section className="grid grid-cols-2 gap-4 mt-3 p-2 border rounded text-xs">
        <div>
          <p><strong>Cliente:</strong> {customer?.nombre ?? "—"} {customer?.apellido ?? ""}</p>
          <p><strong>Dirección:</strong> {customer?.direccion ?? "—"}</p>
          <p><strong>Teléfono:</strong> {customer?.telefono ?? "—"}</p>
        </div>
        <div className="text-right">
          <p><strong>Atendido por:</strong> {user?.nombre ?? "—"}</p>
        </div>
      </section>

      <table className="w-full mt-3 border-collapse text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-1 py-1 text-left">Item</th>
            <th className="px-1 py-1 text-left">Código</th>
            <th className="px-1 py-1 text-left">Artículo</th>
            <th className="px-1 py-1 text-right">Cant.</th>
            <th className="px-1 py-1 text-right">Precio</th>
            <th className="px-1 py-1 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((p: any, i: number) => (
            <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-1 py-1">{String(i + 1).padStart(4, "0")}</td>
              <td className="px-1 py-1">{p.sku?.toString().padStart(5, "0") ?? p.id}</td>
              <td className="px-1 py-1">{p.nombre}</td>
              <td className="px-1 py-1 text-right">{p.cantidad}</td>
              <td className="px-1 py-1 text-right">{formatCurrency(p.precio_final ?? p.precio)}</td>
              <td className="px-1 py-1 text-right">
                {formatCurrency(p.cantidad * (p.precio_final ?? p.precio))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="col-span-2" />
        <div className="p-2 border rounded bg-gray-50 space-y-1">
          <p>Subtotal: <strong>{formatCurrency(subtotal)}</strong></p>
          {taxType === "10.5" && (
            <p>IVA 10.5%: <strong>{formatCurrency(subtotal * 0.105)}</strong></p>
          )}
          {taxType === "21" && (
            <p>IVA 21%: <strong>{formatCurrency(subtotal * 0.21)}</strong></p>
          )}
          <p className="text-sm mt-1">
            TOTAL: <strong className="text-blue-600">{formatCurrency(total)}</strong>
          </p>
        </div>
      </div>

      <footer className="mt-4 border-t pt-2 text-xs text-gray-600">
        <ul className="list-disc list-inside space-y-1">
          <li>🟢 Presupuesto válido por 24 horas.</li>
          {taxType === "sin_iva"
            ? <li>📲 Compras Mayoristas al 11 6917-4577</li>
            : <li>💡 Los precios son con IVA incluido.</li>}
          <li>🎁 Descuentos disponibles por compras mayores o clientes frecuentes.</li>
        </ul>
      </footer>
    </div>
  );
}

);
