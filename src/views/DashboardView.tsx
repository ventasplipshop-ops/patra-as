import { useEffect, useState } from "react";
import { performAction } from "../actions/performAction";
import VentasHeatmap from "../components/metrics/VentasHeatmap";
import VentasMensuales from "../components/metrics/VentasMensuales";
import TopProductos from "../components/metrics/TopProductos";
import PagosDonut from "../components/metrics/PagosDonut";
import VentasDiariasBar from "../components/metrics/VentasDiariasBar";
import ExportCSVButton from "../components/metrics/funciones/ExportCSVButton";

interface VentaDiaria {
  fecha: string;
  cantidad_ventas: number;
  monto_total: number;
  ticket_promedio: number;
}

interface PagoDiario {
  fecha: string;
  metodo: string;
  total_monto: number;
  cantidad: number;
}

export default function DashboardView() {
  const [ventas, setVentas] = useState<VentaDiaria[]>([]);
  const [pagos, setPagos] = useState<PagoDiario[]>([]);

  useEffect(() => {
    (async () => {
      const ventasRes = await performAction("getVentasDiarias", undefined);
      if (ventasRes.ok) setVentas(ventasRes.ventas);

      const pagosRes = await performAction("getPagosDiarios", undefined);
      if (pagosRes.ok) {
        // Solo mostrar últimos 2 días
        const limit = pagosRes.pagos.filter((p: PagoDiario, i: number) => i < 20);
        setPagos(limit);
      }
    })();
  }, []);

  const ultimaVenta = ventas[0];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">📊 Dashboard</h1>
      <ExportCSVButton />

      {/* Grid principal */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Tarjetas + pagos */}
        <div className="space-y-6">
          {/* Tarjetas de resumen en una sola línea */}
            {ultimaVenta ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="rounded-xl border p-3 shadow bg-white flex flex-col items-center justify-center">
                <h2 className="text-xs text-gray-500">Monto total</h2>
                <p className="text-lg font-bold">${ultimaVenta.monto_total.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border p-3 shadow bg-white flex flex-col items-center justify-center">
                <h2 className="text-xs text-gray-500">Cantidad de ventas</h2>
                <p className="text-lg font-bold">{ultimaVenta.cantidad_ventas}</p>
                </div>
                <div className="rounded-xl border p-3 shadow bg-white flex flex-col items-center justify-center">
                <h2 className="text-xs text-gray-500">Ticket promedio</h2>
                <p className="text-lg font-bold">${ultimaVenta.ticket_promedio.toFixed(2)}</p>
                </div>
            </div>
            ) : (
            <p className="text-gray-500">Cargando ventas...</p>
            )}


          {/* Tabla de pagos compacta */}
          <div className="rounded-xl border shadow bg-white">
            <h2 className="text-sm font-semibold p-3 border-b">
              Métodos de pago (últimos 2 días)
            </h2>
            <div className="max-h-48 overflow-y-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1 text-left">Fecha</th>
                    <th className="border px-2 py-1 text-left">Método</th>
                    <th className="border px-2 py-1 text-right">Monto</th>
                    <th className="border px-2 py-1 text-right">Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-2 py-1">{p.fecha}</td>
                      <td className="border px-2 py-1">{p.metodo}</td>
                      <td className="border px-2 py-1 text-right">
                        ${p.total_monto.toLocaleString()}
                      </td>
                      <td className="border px-2 py-1 text-right">{p.cantidad}</td>
                    </tr>
                  ))}
                  {pagos.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="border px-2 py-1 text-center text-gray-500"
                      >
                        Sin datos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <VentasMensuales />
        {/* Gráficos adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PagosDonut />
        <VentasDiariasBar />
      </div>
      
        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VentasHeatmap />
          
        </div>                
      </div>

      {/* Ranking de productos al final */}
      <TopProductos limit={8} />
    </div>
  );
}
