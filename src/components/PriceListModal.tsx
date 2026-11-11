import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, Eye, FileText, ImageDown, Plus, Printer, Trash2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SearchDropdown from "./ui/SearchDropdown";
import { resourcesProductos } from "../config/searchResources";
import { formatCurrency } from "../actions/calculations";
import logo from "./print/Plip.png";
import catalogBackground from "./print/catalog-background.png";
import pinkBrush from "./print/watercolor-pink.png";
import lavenderBrush from "./print/watercolor-lavender.png";
import { BUSINESS_INFO } from "./print/businessInfo";
import { createPriceListPdf } from "./print/createPriceListPdf";
import { createWhatsAppStatusImage } from "./print/createWhatsAppStatusImage";
import { getWeeklyValidity, type CatalogConfig, type CatalogDraft, type CatalogPromotion, type CatalogSegment, type PriceListProduct } from "./print/priceListTypes";
import { fetchCurrentProductsByIds } from "../modules/catalogos/catalogosApi";
import { hydratePromotionImages, PROMOTION_IMAGE_TYPES, uploadPromotionImage, validatePromotionImage } from "../modules/catalogos/promotionImages";
import TransferenciasPicker, { type TransferenciaReference } from "../modules/transferencias/TransferenciasPicker";
import { catalogImageViewUrl } from "../modules/catalogos/transferenciasAdapter";
import { uuidV4 } from "../utils/uuid";

interface Props { open: boolean; onClose: () => void; initialCatalog?: CatalogDraft | null; onSave?: (catalog: CatalogDraft) => Promise<void>; }

const emptyPromotion = (): CatalogPromotion => ({ id: uuidV4(), name: "", description: "" });
const defaultConfig = (): CatalogConfig => ({
  cta: "¿Qué necesitás esta semana? Escribinos y te ayudamos a armar tu pedido 💗",
  validity: getWeeklyValidity(),
  promotions: [],
  contact: { phone: "11 2878 3367", whatsapp: "11 2878 3367", address: BUSINESS_INFO.address, qrUrl: "" },
});

function normalizeProduct(row: Record<string, unknown>): PriceListProduct | null {
  const id = row.id as string | number | undefined;
  const nombre = typeof row.nombre === "string" ? row.nombre.trim() : "";
  const precio = Number(row.precio);
  if (id == null || !nombre || !Number.isFinite(precio)) return null;
  return { id, nombre, precio, sku: row.sku as string | number | null | undefined, categoria: typeof row.categoria === "string" ? row.categoria : null };
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar un recurso gráfico del catálogo.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer un recurso gráfico del catálogo.")); reader.readAsDataURL(blob);
  });
}

async function svgToPngDataUrl(svg: SVGSVGElement) {
  const serialized = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml" }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error("No se pudo generar el código QR.")); element.src = url;
    });
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d"); if (!context) throw new Error("No se pudo preparar el código QR.");
    context.fillStyle = "#fff"; context.fillRect(0, 0, 256, 256); context.drawImage(image, 0, 0, 256, 256);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

function printPdf(doc: ReturnType<typeof createPriceListPdf>) {
  doc.autoPrint();
  const url = URL.createObjectURL(doc.output("blob"));
  const frame = document.createElement("iframe"); frame.style.position = "fixed"; frame.style.right = "0"; frame.style.bottom = "0"; frame.style.width = "1px"; frame.style.height = "1px"; frame.style.border = "0"; frame.src = url;
  frame.onload = () => { frame.contentWindow?.print(); window.setTimeout(() => { URL.revokeObjectURL(url); frame.remove(); }, 60_000); };
  document.body.appendChild(frame);
}

export default function PriceListModal({ open, onClose, initialCatalog, onSave }: Props) {
  const [selected, setSelected] = useState<PriceListProduct[]>([]);
  const [config, setConfig] = useState<CatalogConfig>(defaultConfig);
  const [catalogName, setCatalogName] = useState("");
  const [status, setStatus] = useState<CatalogDraft["status"]>("borrador");
  const [segment, setSegment] = useState<CatalogSegment>("papeleria");
  const [generating, setGenerating] = useState(false);
  const [promotionImageTarget, setPromotionImageTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date());
  const qrRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!open) return;
    setIssuedAt(new Date());
    if (initialCatalog) {
      setCatalogName(initialCatalog.name); setStatus(initialCatalog.status); setSegment(initialCatalog.segment); setSelected(initialCatalog.products); setConfig(initialCatalog.config);
    } else {
      setCatalogName(""); setStatus("borrador"); setSegment("papeleria"); setSelected([]); setConfig(defaultConfig());
    }
  }, [open, initialCatalog, onSave]);
  if (!open) return null;

  const addProduct = (row: Record<string, unknown>) => {
    const product = normalizeProduct(row);
    if (!product) { setError("El producto no tiene nombre o precio válido."); return; }
    setError("");
    setSelected((items) => items.some((item) => String(item.id) === String(product.id)) ? items : [...items, product]);
  };
  const moveProduct = (index: number, direction: -1 | 1) => setSelected((items) => {
    const target = index + direction; if (target < 0 || target >= items.length) return items;
    const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const updatePromotion = (id: string, patch: Partial<CatalogPromotion>) => setConfig((current) => ({ ...current, promotions: current.promotions.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  const validatePromotionPrices = () => {
    const invalid = config.promotions.find((promotion) => Number.isFinite(promotion.previousPrice) && Number.isFinite(promotion.promotionalPrice) && Number(promotion.previousPrice) <= Number(promotion.promotionalPrice));
    if (invalid) throw new Error(`En “${invalid.name || "Promoción"}”, el precio anterior debe ser mayor que el promocional.`);
  };
  const attachPromotionImage = async (promotionId: string, file: File) => {
    try { validatePromotionImage(file); setGenerating(true); setError(""); const reference = await uploadPromotionImage(file); updatePromotion(promotionId, { imageTransferId:reference.id, imageName:reference.name, imageType:reference.type as CatalogPromotion["imageType"] }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la imagen promocional."); }
    finally { setGenerating(false); }
  };
  const attachTransferImage = (promotionId: string, reference: TransferenciaReference) => updatePromotion(promotionId, { imageTransferId:reference.id, imageName:reference.name, imageType:reference.type as CatalogPromotion["imageType"] });

  const buildPdf = async (products: PriceListProduct[]) => {
    validatePromotionPrices();
    const [backgroundData, logoData, pinkBrushData, lavenderBrushData] = await Promise.all([imageUrlToDataUrl(catalogBackground), imageUrlToDataUrl(logo), imageUrlToDataUrl(pinkBrush), imageUrlToDataUrl(lavenderBrush)]);
    const qrData = config.contact.qrUrl.trim() && qrRef.current ? await svgToPngDataUrl(qrRef.current) : undefined;
    const currentPrices = new Map(products.map((product) => [String(product.id), product.precio]));
    const currentPromotions = config.promotions.map((promotion) => promotion.productId && currentPrices.has(promotion.productId) ? { ...promotion, previousPrice:currentPrices.get(promotion.productId) } : promotion);
    const exportConfig = { ...config, promotions:await hydratePromotionImages(currentPromotions) };
    return createPriceListPdf(products, issuedAt, { backgroundData, logoData, pinkBrushData, lavenderBrushData, qrData }, exportConfig);
  };
  const generate = async (mode: "download" | "print") => {
    if (selected.length === 0 || generating) return;
    setGenerating(true); setError("");
    try {
      const refreshed = await fetchCurrentProductsByIds(selected.map((product) => product.id));
      if (refreshed.warnings.length) {
        const affected = refreshed.warnings.map((warning) => warning.productId).join(", ");
        throw new Error(`No se puede publicar: revisá los productos sin precio vigente o eliminados (${affected}).`);
      }
      const categories = new Map(selected.map((product) => [String(product.id), product.categoria]));
      const currentProducts = refreshed.products.map((product) => ({ ...product, categoria:categories.get(String(product.id)) || null }));
      setSelected(currentProducts);
      const doc = await buildPdf(currentProducts);
      if (mode === "download") doc.save(`PLIPSHOP_Lista_Precios_${issuedAt.toISOString().slice(0, 10)}.pdf`); else printPdf(doc);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo generar el catálogo."); }
    finally { setGenerating(false); }
  };
  const generateStatusImage = async () => {
    if (selected.length === 0 || generating) return;
    setGenerating(true); setError("");
    try {
      const refreshed = await fetchCurrentProductsByIds(selected.map((product) => product.id));
      if (refreshed.warnings.length) throw new Error(`No se puede publicar: revisá los productos sin precio vigente o eliminados (${refreshed.warnings.map((warning) => warning.productId).join(", ")}).`);
      const categories = new Map(selected.map((product) => [String(product.id), product.categoria]));
      const currentProducts = refreshed.products.map((product) => ({ ...product, categoria:categories.get(String(product.id)) || null }));
      setSelected(currentProducts);
      const [backgroundData, logoData, pinkBrushData, lavenderBrushData] = await Promise.all([imageUrlToDataUrl(catalogBackground), imageUrlToDataUrl(logo), imageUrlToDataUrl(pinkBrush), imageUrlToDataUrl(lavenderBrush)]);
      validatePromotionPrices();
      const currentPrices = new Map(currentProducts.map((product) => [String(product.id), product.precio]));
      const currentPromotions = config.promotions.map((promotion) => promotion.productId && currentPrices.has(promotion.productId) ? { ...promotion, previousPrice:currentPrices.get(promotion.productId) } : promotion);
      const exportConfig = { ...config, promotions:await hydratePromotionImages(currentPromotions) };
      const blobs = await createWhatsAppStatusImage(exportConfig, { backgroundData, logoData, pinkBrushData, lavenderBrushData }, issuedAt);
      blobs.forEach((blob, index) => { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `PLIPSHOP_Imagen_WhatsApp_${issuedAt.toISOString().slice(0, 10)}_${index + 1}.png`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo generar la imagen para WhatsApp."); }
    finally { setGenerating(false); }
  };
  const save = async () => {
    if (!onSave || generating) return;
    if (!catalogName.trim()) { setError("Asigná un nombre al catálogo antes de guardarlo."); return; }
    if (!selected.length) { setError("Seleccioná al menos un producto antes de guardar."); return; }
    setGenerating(true); setError("");
    try { validatePromotionPrices(); } catch (cause) { setGenerating(false); setError(cause instanceof Error ? cause.message : "Revisá los precios promocionales."); return; }
    try { await onSave({ id:initialCatalog?.id, name:catalogName.trim(), status, segment, products:selected, config }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el catálogo."); }
    finally { setGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-labelledby="catalog-title">
      <div className="flex max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <header className="flex items-center justify-between border-b px-5 py-3 dark:border-gray-700">
          <div><h2 id="catalog-title" className="flex items-center gap-2 text-lg font-semibold"><FileText size={20} /> {onSave ? "Editar catálogo" : "Generar catálogo PDF"}</h2><p className="text-xs text-gray-500">No modifica carrito, ventas, stock ni caja.</p></div>
          {onSave && <div className="flex flex-1 items-center gap-2 px-5"><input value={catalogName} onChange={(event) => setCatalogName(event.target.value)} placeholder="Nombre del catálogo" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><select value={segment} onChange={(event) => setSegment(event.target.value as CatalogSegment)} className="rounded-lg border px-2 py-2 text-sm"><option value="libreria">Librería</option><option value="impresiones">Impresiones</option><option value="papeleria">Papelería</option><option value="personalizados">Personalizados</option></select><select value={status} onChange={(event) => setStatus(event.target.value as CatalogDraft["status"])} className="rounded-lg border px-2 py-2 text-sm"><option value="borrador">Borrador</option><option value="activo">Activo</option><option value="archivado">Archivado</option></select></div>}
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[320px_minmax(380px,1fr)_340px]">
          <section className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium">Buscar por nombre o código</label>
              <SearchDropdown resources={resourcesProductos} placeholder="Nombre, SKU o código…" onSelect={(row) => addProduct(row)} renderResult={(row) => <span className="flex items-center justify-between gap-3"><span className="min-w-0"><strong className="block truncate">{row.nombre}</strong><small className="text-gray-500">Código: {row.sku || row.id}</small></span><strong className="whitespace-nowrap">{formatCurrency(Number(row.precio))}</strong></span>} />
            </div>
            <div className="rounded-lg border p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Promociones semanales</h3><button type="button" disabled={config.promotions.length >= 4} onClick={() => setConfig((current) => ({ ...current, promotions: [...current.promotions, emptyPromotion()] }))} className="flex items-center gap-1 rounded border px-2 py-1 text-xs disabled:opacity-40"><Plus size={13} /> Agregar</button></div>
              {config.promotions.length === 0 && <p className="text-xs text-gray-500">Puede quedar vacío. No se inventarán promociones.</p>}
              <div className="space-y-3">{config.promotions.map((promotion) => <div key={promotion.id} className="space-y-2 rounded border bg-gray-50 p-2 dark:bg-gray-800"><div className="flex gap-2"><input value={promotion.name} onChange={(event) => updatePromotion(promotion.id, { name: event.target.value })} placeholder="Nombre de promoción" className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" /><button type="button" onClick={() => setConfig((current) => ({ ...current, promotions: current.promotions.filter((item) => item.id !== promotion.id) }))} className="text-red-600" aria-label="Quitar promoción"><Trash2 size={16} /></button></div><div className="flex items-center gap-2">{promotion.imageTransferId ? <img src={catalogImageViewUrl(promotion.imageTransferId)} alt={promotion.imageName || promotion.name} className="h-16 w-20 rounded object-contain bg-white" /> : <div className="flex h-16 w-20 items-center justify-center rounded bg-white text-[10px] text-gray-400">Sin foto</div>}<div className="flex flex-wrap gap-1"><label className="cursor-pointer rounded border px-2 py-1 text-[11px]">{promotion.imageTransferId ? "Reemplazar" : "Subir foto"}<input type="file" accept={PROMOTION_IMAGE_TYPES.join(",")} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void attachPromotionImage(promotion.id, file); event.currentTarget.value = ""; }} /></label><button type="button" onClick={() => setPromotionImageTarget(promotion.id)} className="rounded border px-2 py-1 text-[11px]">Desde Transferencias</button>{promotion.imageTransferId && <button type="button" onClick={() => updatePromotion(promotion.id, { imageTransferId:undefined, imageName:undefined, imageType:undefined, imageData:undefined })} className="rounded border px-2 py-1 text-[11px] text-red-600">Eliminar foto</button>}</div></div><textarea value={promotion.description} onChange={(event) => updatePromotion(promotion.id, { description: event.target.value })} placeholder="Descripción breve" rows={2} className="w-full rounded border px-2 py-1 text-sm" /><div className="grid grid-cols-2 gap-2"><input type="number" value={promotion.promotionalPrice ?? ""} onChange={(event) => updatePromotion(promotion.id, { promotionalPrice: event.target.value ? Number(event.target.value) : undefined })} placeholder="Precio promo" className="rounded border px-2 py-1 text-sm" /><input type="number" value={promotion.previousPrice ?? ""} onChange={(event) => updatePromotion(promotion.id, { previousPrice: event.target.value ? Number(event.target.value) : undefined })} placeholder="Precio anterior" className="rounded border px-2 py-1 text-sm" /></div><details><summary className="cursor-pointer text-[11px] text-gray-500">Vigencia particular de esta promoción</summary><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[11px]">Inicio<input type="date" value={promotion.startDate || ""} onChange={(event) => updatePromotion(promotion.id, { startDate:event.target.value || undefined })} className="mt-1 w-full rounded border px-2 py-1 text-xs" /></label><label className="text-[11px]">Fin<input type="date" value={promotion.endDate || ""} onChange={(event) => updatePromotion(promotion.id, { endDate:event.target.value || undefined })} className="mt-1 w-full rounded border px-2 py-1 text-xs" /></label></div></details></div>)}</div>
            </div>
            <div className="space-y-2 rounded-lg border p-3 dark:border-gray-700"><label className="block text-xs font-medium">CTA general</label><textarea value={config.cta} onChange={(event) => setConfig((current) => ({ ...current, cta: event.target.value }))} rows={2} className="w-full rounded border px-2 py-1 text-sm" /><p className="text-xs text-gray-500">{config.validity}</p><details><summary className="cursor-pointer text-xs font-medium">Cambiar vigencia semanal manualmente</summary><input value={config.validity} onChange={(event) => setConfig((current) => ({ ...current, validity: event.target.value }))} placeholder="Ej.: Ofertas de la semana…" className="mt-2 w-full rounded border px-2 py-1 text-sm" /></details></div>
            <details className="rounded-lg border p-3 text-sm dark:border-gray-700"><summary className="cursor-pointer font-medium">Datos comerciales del catálogo</summary><div className="mt-3 grid gap-2"><input value={config.contact.phone} onChange={(event) => setConfig((current) => ({ ...current, contact: { ...current.contact, phone: event.target.value } }))} placeholder="Teléfono" className="rounded border px-2 py-1" /><input value={config.contact.whatsapp} onChange={(event) => setConfig((current) => ({ ...current, contact: { ...current.contact, whatsapp: event.target.value } }))} placeholder="WhatsApp" className="rounded border px-2 py-1" /><input value={config.contact.address} onChange={(event) => setConfig((current) => ({ ...current, contact: { ...current.contact, address: event.target.value } }))} placeholder="Dirección" className="rounded border px-2 py-1" /><input value={config.contact.qrUrl} onChange={(event) => setConfig((current) => ({ ...current, contact: { ...current.contact, qrUrl: event.target.value } }))} placeholder="URL verificada para QR" className="rounded border px-2 py-1" /><p className="text-xs text-amber-700">Sin URL verificada, el PDF reserva el espacio e indica “QR pendiente”.</p></div></details>
          </section>

          <section className="min-w-0 rounded-lg border dark:border-gray-700">
            <div className="flex items-center justify-between border-b px-3 py-2 dark:border-gray-700"><h3 className="text-sm font-semibold">Productos seleccionados</h3><span className="rounded-full bg-fuchsia-50 px-2 py-1 text-xs font-medium text-fuchsia-700">{selected.length}</span></div>
            <div className="max-h-[68vh] overflow-auto">{selected.length === 0 ? <p className="p-10 text-center text-sm text-gray-400">Buscá productos para armar el catálogo.</p> : <table className="w-full text-sm"><thead className="sticky top-0 bg-gray-50 text-xs dark:bg-gray-800"><tr><th className="p-2 text-left">Orden</th><th className="p-2 text-left">Código</th><th className="p-2 text-left">Producto</th><th className="p-2 text-left">Categoría</th><th className="p-2 text-right">Precio</th><th className="p-2"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{selected.map((product, index) => <tr key={String(product.id)} className="border-t dark:border-gray-800"><td className="p-2"><div className="flex"><button type="button" disabled={index === 0} onClick={() => moveProduct(index, -1)} className="p-1 disabled:opacity-20" aria-label={`Subir ${product.nombre}`}><ChevronUp size={15} /></button><button type="button" disabled={index === selected.length - 1} onClick={() => moveProduct(index, 1)} className="p-1 disabled:opacity-20" aria-label={`Bajar ${product.nombre}`}><ChevronDown size={15} /></button></div></td><td className="p-2 text-xs">{product.sku || product.id}</td><td className="p-2">{product.nombre}</td><td className="p-2"><input value={product.categoria || ""} onChange={(event) => setSelected((items) => items.map((item) => String(item.id) === String(product.id) ? { ...item, categoria: event.target.value } : item))} placeholder="Opcional" className="w-24 rounded border px-2 py-1 text-xs" /></td><td className="whitespace-nowrap p-2 text-right font-medium">{formatCurrency(product.precio)}</td><td className="p-2"><button type="button" onClick={() => setSelected((items) => items.filter((item) => String(item.id) !== String(product.id)))} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label={`Quitar ${product.nombre}`}><Trash2 size={16} /></button></td></tr>)}</tbody></table>}</div>
          </section>

          <section><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Eye size={16} /> Vista previa · Página 1</h3><div className="aspect-[210/297] overflow-hidden rounded-lg border bg-cover bg-center p-3 shadow-inner" style={{ backgroundImage: `url(${catalogBackground})` }}><div className="flex items-center gap-2"><img src={logo} alt="PLIP" className="h-8 w-8 object-contain" /><div className="flex-1 text-center"><strong className="text-[11px] text-fuchsia-950">CATÁLOGO SEMANAL</strong><p className="text-[6px]">{config.validity}</p></div></div>{config.promotions.some((item) => item.name) && <div className="relative mt-3 pt-4"><img src={pinkBrush} alt="" className="absolute inset-x-4 top-0 h-9 w-[calc(100%-2rem)] object-fill opacity-80" /><strong className="relative block text-center text-[7px] text-pink-700">PROMOCIONES SEMANALES</strong><div className="relative mt-3 grid grid-cols-3 gap-1">{config.promotions.filter((item) => item.name).slice(0, 3).map((item) => <div key={item.id} className="text-center text-[5px]"><b>{item.name}</b><p>{item.description}</p></div>)}</div></div>}<div className="relative mt-3 pt-4"><img src={lavenderBrush} alt="" className="absolute inset-x-4 top-0 h-9 w-[calc(100%-2rem)] object-fill opacity-80" /><strong className="relative block text-center text-[7px] text-purple-700">LISTA DE PRECIOS</strong><div className="relative mt-3">{selected.slice(0, config.promotions.some((item) => item.name) ? 8 : 14).map((item) => <div key={String(item.id)} className="flex justify-between gap-1 border-b border-pink-100 py-1 text-[5px]"><span className="truncate">{item.nombre}</span><b>{formatCurrency(item.precio)}</b></div>)}</div></div><div className="mt-4 text-center text-[8px] font-bold text-pink-600">{config.cta}</div><div className="mt-3 text-center text-[5px]"><b>WhatsApp {config.contact.whatsapp} · Tel. {config.contact.phone}</b><br />{config.contact.address}</div></div></section>
        </div>

        {error && <p className="mx-4 mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 dark:border-gray-700"><span className="text-sm text-gray-500">{selected.length === 0 ? "Seleccioná al menos un producto." : `${selected.length} producto${selected.length === 1 ? "" : "s"} listo${selected.length === 1 ? "" : "s"}.`}</span><div className="flex gap-2">{onSave && <button type="button" onClick={save} disabled={!selected.length || generating} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Guardar catálogo</button>}<button type="button" onClick={generateStatusImage} disabled={!selected.length || generating} className="flex items-center gap-2 rounded-lg border border-fuchsia-300 px-3 py-2 text-sm font-medium text-fuchsia-700 disabled:opacity-40"><ImageDown size={16} /> Imagen promocional WhatsApp</button><button type="button" onClick={() => generate("print")} disabled={!selected.length || generating} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40"><Printer size={16} /> Imprimir</button><button type="button" onClick={() => generate("download")} disabled={!selected.length || generating} className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><Download size={16} /> {generating ? "Generando…" : "Descargar PDF"}</button></div></footer>
      </div>
      {promotionImageTarget && <TransferenciasPicker accept={[...PROMOTION_IMAGE_TYPES]} onClose={() => setPromotionImageTarget(null)} onSelectReferences={async (files) => { const reference = files[0]; if (reference) attachTransferImage(promotionImageTarget, reference); setPromotionImageTarget(null); }} />}
      {config.contact.qrUrl.trim() && <div className="pointer-events-none absolute left-[-10000px]"><QRCodeSVG ref={qrRef} value={config.contact.qrUrl.trim()} size={256} bgColor="#ffffff" fgColor="#2f2335" includeMargin /></div>}
    </div>
  );
}
