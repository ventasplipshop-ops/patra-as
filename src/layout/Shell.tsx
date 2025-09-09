import React, { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import SidebarOverlay from "../modules/sidebar/SidebarOverlay";
import RightToolsDrawer from "../modules/tools/RightToolsDrawer";
import BottomHistoryDrawer from "../modules/history/BottomHistoryDrawer";
import CajaView from "../views/CajaView";
import DepositoView from "../views/DepositoView";
import type { SaleDraft } from "../api";
import ConsignasModal from "../components/ConsignasModal";
import TopProductosModal from "../components/TopProductosModal";
import RegistrarPedidoMLModal from "../components/RegistrarPedidoMLModal";
import GestionPedidosMLModal from "../components/GestionPedidosMLModal";
import CierreCajaModal from "../components/CierreCajaModal";
import ClienteModal from "../components/CustomerModal";


type Vista = "caja" | "deposito";

export default function Shell() {
  const [vista, setVista] = useState<Vista>("caja");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openPresupuestos, setOpenPresupuestos] = useState(false);
  const [consignasOpen, setConsignasOpen] = useState(false);
  const [TopTenOpen, setTopTenOpen] = useState(false);
  const [pedidoMLOpen, setPedidoMLOpen] = useState(false);
  const [gestionarMLOpen, setGestionarMLOpen] = useState(false);
  const [CierreCajaOpen, setCierreCajaOpen] = useState(false);
  const [CustomerModalOpen, setCustomerModalOpen] = useState(false);


  return (
    <div className="h-dvh flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />

      <div className="flex-1 overflow-hidden px-4 py-6">
        <div className="relative h-full rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div
            className={`p-4 h-full overflow-auto transition-all ${
              vista === "caja" && historyOpen ? "pb-72" : ""
            }`}
          >
            {vista === "caja" ? (
              <CajaView 
                onOpenHistory={() => setHistoryOpen(true)}
                openPresupuestos={openPresupuestos}
                onClosePresupuestos={() => setOpenPresupuestos(false)}
                
              />
            ) : (
              <DepositoView 
              
              
              />
            )}
          </div>

          {/* Botón para abrir/cerrar herramientas */}
          <button
            onClick={() => setToolsOpen((o) => !o)}
            className="absolute top-4 -right-3 w-7 h-16 rounded-l-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow z-50"
            aria-label={toolsOpen ? "Ocultar herramientas" : "Mostrar herramientas"}
          >
            {toolsOpen ? "›" : "‹"}
          </button>

          {/* Drawer lateral derecho */}
          <RightToolsDrawer
            open={toolsOpen}
            vista={vista}
            onClose={() => setToolsOpen(false)}
            onToolSelect={(tool) => {
              
              if (tool === "Cargar presupuestos") {
                setOpenPresupuestos(true);
                // acá podés setear un estado para abrir modal en CajaView
              }
              if (tool === "Ver consignas") setConsignasOpen(true);
              if (tool === "TopTen") setTopTenOpen(true);
              if (tool === "Registrar pedido ML") setPedidoMLOpen(true);
              if (tool === "Gestionar pedidos ML") setGestionarMLOpen(true);
              if (tool === "Cierre de caja") setCierreCajaOpen(true);
              if (tool === "Agregar cliente") setCustomerModalOpen(true);
              
            }}
          />
          <ConsignasModal open={consignasOpen} onClose={() => setConsignasOpen(false)} />
          <TopProductosModal open={TopTenOpen} onClose={() => setTopTenOpen(false)} /> 
          <RegistrarPedidoMLModal open={pedidoMLOpen} onClose={() => setPedidoMLOpen(false)} /> 
          <GestionPedidosMLModal open={gestionarMLOpen} onClose={() => setGestionarMLOpen(false)}/>
          <CierreCajaModal open={CierreCajaOpen} onClose= {() => setCierreCajaOpen(false)} />
            <ClienteModal open={CustomerModalOpen} onClose= {() => setCustomerModalOpen(false)} />
          {/* Drawer inferior para historial */}
          <BottomHistoryDrawer
            open={vista === "caja" && historyOpen}
            onClose={() => setHistoryOpen(false)}
          />
        </div>
      </div>

      {/* Sidebar lateral izquierdo */}
      <SidebarOverlay
        open={sidebarOpen}
        vistaActual={vista}
        onClose={() => setSidebarOpen(false)}
        onSelectVista={(v) => {
          setVista(v);
          setHistoryOpen(false);
          setSidebarOpen(false);
        }}
      />

      <Footer />
    </div>
  );
}
