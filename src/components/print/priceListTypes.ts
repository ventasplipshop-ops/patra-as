export interface PriceListProduct {
  id: string | number;
  sku?: string | number | null;
  nombre: string;
  precio: number;
  categoria?: string | null;
}

export interface CatalogPromotion {
  id: string;
  productId?: string;
  name: string;
  description: string;
  promotionalPrice?: number;
  previousPrice?: number;
  startDate?: string;
  endDate?: string;
  imageTransferId?: string;
  imageName?: string;
  imageType?: "image/jpeg" | "image/png" | "image/webp";
  imageData?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface CatalogContact {
  phone: string;
  whatsapp: string;
  address: string;
  qrUrl: string;
}

export interface CatalogConfig {
  cta: string;
  validity: string;
  promotions: CatalogPromotion[];
  contact: CatalogContact;
}

export type CatalogSegment = "libreria" | "impresiones" | "papeleria" | "personalizados";

export function getWeeklyValidity(date = new Date()) {
  const start = new Date(date); const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const month = new Intl.DateTimeFormat("es-AR", { month:"long" }).format(end);
  const startMonth = new Intl.DateTimeFormat("es-AR", { month:"long" }).format(start);
  const range = startMonth === month ? `${start.getDate()} al ${end.getDate()} de ${month}` : `${start.getDate()} de ${startMonth} al ${end.getDate()} de ${month}`;
  return `Ofertas de la semana · ${range}`;
}

export interface CatalogAssets {
  backgroundData: string;
  logoData: string;
  pinkBrushData: string;
  lavenderBrushData: string;
  qrData?: string;
}

export interface CatalogProductReference {
  productId: string;
  position: number;
  category?: string | null;
}

export interface CatalogDraft {
  id?: string;
  name: string;
  status: "borrador" | "activo" | "archivado";
  segment: CatalogSegment;
  products: PriceListProduct[];
  config: CatalogConfig;
}

export interface CatalogSummary {
  id: string;
  name: string;
  status: CatalogDraft["status"];
  segment: CatalogSegment;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogWarning {
  productId: string;
  reason: "missing" | "invalid_price";
}

export interface HydratedCatalog extends CatalogDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  warnings: CatalogWarning[];
}
