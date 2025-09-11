import React, { forwardRef } from "react";
import { Package, Phone, MapPin, User, FileText, BarChart3, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  customer: any;
  cartItems: any[];
  borradorId?: number | null;
}

export const PrintTemplate2 = forwardRef<HTMLDivElement, Props>(
  ({ customer, cartItems, borradorId }, ref) => {
    const peso = `${cartItems.length} articulos`;

    return (
    <div  ref={ref}
    className="print-container " >
      <div        
        className="justify-between bg-white border-2 border-gray-800 w-[7in] min-h-[3in] p-4 flex flex-col gap-3"
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center border-b pb-2">
          <div className="font-bold text-lg">Etiqueta de Envío</div>
          <Package className="text-blue-600" size={28} />
        </div>

        {/* Datos principales */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Destinatario */}
          <div className="border p-2 bg-yellow-50">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <User size={14} /> DESTINATARIO
            </div>
            <div className="text-base font-bold">{customer?.nombre ?? "Cliente"}</div>
          </div>

          {/* Dirección */}
          <div className="border p-2 bg-blue-50">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <MapPin size={14} /> DIRECCIÓN
            </div>
            <div className="text-sm">{customer?.direccion ?? "Sin dirección"}</div>
          </div>

          {/* Teléfono */}
          <div className="border p-2 bg-orange-50">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Phone size={14} /> TELÉFONO
            </div>
            <div className="text-sm">{customer?.telefono ?? "Sin teléfono"}</div>
          </div>

          {/* Notas */}
          <div className="border p-2 bg-red-50">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <FileText size={14} /> NOTAS
            </div>
            <div className="text-sm">{customer?.notas ?? "Sin notas"}</div>
          </div>
        </div>

       

        {/* Footer con QR y peso */}
        <div className="flex justify-between items-center border-t pt-2 mt-2">
          <div>
            <span className="block text-xs text-gray-600">Articulos enviados</span>
            <span className="font-bold">{peso}</span>
          </div>
          <div className="flex flex-col items-center">
            <QRCodeSVG value={String(borradorId ?? "0")} size={64} includeMargin={true} />
            <span className="text-[10px] text-gray-500">#{borradorId ?? "—"}</span>
          </div>
        </div>       
      </div>

              {/* Línea punteada */}
        <div className="border-t border-dashed my-2" />
                {/* Lista de items */}
        <div className="text-xs">
          <div className="font-semibold mb-1">🛒 Ítems del pedido:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {cartItems.map((item, idx) => (
              <li key={idx}>
                {item.nombre} — Cant: {item.cantidad}
              </li>
            ))}
          </ul>
        </div>
    
    </div>
    );
  }
);

