import { useRef, forwardRef, useImperativeHandle } from "react";
import { useReactToPrint } from "react-to-print";
import { PrintTemplate2 } from "./PrintTemplate2";
import { performAction } from "../../actions/performAction";
import { useAuth } from "../../context/AuthContext";

const ImprimirEtiqueta = forwardRef((
  {
    customer,
    cartItems,
    borradorId,
  }: any,
  ref
) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: customer
      ? `Etiqueta_${customer.nombre.replace(/\s+/g, "_")}`
      : "Etiqueta",
    pageStyle: `
        @page { margin: 10mm; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-container { page-break-after: always; }
        }
        `,
  });

  // función que combina registro + impresión
  const handleClick = async () => {
    if (authUser?.id) {
      const result = await performAction("registerClick", {
        userId: String(authUser.id),
        boton: "imprimir_etiqueta",
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
        className="px-3 py-2 rounded-lg border bg-purple-600 text-white text-sm"
      >
        🚚 Imprimir Etiqueta
      </button>

      {/* Contenido oculto para imprimir */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
        <PrintTemplate2
          ref={printRef}
          customer={customer}
          cartItems={cartItems}
          borradorId={borradorId}
        />
      </div>
    </div>
  );
});

export default ImprimirEtiqueta;
