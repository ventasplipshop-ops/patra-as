import { supabase } from "../../lib/supabase";
import { getWeeklyValidity, type CatalogConfig, type CatalogDraft, type CatalogSummary, type CatalogWarning, type HydratedCatalog, type PriceListProduct } from "../../components/print/priceListTypes";

export class CatalogPersistenceUnavailableError extends Error {
  constructor() { super("La migración de Catálogos todavía no fue aplicada en Supabase."); }
}

const isMissingSchema = (error: { code?: string; message?: string } | null) => Boolean(error && (
  ["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code || "") || /catalogos|guardar_catalogo/i.test(error.message || "")
));

export async function fetchCurrentProductsByIds(ids: Array<string | number>) {
  const orderedIds = ids.map(String);
  if (orderedIds.length === 0) return { products: [] as PriceListProduct[], warnings: [] as CatalogWarning[] };
  const { data, error } = await supabase.from("inventario").select("id, sku, nombre, precio").in("id", orderedIds);
  if (error) throw new Error(`No se pudieron consultar los precios actuales: ${error.message}`);
  const byId = new Map((data || []).map((row) => [String(row.id), row]));
  const warnings: CatalogWarning[] = [];
  const products: PriceListProduct[] = [];
  orderedIds.forEach((id) => {
    const row = byId.get(id);
    if (!row) { warnings.push({ productId:id, reason:"missing" }); return; }
    const price = Number(row.precio);
    if (!Number.isFinite(price) || price < 0) { warnings.push({ productId:id, reason:"invalid_price" }); return; }
    products.push({ id:row.id, sku:row.sku, nombre:row.nombre, precio:price });
  });
  return { products, warnings };
}

export async function listCatalogs(): Promise<CatalogSummary[]> {
  const { data, error } = await supabase.from("catalogos").select("id, nombre, estado, visual_config, created_at, updated_at").order("updated_at", { ascending:false });
  if (error) { if (isMissingSchema(error)) throw new CatalogPersistenceUnavailableError(); throw new Error(error.message); }
  const ids = (data || []).map((row) => row.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data:references, error:referenceError } = await supabase.from("catalogo_productos").select("catalogo_id").in("catalogo_id", ids);
    if (referenceError) { if (isMissingSchema(referenceError)) throw new CatalogPersistenceUnavailableError(); throw new Error(referenceError.message); }
    (references || []).forEach((row) => counts.set(row.catalogo_id, (counts.get(row.catalogo_id) || 0) + 1));
  }
  return (data || []).map((row) => ({ id:row.id, name:row.nombre, status:row.estado, segment:row.visual_config?.segment || "papeleria", productCount:counts.get(row.id) || 0, createdAt:row.created_at, updatedAt:row.updated_at }));
}

export async function getCatalog(id: string): Promise<HydratedCatalog> {
  const [{ data:catalog, error }, { data:references, error:referenceError }] = await Promise.all([
    supabase.from("catalogos").select("id, nombre, estado, cta, vigencia, promociones, contact_config, visual_config, created_at, updated_at").eq("id", id).single(),
    supabase.from("catalogo_productos").select("product_id, posicion, categoria").eq("catalogo_id", id).order("posicion"),
  ]);
  if (error || referenceError) {
    const failure = error || referenceError;
    if (isMissingSchema(failure)) throw new CatalogPersistenceUnavailableError();
    throw new Error(failure?.message || "No se pudo abrir el catálogo.");
  }
  const hydrated = await fetchCurrentProductsByIds((references || []).map((row) => row.product_id));
  const categoryById = new Map((references || []).map((row) => [String(row.product_id), row.categoria]));
  const config: CatalogConfig = {
    cta:catalog.cta || "¿Qué necesitás esta semana? Escribinos y te ayudamos a armar tu pedido 💗",
    validity:catalog.vigencia || getWeeklyValidity(),
    promotions:Array.isArray(catalog.promociones) ? catalog.promociones : [],
    contact:{ phone:"11 2878 3367", whatsapp:"11 2878 3367", address:"Av. Jujuy 50, C.A.B.A.", qrUrl:"", ...(catalog.contact_config || {}) },
  };
  return { id:catalog.id, name:catalog.nombre, status:catalog.estado, segment:catalog.visual_config?.segment || "papeleria", products:hydrated.products.map((product) => ({ ...product, categoria:categoryById.get(String(product.id)) || null })), config, createdAt:catalog.created_at, updatedAt:catalog.updated_at, warnings:hydrated.warnings };
}

export async function saveCatalog(draft: CatalogDraft): Promise<string> {
  const products = draft.products.map((product, position) => ({ product_id:String(product.id), posicion:position, categoria:product.categoria || null }));
  const promotions = draft.config.promotions.map((promotion) => ({ ...promotion, imageData:undefined, imageWidth:undefined, imageHeight:undefined }));
  const { data, error } = await supabase.rpc("guardar_catalogo", {
    p_catalogo_id:draft.id || null,
    p_nombre:draft.name,
    p_estado:draft.status,
    p_cta:draft.config.cta,
    p_vigencia:draft.config.validity,
    p_promociones:promotions,
    p_contact_config:draft.config.contact,
    p_visual_config:{ theme:"pastel-waves-v1", segment:draft.segment },
    p_productos:products,
  });
  if (error) { if (isMissingSchema(error)) throw new CatalogPersistenceUnavailableError(); throw new Error(error.message); }
  return String(data);
}
