// src/components/ExportCSVButton.tsx
import { fetchVentasCompletas } from "../../../api";

export default function ExportCSVButton() {
  const handleExport = async () => {
    const ventas = await fetchVentasCompletas();

    // Aplanar ventas, detalle y pagos
    const rows: any[] = [];
    ventas.forEach((v: any) => {
      v.detalle_venta.forEach((d: any) => {
        v.pagos.forEach((p: any) => {
          rows.push({
            id_venta: v.id,
            fecha: v.created_at,
            origen: v.origen,
            tipo_consumidor: v.tipo_consumidor,
            tipo_iva: v.tipo_iva,
            total: v.total,
            observaciones: v.observaciones,
            cliente_nombre: v.cliente?.nombre ?? "",
            cliente_apellido: v.cliente?.apellido ?? "",
            cliente_telefono: v.cliente?.telefono ?? "",
            sku: d.sku,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.subtotal,
            metodo_pago: p.metodo,
            monto_pago: p.monto,
          });
        });
      });
    });

    // Convertir a CSV
    const headers = Object.keys(rows[0]);
    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => headers.map((h) => `"${r[h]}"`).join(",")).join("\n");

    // Descargar archivo
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ventas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
    >
      📥 Exportar CSV
    </button>
  );
}
