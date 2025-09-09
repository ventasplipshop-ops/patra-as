import { useRef, forwardRef, useImperativeHandle } from "react";
import { useReactToPrint } from "react-to-print";
import { PrintTemplate } from "./PrintTemplate";
import { performAction } from "../../actions/performAction";
import { useAuth } from "../../context/AuthContext";

const ImprimirPresupuesto = forwardRef(({
  customer,
  user,
  cartItems,
  subtotal,
  taxType,
  total,
  presupuestoId,
}: any, ref) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: customer
      ? `Presupuesto_${customer.nombre.replace(/\s+/g, "_")}`
      : "Presupuesto",
    pageStyle: `
      @page { margin: 20mm; }
      @media print {
        body * { visibility: hidden !important; }
        .print-container, .print-container * { visibility: visible !important; }
        .print-container { position: absolute; top: 0; left: 0; width: 100%; }
      }
    `,
  });

  // función que combina registro + impresión
  const handleClick = async () => {
    if (authUser?.id) {
      const result = await performAction("registerClick", {
        userId: String(authUser.id),
        boton: "imprimir_presupuesto",
      });

      if (result.ok) {        
        handlePrint(); // 👉 lanzar impresión solo si el registro fue exitoso
      } else {
        alert(`❌ Error registrando impresión: ${result.error}`);
      }
    } else {
      alert("⚠️ Usuario no autenticado");
    }
  };

  useImperativeHandle(ref, () => ({
    print: handleClick,
  }));

  return (
    <div>
      <button
        onClick={handleClick}
        className="px-3 py-2 rounded-lg border bg-blue-600 text-white text-sm"
      >
        🖨️ Imprimir Presupuesto
      </button>

      {/* Contenido oculto para imprimir */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
        <PrintTemplate
          ref={printRef}
          customer={customer}
          user={user}
          cartItems={cartItems}
          subtotal={subtotal}
          taxType={taxType}
          total={total}
          presupuestoId={presupuestoId}
        />
      </div>
    </div>
  );
});

export default ImprimirPresupuesto;
