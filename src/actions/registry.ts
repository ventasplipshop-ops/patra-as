// src/actions/registry.ts
import type { ActionRegistry, ActionHandler } from "./types";
import { registrarVenta, registrarCliente, registrarCierreCaja, crearSugerencia, getDrafts, saveDraft, deleteDraft, fetchConsignas, fetchConsignaDetalle, addPagoConsigna, getTopProductosMes, fetchVentaCompleta, registrarDevolucion, modificarVenta, registrarClick, getCierreCaja, registrarAperturaCaja, getAperturaCaja, type AperturaCaja, updateDraftStatus, registrarPedidoML, getPedidosML, updatePedidoMLItems } from "../api";

const saveSale: ActionHandler<"saveSale"> = async (args) => {
  const id = await registrarVenta(args);
  if (!id) return { ok: false, error: "No se pudo registrar venta" };
  return { ok: true, saleId: id };
};

const saveCustomer: ActionHandler<"saveCustomer"> = async (args) => {
  const id = await registrarCliente({
    tipo: args.tipo,
    email: args.email,
    nombre: args.nombre,
    apellido: args.apellido,
    razon_social: args.razon_social ?? null,
    dni: args.dni ?? null,
    cuit: args.cuit ?? null,
    telefono: args.telefono,
    direccion: args.direccion,
    created_by: args.created_by,
  });

  if (!id) return { ok: false, error: "No se pudo registrar cliente" };
  return { ok: true, id };
};



const createSuggestion: ActionHandler<"createSuggestion"> = async (args) => {
  const sug = await crearSugerencia({
    userId: args.userId,
    contexto: args.contexto,
    nota: args.nota,
  });
  if (!sug) return { ok: false, error: "No se pudo crear sugerencia" };
  return { ok: true, ...sug };
};

const getDraftsAction: ActionHandler<"getDrafts"> = async () => {
  try {
    const drafts = await getDrafts();
    return { ok: true, drafts };
  } catch (err) {
    return { ok: false, error: "No se pudieron cargar borradores" };
  }
};

const saveDraftAction: ActionHandler<"saveDraft"> = async ({ draft, userId }) => {
  try {
    const numero = await saveDraft(draft, userId); // 👈 ahora es int
    if (!numero) return { ok: false, error: "No se pudo guardar borrador" };
    return { ok: true, id : numero }; // 👈 devolvemos número
  } catch (err) {
    return { ok: false, error: "Error inesperado guardando borrador" };
  }
};

const deleteDraftAction: ActionHandler<"deleteDraft"> = async ({ id }) => {
  try {
    await deleteDraft(id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "No se pudo borrar borrador" };
  }
};

const getConsignasAction: ActionHandler<"getConsignas"> = async () => {
  try {
    const consignas = await fetchConsignas();
    return { ok: true, consignas };
  } catch (err) {
    return { ok: false, error: "No se pudieron cargar consignas" };
  }
};

const getConsignaDetalleAction: ActionHandler<"getConsignaDetalle"> = async ({ ventaId }) => {
  try {
    const { detalles, pagos } = await fetchConsignaDetalle(ventaId);
    return { ok: true, detalles, pagos };
  } catch (err) {
    return { ok: false, error: "No se pudo cargar detalle consigna" };
  }
};

const addConsignaPagoAction: ActionHandler<"addConsignaPago"> = async ({
  ventaId,
  metodo,
  monto,
}) => {
  try {
    const res = await addPagoConsigna(ventaId, metodo, monto);
    if (!res.ok) return { ok: false, error: "No se pudo registrar pago" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Error inesperado" };
  }
};

const getTopProductos: ActionHandler<"getTopProductos"> = async ({ limit }) => {
  const productos = await getTopProductosMes(limit);
  return { ok: true, productos };
};

const getSaleDetailAction: ActionHandler<"getSaleDetail"> = async ({ ventaId }) => {
  const venta = await fetchVentaCompleta(ventaId);
  if (!venta) return { ok: false, error: "No se pudo obtener venta" };
  return { ok: true, venta };
};

const saveDevolucion: ActionHandler<"saveDevolucion"> = async (args) => {
  const id = await registrarDevolucion(args);
  if (!id) return { ok: false, error: "No se pudo registrar devolución" };
  return { ok: true, devolucionId: id };
};


const modifySale: ActionHandler<"modifySale"> = async (args) => {
  const id = await modificarVenta(args);
  if (!id) return { ok: false, error: "No se pudo modificar la venta" };
  return { ok: true, modificacionId: id };
};

const registerClick: ActionHandler<"registerClick"> = async ({ userId, boton }) => {
  const res = await registrarClick(userId, boton);

  if (!res) return { ok: false, error: "No se pudo registrar el click" };

  return {
    ok: true,
    click: {
      id: res.id,
      user_id: res.user_id,
      button_name: res.button_name,
      created_at: res.created_at,
    },
  };
};


// ====================
// APERTURA / CIERRE DE CAJA
// ====================

const getAperturaCajaAction: ActionHandler<"getAperturaCaja"> = async ({ userId }) => {
  try {
    const apertura = await getAperturaCaja(userId);
    if (!apertura) return { ok: false, error: "No hay apertura de caja activa." };
    return { ok: true, apertura };
  } catch {
    return { ok: false, error: "Error al obtener apertura de caja" };
  }
};

const openRegister: ActionHandler<"openRegister"> = async ({ userId, monto }) => {
  try {
    const data = await registrarAperturaCaja({ userId, monto });
    const apertura = data?.[0] as AperturaCaja | undefined;
    if (!apertura) return { ok: false, error: "No se pudo registrar apertura de caja" };
    return { ok: true, apertura };
  } catch {
    return { ok: false, error: "Error inesperado al abrir caja" };
  }
};

const getCierreCajaAction: ActionHandler<"getCierreCaja"> = async ({ userId }) => {
  try {
    const cierre = await getCierreCaja(userId);
    return { ok: true, cierre };
  } catch {
    return { ok: false, error: "No se pudo obtener cierre de caja" };
  }
};

const closeRegister: ActionHandler<"closeRegister"> = async ({ userId, amount }) => {
  try {
    await registrarCierreCaja({ userId, amount });
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo registrar cierre de caja" };
  }
};


const updateDraftStatusAction: ActionHandler<"updateDraftStatus"> = async ({
  id,
  estado,
  userId,
  pagos,
}) => {
  const res = await updateDraftStatus(id, estado, userId, pagos);
  if (!res.ok) {
    return { ok: false, error: res.error ?? "Error desconocido" }; // 👈 siempre string
  }
  return { ok: true };
};



const registrarPedidoMLAction: ActionHandler<"registrarPedidoML"> = async (args) => {
  try {
    const res = await registrarPedidoML(
      args.p_ml_order_id,
      args.p_observaciones ?? null,
      args.p_items ?? null,
      args.p_user_id
    );

    if (!res) {
      return { ok: false, error: "No se pudo registrar/actualizar pedido" };
    }

    return { ok: true, mensaje: String(res) }; // 👈 forzamos a string
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Error inesperado" };
  }
};


const getPedidosMLAction: ActionHandler<"getPedidosML"> = async () => {
  try {
    const pedidos = await getPedidosML();
    return { ok: true, pedidos };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "No se pudieron obtener pedidos ML" };
  }
};

const updatePedidoMLItemsAction: ActionHandler<"updatePedidoMLItems"> = async ({ id, items, userId }) => {
  try {
    await updatePedidoMLItems(id, items, userId);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "No se pudieron actualizar items" };
  }
};







export const ACTIONS: ActionRegistry = {
  saveSale,
  saveCustomer,
  closeRegister,
  createSuggestion,
  getDrafts: getDraftsAction,
  saveDraft: saveDraftAction,
  deleteDraft: deleteDraftAction,
  getConsignas: getConsignasAction,
  getConsignaDetalle: getConsignaDetalleAction,
  addConsignaPago: addConsignaPagoAction,
  getTopProductos,
  getSaleDetail: getSaleDetailAction,
  saveDevolucion,
  modifySale, 
  registerClick,
  getAperturaCaja: getAperturaCajaAction,
  openRegister,
  getCierreCaja: getCierreCajaAction,
  updateDraftStatus: updateDraftStatusAction,
  registrarPedidoML: registrarPedidoMLAction,
  getPedidosML: getPedidosMLAction,
  updatePedidoMLItems: updatePedidoMLItemsAction,

};
