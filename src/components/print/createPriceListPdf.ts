import { jsPDF } from "jspdf";
import { BUSINESS_INFO } from "./businessInfo";
import type { CatalogAssets, CatalogConfig, CatalogPromotion, PriceListProduct } from "./priceListTypes";

const PINK = [225, 82, 157] as const;
const LILAC = [142, 91, 190] as const;
const INK = [66, 45, 74] as const;
const formatArs = (amount: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(amount);

function drawPageBase(doc: jsPDF, assets: CatalogAssets, issuedAt: Date, config: CatalogConfig) {
  doc.addImage(assets.backgroundData, "PNG", 0, 0, 210, 297, "catalog-background", "FAST");
  doc.addImage(assets.logoData, "PNG", 15, 10, 25, 25, "plip-logo", "FAST");
  doc.setTextColor(...INK); doc.setFont("times", "bold"); doc.setFontSize(22);
  doc.text("CATÁLOGO DE PRODUCTOS", 105, 18, { align: "center" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text(BUSINESS_INFO.name, 105, 24, { align: "center" });
  doc.text(`Emisión: ${issuedAt.toLocaleDateString("es-AR")}`, 195, 13, { align: "right" });
  if (config.validity.trim()) { doc.setFontSize(8.5); doc.text(config.validity.trim(), 105, 30, { align: "center" }); }
}

function drawHeart(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(...PINK);
  doc.path([
    { op:"m", c:[x, y + size] },
    { op:"c", c:[x - size * 1.5, y, x - size, y - size, x, y - size * 0.25] },
    { op:"c", c:[x + size, y - size, x + size * 1.5, y, x, y + size] },
  ], "F");
}

function drawFooter(doc: jsPDF, assets: CatalogAssets, config: CatalogConfig) {
  const center = assets.qrData ? 98 : 105;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
  const whatsapp = `WhatsApp ${config.contact.whatsapp || "Sin configurar"}`;
  const phone = `Teléfono ${config.contact.phone || "Sin configurar"}`;
  const gap = 12; const total = doc.getTextWidth(whatsapp) + doc.getTextWidth(phone) + gap;
  let cursor = center - total / 2;
  doc.setFillColor(...PINK); doc.circle(cursor - 3, 267.3, 2.1, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(5.5); doc.text("W", cursor - 3, 268, { align:"center" });
  doc.setTextColor(...INK); doc.setFontSize(8.5); doc.text(whatsapp, cursor, 269); cursor += doc.getTextWidth(whatsapp) + gap;
  doc.setFillColor(...LILAC); doc.circle(cursor - 3, 267.3, 2.1, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(5.5); doc.text("T", cursor - 3, 268, { align:"center" });
  doc.setTextColor(...INK); doc.setFontSize(8.5); doc.text(phone, cursor, 269);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.2); doc.setTextColor(...INK);
  doc.text(`Dirección · ${config.contact.address || "Sin configurar"}`, center, 276, { align:"center", maxWidth:assets.qrData ? 150 : 180 });
  if (assets.qrData) {
    doc.addImage(assets.qrData, "PNG", 178, 262, 17, 17, "catalog-qr", "FAST");
  }
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number, color: readonly [number, number, number]) {
  doc.setTextColor(...color); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(title, x, y, { align:"center" });
}

function drawPromotion(doc: jsPDF, promotion: CatalogPromotion, x: number, y: number, width: number) {
  let nextY = y;
  if (promotion.imageData && promotion.imageWidth && promotion.imageHeight) {
    const boxWidth = Math.min(width, 48); const boxHeight = 27; const scale = Math.min(boxWidth / promotion.imageWidth, boxHeight / promotion.imageHeight);
    const imageWidth = promotion.imageWidth * scale; const imageHeight = promotion.imageHeight * scale;
    const format = promotion.imageType === "image/jpeg" ? "JPEG" : promotion.imageType === "image/webp" ? "WEBP" : "PNG";
    doc.addImage(promotion.imageData, format, x + (width - imageWidth) / 2, nextY, imageWidth, imageHeight, `promo-${promotion.id}`, "FAST"); nextY += boxHeight + 3;
  }
  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  const nameLines = doc.splitTextToSize(promotion.name || "Promoción", width) as string[]; doc.text(nameLines, x + width / 2, nextY, { align:"center" });
  nextY += nameLines.length * 5;
  if (promotion.description.trim()) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    const description = doc.splitTextToSize(promotion.description.trim(), width) as string[]; doc.text(description, x + width / 2, nextY, { align:"center" }); nextY += description.length * 4.2;
  }
  if (Number.isFinite(promotion.promotionalPrice)) {
    doc.setTextColor(...PINK); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(formatArs(Number(promotion.promotionalPrice)), x + width / 2, nextY + 2, { align:"center" });
    if (Number.isFinite(promotion.previousPrice)) {
      doc.setTextColor(125, 120, 128); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`Antes: ${formatArs(Number(promotion.previousPrice))}`, x + width / 2, nextY + 7, { align:"center" });
    }
    nextY += 10;
  }
  return nextY;
}

function isPromotionActive(promotion: CatalogPromotion, issuedAt: Date) {
  const day = issuedAt.toISOString().slice(0, 10);
  return (!promotion.startDate || promotion.startDate <= day) && (!promotion.endDate || promotion.endDate >= day);
}

function drawPromotions(doc: jsPDF, config: CatalogConfig, issuedAt: Date) {
  const active = config.promotions.filter((item) => item.name.trim() && isPromotionActive(item, issuedAt)).slice(0, 3);
  if (active.length === 0) return null;
  let bottom = 60;
  active.forEach((promotion, index) => {
    const width = active.length === 1 ? 120 : active.length === 2 ? 76 : 52;
    const gap = active.length === 3 ? 7 : 12;
    const total = width * active.length + gap * (active.length - 1);
    const x = (210 - total) / 2 + index * (width + gap);
    bottom = Math.max(bottom, drawPromotion(doc, promotion, x, 58, width));
  });
  return bottom;
}

interface ListArea { x: number; y: number; width: number; limit: number; }

function drawFirstPage(doc: jsPDF, assets: CatalogAssets, config: CatalogConfig, issuedAt: Date): ListArea {
  drawPageBase(doc, assets, issuedAt, config);
  const promotionBottom = drawPromotions(doc, config, issuedAt);
  let listBrushY = 35.5;
  if (promotionBottom != null) {
    doc.addImage(assets.pinkBrushData, "PNG", 43, 35.5, 124, 22, "watercolor-pink", "FAST");
    drawSectionTitle(doc, "PROMOCIONES SEMANALES", 105, 48, PINK);
    listBrushY = Math.max(92, promotionBottom + 4);
  }
  doc.addImage(assets.lavenderBrushData, "PNG", 43, listBrushY, 124, 22, "watercolor-lavender", "FAST");
  drawSectionTitle(doc, "LISTA DE PRECIOS", 105, listBrushY + 12.5, LILAC);
  doc.setTextColor(...PINK); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
  const rawCta = config.cta.trim() || "¿Qué necesitás esta semana? Escribinos y te ayudamos a armar tu pedido 💗";
  const hasHeart = rawCta.includes("💗"); const ctaText = rawCta.replace(/\s*💗/gu, "");
  const ctaLines = doc.splitTextToSize(ctaText, 174) as string[];
  doc.text(ctaLines, 105, 247 - (ctaLines.length - 1) * 2.5, { align: "center", lineHeightFactor:1.15 });
  if (hasHeart) drawHeart(doc, 105, 255, 1.8);
  drawFooter(doc, assets, config);
  return { x: 16, y:listBrushY + 24, width:178, limit:238 };
}

function drawContinuationPage(doc: jsPDF, assets: CatalogAssets, config: CatalogConfig, issuedAt: Date): ListArea {
  doc.addPage("a4", "portrait"); drawPageBase(doc, assets, issuedAt, config);
  doc.addImage(assets.lavenderBrushData, "PNG", 35, 35.5, 140, 22, "watercolor-lavender", "FAST");
  drawSectionTitle(doc, "LISTA DE PRECIOS — CONTINUACIÓN", 105, 48, LILAC); drawFooter(doc, assets, config);
  return { x: 16, y: 60, width: 178, limit: 252 };
}

function productRowHeight(doc: jsPDF, product: PriceListProduct, nameWidth: number) {
  const lines = doc.splitTextToSize(product.nombre, nameWidth) as string[];
  return { lines, height: Math.max(9, lines.length * 5 + 3) };
}

export function createPriceListPdf(products: PriceListProduct[], issuedAt: Date, assets: CatalogAssets, config: CatalogConfig) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let area = drawFirstPage(doc, assets, config, issuedAt); let y = area.y; let currentCategory = "";
  products.forEach((product) => {
    const category = product.categoria?.trim() || "";
    const categoryHeight = category && category !== currentCategory ? 8 : 0;
    let row = productRowHeight(doc, product, area.width - 45);
    if (y + categoryHeight + row.height > area.limit) {
      area = drawContinuationPage(doc, assets, config, issuedAt); y = area.y; if (category) currentCategory = ""; row = productRowHeight(doc, product, area.width - 45);
    }
    if (category && category !== currentCategory) {
      doc.setFillColor(249, 232, 245); doc.roundedRect(area.x, y, area.width, 5.5, 1.5, 1.5, "F");
      doc.setTextColor(...LILAC); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(category.toUpperCase(), area.x + 2, y + 4.8);
      y += 8; currentCategory = category;
    }
    doc.setTextColor(...INK); doc.setFont("helvetica", "normal"); doc.setFontSize(12.5); doc.text(row.lines, area.x + 2, y + 5.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14.5); doc.text(formatArs(product.precio), area.x + area.width - 2, y + 5.7, { align: "right" });
    doc.setDrawColor(238, 214, 232); doc.line(area.x + 2, y + row.height, area.x + area.width - 2, y + row.height); y += row.height;
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page); doc.setTextColor(115, 100, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(`Página ${page} de ${pages}`, 196, 291, { align: "right" }); doc.text("Precios expresados en pesos argentinos (ARS).", 14, 291);
  }
  return doc;
}
