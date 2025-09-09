# 📦 Módulo de Búsqueda y Selección para POS PlipShop

## 📦 Introducción

Este módulo implementa un conjunto de componentes reutilizables para búsquedas rápidas y selección de opciones dentro del sistema de punto de venta (POS) de **PlipShop**.

El objetivo es **centralizar la lógica de búsqueda contra la base de datos (Supabase/PostgreSQL)**, evitando exponer directamente consultas complejas desde el frontend y permitiendo configurar cada búsqueda de forma declarativa mediante un archivo de recursos (`searchResources.ts`).

### Los componentes están diseñados para:

* Buscar y seleccionar productos, clientes u otros registros.
* Filtrar por procedencia del cliente y tipo de consumidor.
* Integrarse de forma flexible en distintos flujos del POS.
* Mantener el código limpio y fácil de mantener.

---

## 🗺️ Mapa general del sistema de búsqueda

```mermaid
flowchart LR
    UI[🖥️ Interfaz Usuario] --> |Eventos de búsqueda y selección| SearchBar
    SearchBar --> |Recursos configurados (JSON)| searchResources.ts
    SearchBar --> API[🌐 API interna / Supabase RPC]
    searchResources.ts --> API
    API --> |Consulta filtrada| Supabase[(PostgreSQL)]
    Supabase --> |Resultados| API
    API --> SearchBar
    SearchBar --> UI

    subgraph Filtros
        OriginDropdown
        ConsumerDropdown
    end

    UI --> OriginDropdown
    UI --> ConsumerDropdown
```

---

## 📂 Estructura de componentes

| Componente             | Funcín                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **SearchBar**          | Campo de búsqueda con autocompletado y resultados en vivo.                          |
| **OriginDropdown**     | Selector de procedencia del cliente.                                                |
| **ConsumerDropdown**   | Selector del tipo de consumidor.                                                    |
| **searchResources.ts** | Archivo de configuración con recursos (tablas, campos, filtros) para las búsquedas. |
| **types/search.ts**    | Tipos TypeScript para asegurar consistencia en la configuración y props.            |

---

## 📖 Manual de Uso — Componentes de Búsqueda y Selección

### 1. `OriginDropdown`

Selector de procedencia del cliente (**Puerta, Web, Redes, ML**).

**Importación:**

```ts
import OriginDropdown from "../components/dropdowns/OriginDropdown";
```

**Props:**

| Prop     | Tipo                              | Descripción                                 |
| -------- | --------------------------------- | ------------------------------------------- |
| value    | `string \| null`                  | Procedencia seleccionada.                   |
| onChange | `(value: string \| null) => void` | Funcíon que se ejecuta al cambiar el valor. |

**Ejemplo:**

```tsx
const [origin, setOrigin] = useState<string | null>("Puerta");
<OriginDropdown value={origin} onChange={setOrigin} />
```

---

### 2. `ConsumerDropdown`

Selector del tipo de consumidor (**Minorista, Mayorista, Final, Monotributo**).

**Importación:**

```ts
import ConsumerDropdown from "../components/dropdowns/ConsumerDropdown";
```

**Props:**

| Prop     | Tipo                              | Descripción                                 |
| -------- | --------------------------------- | ------------------------------------------- |
| value    | `string \| null`                  | Tipo de consumidor seleccionado.            |
| onChange | `(value: string \| null) => void` | Funcíon que se ejecuta al cambiar el valor. |

**Ejemplo:**

```tsx
const [consumer, setConsumer] = useState<string | null>("Minorista");
<ConsumerDropdown value={consumer} onChange={setConsumer} />
```

---

### 3. `SearchBar`

Componente de búsqueda que se conecta a la API para consultar en una o varias tablas (**recursos**).

**Importación:**

```ts
import SearchBar from "../components/search/SearchBar";
import { resourcesClientes, resourcesProductos } from "../config/searchResources";
```

**Props:**

| Prop        | Tipo                        | Descripción                                      |
| ----------- | --------------------------- | ------------------------------------------------ |
| placeholder | `string`                    | Texto que aparece en el campo de búsqueda.       |
| resources   | `SearchResource[]`          | Lista de recursos/tablas y campos donde buscar.  |
| onSelect    | `(row: any) => void`        | Función que recibe la fila seleccionada.         |
| renderRow   | `(row: any) => JSX.Element` | Render personalizado de cada fila de resultados. |

**Ejemplo: Búsqueda de clientes**

```tsx
<SearchBar
  placeholder="DNI / nombre / email…"
  resources={resourcesClientes}
  onSelect={(row) => {
    console.log("Cliente seleccionado:", row);
  }}
  renderRow={(row) => (
    <div className="flex justify-between">
      <div>
        <strong>{row.nombre} {row.apellido}</strong>
        <div className="text-xs">{row.dni} · {row.email}</div>
      </div>
      <span className="text-xs">{row.telefono}</span>
    </div>
  )}
/>
```

**Ejemplo: Búsqueda de productos**

```tsx
<SearchBar
  placeholder="SKU / nombre / descripción…"
  resources={resourcesProductos}
  onSelect={(row) => {
    console.log("Producto seleccionado:", row);
  }}
  renderRow={(row) => (
    <div className="flex justify-between">
      <div>
        <strong>{row.nombre}</strong>
        <div className="text-xs">{row.sku}</div>
      </div>
      <div className="text-right">
        <div>Stock: {row.stock}</div>
        <div>$ {Number(row.precio).toLocaleString("es-AR")}</div>
      </div>
    </div>
  )}
/>
```

---

### 4. Definición de recursos (`searchResources.ts`)

Aquí se definen las tablas, campos y filtros usados en las búsquedas.

```ts
import { SearchResource } from "../types/search";

export const resourcesClientes: SearchResource[] = [
  {
    table: "clientes",
    fields: ["nombre", "apellido", "dni", "email"],
    select: "id, nombre, apellido, dni, email, telefono",
    limit: 20,
    tag: "Clientes"
  }
];

export const resourcesProductos: SearchResource[] = [
  {
    table: "inventario",
    fields: ["sku", "nombre", "description"],
    select: "id, sku, nombre, stock, precio",
    where: { stock: ">0" },
    limit: 25,
    tag: "Productos"
  }
];
```

---

## 🎯 Acciones con Botones

Podés ejecutar acciones predefinidas en tu **registro de acciones** (`registry.ts`) usando el helper `performAction`.

**Ejemplo: Botón para agregar un producto al carrito**

```tsx
import Button from "../components/ui/Button";
import { performAction } from "../actions/performAction";

function AddProductButton({ productId }: { productId: number }) {
  const handleAdd = async () => {
    const result = await performAction("addToCart", { productId, quantity: 1 });
    if (result.ok) {
      console.log("Producto agregado");
    } else {
      console.error("Error:", result.error);
    }
  };

  return (
    <Button variant="primary" size="sm" onClick={handleAdd}>
      Agregar al carrito
    </Button>
  );
}
```

**Ejemplo: Ejecutar acción al seleccionar un resultado de búsqueda**

```tsx
import Search from "../components/ui/Search";
import { resourcesProductos } from "../config/searchResources";
import { performAction } from "../actions/performAction";

function ProductSearchWithAction() {
  return (
    <Search
      resources={resourcesProductos}
      placeholder="Buscar productos..."
      onSelect={(row) => {
        performAction("addToCart", { productId: row.id, quantity: 1 });
      }}
    />
  );
}
```

**Ejemplo: Acciones múltiples en una vista**

```tsx
import Button from "../components/ui/Button";
import { performAction } from "../actions/performAction";

function SaleActions({ saleId }: { saleId: number }) {
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={() => performAction("printSale", { saleId })}
      >
        Imprimir
      </Button>

      <Button
        variant="danger"
        onClick={() => performAction("cancelSale", { saleId })}
      >
        Cancelar
      </Button>
    </div>
  );
}
```

---

### 💡 Buenas prácticas

* Validar que la acción **existe en el `registry`** antes de invocarla.
* Usar `result.ok` para manejar éxito o error.
* Mantener `onClick` simples y dejar la lógica dentro de la acción.
#   p a t r a - a s  
 