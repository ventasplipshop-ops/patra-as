import type { SearchResource } from "../api/search";

// Productos
export const resourcesProductos: SearchResource[] = [
  {
    table: "inventario",
    fields: ["sku", "nombre", "description", "Cod_var_bar"],
    select: "id, sku, nombre, stock, precio",
    limit: 25,
    tag: "Productos",
    gt: { stock: 0 },  
  },
];

// Clientes
export const resourcesClientes: SearchResource[] = [
  {
    table: "clientes",
    fields: ["dni", "nombre", "apellido", "email", "telefono"],
    select: "id, dni, nombre, apellido, email, telefono, direccion",
    limit: 8,
    tag: "Clientes",
  },
];

// Presupuestos

export const resourcesPresupuestos: SearchResource[] = [
  {
    table: "borradores",
    fields: ["cliente_nombre", "cliente_apellido", "cliente_telefono"], 
    select:
      "id, cliente_id, cliente_nombre, cliente_apellido, cliente_telefono, cliente_direccion, items, total, created_at",
    limit: 20,
    tag: "Presupuestos",
  },
];


// historial de ventas

export const resourcesVentas: SearchResource[] = [
  {
    table: "clientes", // 👉 buscamos en clientes, no en ventas
    fields: ["nombre", "apellido"],
    select: "id, nombre, apellido, direccion, telefono",
    limit: 10,
    tag: "ClientesVentas",
  },
];





//(Opcional) Buscar en JSONB
//Si querés buscar dentro de caracteristicas (jsonb), podés usar:
//fields: ["sku", "nombre", "caracteristicas->>marca", "caracteristicas->>modelo"]