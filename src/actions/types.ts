/** ================================
 *  ACTION TYPES (para performAction)
 *  ================================ */
/** -----------------------------------------------------------
 *  Action Types — POS (versión reducida)
 *  ----------------------------------------------------------*/

import type { AperturaCaja, CierreCaja, SaleDraft, VentaCompleta } from "../api";

/** Entidades base */
export interface CartItem {
  sku: string;
  qty: number;
  price: number;
  name?: string;
}

export const paymentMethods = [
  "efectivo",
  "tarjeta",
  "transferencia",
  "uala",
  "brubank",
] as const;

export type PaymentMethod = typeof paymentMethods[number];

export interface Payment {
  method: PaymentMethod;
  amount: number;
  ref?: string;
}

export interface CustomerMinimal {
  id?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

export interface ActionBaseResult {
  ok: boolean;
  error?: string;
}

/** -----------------------------------------------------------
 *  ActionMap (solo las acciones que ya usás)
 *  ----------------------------------------------------------*/
export interface ActionMap {
  /** Guardar venta (cierre) */
  saveSale: {
    args: {
      p_cliente_id: number;
      p_origen: string;
      p_tipo_consumidor: string;
      p_tipo_iva: string;
      p_observaciones: string;
      p_detalles: { sku: string; cantidad: number; precio_unitario: number }[];
      p_pagos: { metodo: string; monto: number }[];
      p_user_id: string;
    };
    result:
      | (ActionBaseResult & { ok: true; saleId: number })
      | (ActionBaseResult & { ok: false });
  };

  /** Guardar cliente */
  saveCustomer: {
    args: {
      tipo: "natural" | "juridico";
      email: string;
      nombre?: string;
      apellido?: string;
      razon_social: string;
      dni?: string;
      cuit?: string;
      telefono?: string;
      direccion?: string;
      created_by: string;
    };
    result:
      | (ActionBaseResult & { ok: true; id: number })
      | (ActionBaseResult & { ok: false });
  };



  /** Crear sugerencia */
  createSuggestion: {
    args: { userId?: string; contexto: Record<string, any>; nota: string };
    result:
      | (ActionBaseResult & { ok: true; id: string })
      | (ActionBaseResult & { ok: false });
  };

  /* ====== Borradores ====== */
  getDrafts: {
    args: void;
    result:
      | (ActionBaseResult & { ok: true; drafts: SaleDraft[] })
      | (ActionBaseResult & { ok: false });
  };

  saveDraft: {
    args: { draft: SaleDraft; userId: string };
    result:
      | (ActionBaseResult & { ok: true; id: number })
      | (ActionBaseResult & { ok: false });
  };

  deleteDraft: {
    args: { id: string };
    result:
      | (ActionBaseResult & { ok: true })
      | (ActionBaseResult & { ok: false });
  };
  
  updateDraftStatus: {
    args: { id: string; estado: string; userId: string; pagos?: { metodo: string; monto: number }[] };
    result:
      | (ActionBaseResult & { ok: true })
      | (ActionBaseResult & { ok: false; error: string });
  };

    /** ========================
   * CONSIGNAS
   * ======================== */
  getConsignas: {
    args: void;
    result:
      | (ActionBaseResult & { ok: true; consignas: any[] })
      | (ActionBaseResult & { ok: false });
  };

  getConsignaDetalle: {
    args: { ventaId: number };
    result:
      | (ActionBaseResult & { ok: true; detalles: any[]; pagos: any[] })
      | (ActionBaseResult & { ok: false });
  };

  addConsignaPago: {
    args: { ventaId: number; metodo: string; monto: number };
    result: ActionBaseResult & { ok: boolean };
  };

  getTopProductos: {
  args: { limit: number };
  result:
    | (ActionBaseResult & {
        ok: true;
        productos: { nombre: string; cantidad: number; importe: number }[];
      })
    | (ActionBaseResult & { ok: false });
};


//traer detalles
getSaleDetail: {
    args: { ventaId: number };
    result:
      | (ActionBaseResult & { ok: true; venta: VentaCompleta })
      | (ActionBaseResult & { ok: false });
  };

    /** Registrar devolución */
  saveDevolucion: {
    args: {
      ventaId: number;
      detalles: { sku: string; cantidad: number; precio_unitario: number }[];
      pagos: { metodo: string; monto: number }[];
      motivo: string;
      userId: string;
    };
    result:
      | (ActionBaseResult & { ok: true; devolucionId: number })
      | (ActionBaseResult & { ok: false });
  };

  /** Modificar venta */
  modifySale: {
    args: {
      ventaId: number;
      motivo: string;
      detalles: { sku: string; cantidad: number; precio_unitario: number }[];
      pagos: { metodo: string; monto: number }[];
      userId: string;
    };
    result:
      | (ActionBaseResult & { ok: true; modificacionId: number })
      | (ActionBaseResult & { ok: false });
  };

  /** Registrar click en botón */
  registerClick: {
    args: { userId: string; boton: string };
    result:
      | (ActionBaseResult & {
          ok: true;
          click: { id: number; user_id: string; button_name: string; created_at: string };
        })
      | (ActionBaseResult & { ok: false });
  };


  // apertura y cierre

  
getAperturaCaja: {
  args: { userId: string };
  result:
    | (ActionBaseResult & { ok: true; apertura: AperturaCaja })
    | (ActionBaseResult & { ok: false });
};

openRegister: {
  args: { userId: string; monto: number };
  result:
    | (ActionBaseResult & { ok: true; apertura: AperturaCaja })
    | (ActionBaseResult & { ok: false; error: string });
};

getCierreCaja: {
  args: { userId: string };
  result:
    | (ActionBaseResult & { ok: true; cierre: CierreCaja })
    | (ActionBaseResult & { ok: false });
};

closeRegister: {
  args: { userId: string; amount: number };
  result:
    | (ActionBaseResult & { ok: true })
    | (ActionBaseResult & { ok: false });
};


// Pedidos ML
getPedidosML: {
  args: void;
  result:
    | (ActionBaseResult & {
        ok: true;
        pedidos: { id: number; ml_order_id: string; estado: string; items: any[] }[];
      })
    | (ActionBaseResult & { ok: false; error: string });
};

updatePedidoMLItems: {
  args: { id: number; items: { sku: string; cantidad: number; precio_unitario: number }[]; userId: string };
  result:
    | (ActionBaseResult & { ok: true })
    | (ActionBaseResult & { ok: false; error: string });
};

registrarPedidoML: {
  args: {
    p_ml_order_id: string;
    p_observaciones?: string | null;
    p_items?: { sku: string; cantidad: number; precio_unitario: number }[];
    p_user_id: string;
  };
  result:
    | (ActionBaseResult & { ok: true; mensaje: string })
    | (ActionBaseResult & { ok: false; error: string });
};



}


/** Helpers */
export type ActionName = keyof ActionMap;
export type ActionArgs<K extends ActionName> = ActionMap[K] extends { args: infer A }
  ? A
  : never;
export type ActionResult<K extends ActionName> = ActionMap[K] extends { result: infer R }
  ? R
  : never;
export type ActionHandler<K extends ActionName> = (args: ActionArgs<K>) => Promise<ActionResult<K>>;
export type ActionRegistry = { [K in ActionName]: ActionHandler<K> };
