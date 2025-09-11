import type { CartItem } from "../context/CartContext";
import { supabase } from "../lib/supabase";

// -------------------------
// VENTAS
// -------------------------
export interface DetalleVenta {
  sku: string;
  cantidad: number;
  precio_unitario: number;
}

export interface PagoVenta {
  metodo: string;
  monto: number;
}

export type RegistrarVentaParams = {
  p_cliente_id: number;
  p_origen: string;
  p_tipo_consumidor: string;
  p_tipo_iva: string;
  p_observaciones: string;
  p_detalles: DetalleVenta[];
  p_pagos: PagoVenta[];
  p_user_id: string;
};



export async function registrarVenta(
  params: RegistrarVentaParams
): Promise<number | null> {
  const { data, error } = await supabase.rpc("registrar_venta", {
    ...params,
    p_detalles: params.p_detalles,
    p_pagos: params.p_pagos,
  });

  if (error) {
    console.error("❌ Error al registrar venta:", error.message);
    return null;
  }
  return data;
}

// -------------------------
// INVENTARIO
// -------------------------
export async function fetchInventarioAvanzado(
  term: string = "",
  stockFilter: "all" | "in-stock" | "low-stock" | "out-of-stock" = "all",
  categoria: string | null = null,
  subcategoria: string | null = null,
  rubro: string | null = null,
  temporada: string | null = null
) {
  const { data, error } = await supabase.rpc("buscar_inventario_avanzado", {
    term,
    stock_filter: stockFilter,
    p_categoria: categoria,
    p_subcategoria: subcategoria,
    p_rubro: rubro,
    p_temporada: temporada,
  });

  if (error) {
    console.error("❌ Error al obtener inventario:", error.message);
    return [];
  }
  return data ?? [];
}

// -------------------------
// CLIENTES
// -------------------------

export async function registrarCliente(params: {
  tipo: "natural" | "juridico";
  email: string;
  nombre?: string | null;
  apellido?: string | null;
  razon_social?: string | null;
  dni?: string | null;
  cuit?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  created_by: string;
}): Promise<number | null> {
  const { data, error } = await supabase.rpc("insertar_cliente", {
    p_tipo: params.tipo,
    p_email: params.email,
    p_nombre: params.nombre,
    p_apellido: params.apellido,
    p_razon_social: params.razon_social,
    p_dni: params.dni,
    p_cuit: params.cuit,
    p_telefono: params.telefono,
    p_direccion: params.direccion,
    p_created_by: params.created_by,
  });

  if (error) {
    console.error("❌ Error al registrar cliente:", error.message);
    return null;
  }
  return data;
}




// -------------------------
// SUGERENCIAS
// -------------------------
export async function crearSugerencia(params: {
  userId?: string;
  contexto: Record<string, any>;
  nota: string;
}) {
  const { data, error } = await supabase
    .from("sugerencias")
    .insert({
      user_id: params.userId ?? null,
      contexto: params.contexto,
      nota: params.nota,
    })
    .select("*")
    .single();

  if (error) {
    console.error("❌ Error creando sugerencia:", error);
    return null;
  }
  return data;
}


// -------------------------
// BORRADORES
// -------------------------
export interface SaleDraft {
  numero?: number;
  id?: string;
  clienteId: number | null;
  clienteNombre?: string | null;
  clienteApellido?: string | null;
  clienteTelefono?: string | null;
  clienteDireccion?: string | null;
  estado?: string;
  vistoAt?: string | null;
  empaquetadoInicioAt?: string | null;
  empaquetadoAt?: string | null;
  recepcionAt?: string | null;
  entregadoAt?: string | null;
  items: {
    id: string; 
    sku: string;
    nombre: string;
    cantidad: number;
    precio: number;
  }[];
  total: number;
  createdAt: string;
  pagos?: {
    metodo: string;
    monto: number;
  }[];

}


export async function getDrafts(): Promise<SaleDraft[]> {
  const { data, error } = await supabase
    .from("borradores")
    .select(`
      id,
      cliente_id,
      cliente_nombre,
      cliente_apellido,
      cliente_telefono,
      cliente_direccion,
      numero,
      items,
      total,
      created_at,
      estado,
      visto_at,
      empaquetado_inicio_at,
      empaquetado_at,
      recepcion_at,
      entregado_at
    `)
    .eq("estado", "Pendiente en deposito")
    .order("created_at", { ascending: false });
    

  if (error) {
    console.error("❌ Error cargando borradores", error);
    return [];
  }

  return (
    data?.map((d) => ({
      id: d.id,
      clienteId: d.cliente_id,
      clienteNombre: d.cliente_nombre,
      clienteApellido: d.cliente_apellido,
      clienteTelefono: d.cliente_telefono,
      clienteDireccion: d.cliente_direccion,
      numero: d.numero,
      estado: d.estado ?? "revision",
      vistoAt: d.visto_at,
      empaquetadoInicioAt: d.empaquetado_inicio_at,
      empaquetadoAt: d.empaquetado_at,
      recepcionAt: d.recepcion_at,
      entregadoAt: d.entregado_at,
      items: (d.items ?? []).map((i: any) => ({
        sku: i.sku,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio: i.precio,
      })),
      total: Number(d.total),
      createdAt: d.created_at,
    })) || []
  );
}



export async function saveDraft(draft: SaleDraft, userId: string) {
  const { data, error } = await supabase.rpc("guardar_borrador", {
    p_cliente_id: draft.clienteId,
    p_items: draft.items, // ya vienen en formato {sku, nombre, cantidad, precio}
    p_total: draft.total,
    p_pagos: draft.pagos ?? [],
    p_created_by: userId,
    p_estado: draft.estado ?? null,
  });

  if (error) {
    console.error("Error guardando borrador:", error.message);
  }
  return data as number;
}



export async function deleteDraft(id: string) {
  const { error } = await supabase.from("borradores").delete().eq("id", id);
  if (error) console.error("Error borrando borrador:", error.message);
}


// -------------------------
// BORRADORES - Actualizar Estado
// -------------------------
export async function updateDraftStatus(
  borradorId: string,
  estado: string,
  userId: string,
  pagos?: { metodo: string; monto: number }[]
) {
  const { error } = await supabase.rpc("actualizar_estado_borrador", {
    p_borrador_id: borradorId,
    p_estado: estado,
    p_user_id: userId,
     // 👈 solo se usará en entregado
  });

  if (error) {
    console.error("❌ Error actualizando estado del borrador:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}


// -------------------------
// CONSIGNAS
// -------------------------
export async function fetchConsignas() {
  const { data, error } = await supabase
    .from("ventas")
    .select("id, total, created_at, estado, cliente:clientes(nombre, apellido)")
    .eq("estado", "consigna")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error al traer consignas:", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchConsignaDetalle(ventaId: number) {
  const { data: detalles, error: err1 } = await supabase
    .from("detalle_venta")
    .select("id, sku, cantidad, precio_unitario, subtotal")
    .eq("venta_id", ventaId);

  const { data: pagos, error: err2 } = await supabase
    .from("pagos")
    .select("id, metodo, monto, created_at")
    .eq("venta_id", ventaId)
    .order("created_at", { ascending: true });

  if (err1) console.error("❌ Error detalle consigna:", err1.message);
  if (err2) console.error("❌ Error pagos consigna:", err2.message);

  return { detalles: detalles ?? [], pagos: pagos ?? [] };
}

export async function addPagoConsigna(ventaId: number, metodo: string, monto: number) {
  // insertar pago
  const { error } = await supabase.from("pagos").insert([
    { venta_id: ventaId, metodo, monto },
  ]);
  if (error) {
    console.error("❌ Error insertando pago consigna:", error.message);
    return { ok: false };
  }

  // chequear si ya está pagada
  const { data: venta } = await supabase
    .from("ventas")
    .select("total")
    .eq("id", ventaId)
    .single();

  const { data: pagos } = await supabase
    .from("pagos")
    .select("monto")
    .eq("venta_id", ventaId);

  const totalPagado = pagos?.reduce((acc, p) => acc + Number(p.monto), 0) ?? 0;

  if (venta && totalPagado >= Number(venta.total)) {
    await supabase.from("ventas").update({ estado: "Consigna Pagada" }).eq("id", ventaId);
  }

  return { ok: true };
}

// dashboard caja y deposito

export async function getTopProductosMes(limit: number = 10) {
  const { data, error } = await supabase
    .from("detalle_venta")
    .select(`
      sku,
      cantidad,
      precio_unitario,
      ventas(total, created_at),
      inventario(nombre)
    `)
    .gte(
      "created_at",
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    )
    .limit(limit);

  if (error) {
    console.error("❌ Error cargando top productos:", error.message);
    return [];
  }

  // Agrupar por producto
  const map = new Map<string, { nombre: string; cantidad: number; importe: number }>();

  data.forEach((d: any) => {
    const key = d.sku;
    if (!map.has(key)) {
      map.set(key, {
        nombre: d.inventario?.nombre || d.sku,
        cantidad: 0,
        importe: 0,
      });
    }
    const item = map.get(key)!;
    item.cantidad += d.cantidad;
    item.importe += d.cantidad * d.precio_unitario;
  });

  return Array.from(map.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limit);
}

//FETCH HITORIAL

export async function fetchHistorialVentas(limit: number = 20) {
  const { data, error } = await supabase
    .from("ventas")
    .select(`
      id,
      created_at,
      total,
      estado,
      cliente:clientes(nombre, apellido),
      pagos(metodo, monto)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Error trayendo historial:", error.message);
    return [];
  }

  return data ?? [];
}


// rpc para Traer venta de historial 

export interface VentaCompleta {
  venta: {
    id: number;
    cliente_id: number;
    origen: string;
    tipo_consumidor: string;
    estado: string;
    total: number;
    observaciones?: string;
    created_at: string;
  };
  cliente: {
    id: number;
    nombre: string;
    apellido?: string;
    telefono?: string;
    direccion?: string;
  } | null;
  detalles: CartItem[];
  pagos: PagoVenta[];
}


export async function fetchVentaCompleta(ventaId: number): Promise<VentaCompleta | null> {
  const { data, error } = await supabase.rpc("get_venta_completa", {
    p_venta_id: ventaId,
  });

  if (error) {
    console.error("❌ Error trayendo venta completa:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    venta: {
      id: data.venta.id,
      cliente_id: data.venta.cliente_id,
      origen: data.venta.origen,
      tipo_consumidor: data.venta.tipo_consumidor,
      estado: data.venta.estado,
      total: Number(data.venta.total),
      observaciones: data.venta.observaciones,
      created_at: data.venta.created_at,
    },
    cliente: data.cliente ?? null,
    detalles: (data.detalles ?? []).map((d: any) => ({
      id: d.sku, // lo usamos como id en el front
      sku: d.sku,
      nombre: d.sku, // podés hacer join con inventario si querés mostrar nombre
      cantidad: d.cantidad,
      precio: Number(d.precio_unitario),
    })),
    pagos: (data.pagos ?? []).map((p: any) => ({
      metodo: p.metodo,
      monto: Number(p.monto),
    })),
  };
}


// rpc devolucion 

export interface DetalleDevolucion {
  sku: string;
  cantidad: number;
  precio_unitario: number;
}

export interface PagoDevolucion {
  metodo: string;
  monto: number;
}

export interface RegistrarDevolucionParams {
  ventaId: number;
  detalles: DetalleDevolucion[];
  pagos: PagoDevolucion[];
  motivo: string;
  userId: string;
}

export async function registrarDevolucion(
  params: RegistrarDevolucionParams
): Promise<number | null> {
  const { data, error } = await supabase.rpc("registrar_devolucion", {
    p_venta_id: params.ventaId,
    p_detalles: params.detalles,
    p_pagos: params.pagos,
    p_motivo: params.motivo,
    p_user_id: params.userId,
  });

  if (error) {
    console.error("❌ Error al registrar devolución:", error.message);
    return null;
  }
  return data;
}


// modificaciones 


export async function modificarVenta(params: {
  ventaId: number;
  motivo: string;
  detalles: { sku: string; cantidad: number; precio_unitario: number }[];
  pagos: { metodo: string; monto: number }[];
  userId: string;
}): Promise<number | null> {

   console.log("🟦 Payload enviado a modificar_venta:", JSON.stringify(params, null, 2));
  const { data, error } = await supabase.rpc("modificar_venta", {
    p_venta_id: params.ventaId,
    p_user_id: params.userId,
    p_motivo: params.motivo,
    p_detalles: params.detalles, // 👈 array plano
  p_pagos: params.pagos, 
  });

  if (error) {
    console.error("❌ Error al modificar venta:", error.message);
    return null;
  }
  return data; // devuelve el id de ventas_modificaciones
}



//click logs para contar los clicks en botones


export async function registrarClick(userId: string, boton: string) {
  const { data, error } = await supabase.rpc("registrar_click", {
    p_user_id: userId,
    p_button_name: boton,
  });

  if (error) {
    console.error("❌ Error registrando click:", error.message);
    return null;
  }

  console.log("✅ Click registrado:", data);
  return data; // JSON con id, user_id, button_name, created_at
}

// -------------------------
// CAJA
// -------------------------
// apertura y cierre
export interface AperturaCaja {
  id: string;
  user_id: string;
  monto: number;
  created_at: string;
  closed_at: string | null;
}

export interface CierreCaja {
  id: string;
  user_id: string;
  monto_apertura: number;
  monto_cierre: number;
  created_at: string;
  closed_at: string;
}



// trae la última apertura (o falla si no existe)
export async function getAperturaCaja(userId: string): Promise<AperturaCaja | null> {
  const { data, error } = await supabase
    .from("apertura_caja")
    .select("*")
    .eq("user_id", userId)
    .is("closed_at", null) // 👈 solo aperturas sin cierre
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") { 
    // ⚠️ code 116 = no rows found, lo tratamos como "no hay apertura"
    console.error("[getAperturaCaja] Error:", error.message);
    return null;
  }

  console.log("✅ getAperturaCaja:", data);
  return data as AperturaCaja | null;
}



export async function registrarAperturaCaja({
  userId,
  monto,
}: {
  userId: string;
  monto: number;
}) {
  const { data, error } = await supabase
    .from('apertura_caja')
    .insert({ user_id: userId, monto });
  if (error) throw error;
  return data;
}


export async function getCierreCaja(userId: string): Promise<CierreCaja> {
  // 1) Llamás al RPC sin genéricos
  const { data, error } = await supabase
    .rpc('get_cierre_caja', { p_user_id: userId })

  // 2) Manejo de error
  if (error) {
    console.error('[getCierreCaja] RPC error:', error)
    throw new Error(error.message)
  }

  // 3) Cast y validación de datos
  const rows = (data as CierreCaja[]) ?? []
  if (rows.length === 0) {
    throw new Error('No se encontró cierre de caja para este usuario.')
  }

  // 4) Devolvés el primer (y único) registro
  return rows[0]
}



export async function registrarCierreCaja({
  userId,
  amount,
}: {
  userId: string;
  amount: number;
}): Promise<void> {
  const { error } = await supabase.rpc('registrar_cierre_caja', {
    p_user_id: userId,
    p_monto_cierre: amount,
  });
  if (error) {
    console.error('[registrarCierreCaja] RPC error:', error);
    throw error;
  }
}



// improvisando funcionamiento de ml

export async function registrarPedidoML(
  ml_order_id: string,
  observaciones: string | null,
  items: any[] | null,
  user_id: string
) {
  const { data, error } = await supabase.rpc("registrar_o_actualizar_pedido_ml", {
    p_ml_order_id: ml_order_id,
    p_observaciones: observaciones,
    p_items: items ? JSON.stringify(items) : null,
    p_user_id: user_id,
  });

  if (error) {
    console.error("Error RPC registrarPedidoML:", error);
    throw error;
  }

  return data;
}


export async function getPedidosML() {
  const { data, error } = await supabase.rpc("get_pedidos_ml");
  if (error) throw error;
  return data;
}

export async function updatePedidoMLItems(
  id: number,
  items: { sku: string; cantidad: number; precio_unitario: number }[],
  userId: string
) {
  const { error } = await supabase.rpc("update_pedido_ml_items", {
    p_id: id,
    p_items: items,
    p_user_id: userId,
  });
  if (error) throw error;
}
