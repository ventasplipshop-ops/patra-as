import type { CatalogAssets, CatalogConfig, CatalogPromotion } from "./priceListTypes";

const formatArs = (amount: number) => new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:2 }).format(amount);

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("No se pudo cargar un recurso del estado de WhatsApp.")); image.src = src;
});

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale; const drawHeight = image.height * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) { lines.push(line); line = word; } else line = candidate;
  });
  if (line) lines.push(line); return lines;
}

function activePromotions(promotions: CatalogPromotion[], date: Date) {
  const day = date.toISOString().slice(0, 10);
  return promotions.filter((promotion) => promotion.name.trim() && (!promotion.startDate || promotion.startDate <= day) && (!promotion.endDate || promotion.endDate >= day));
}

export async function createWhatsAppStatusImage(config: CatalogConfig, assets: CatalogAssets, issuedAt: Date) {
  const [background, logo, pinkBrush] = await Promise.all([loadImage(assets.backgroundData), loadImage(assets.logoData), loadImage(assets.pinkBrushData)]);
  const promotions = activePromotions(config.promotions, issuedAt);
  const groups = promotions.length ? Array.from({ length:Math.ceil(promotions.length / 3) }, (_, index) => promotions.slice(index * 3, index * 3 + 3)) : [[]];
  return await Promise.all(groups.map(async (group) => {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
    const context = canvas.getContext("2d"); if (!context) throw new Error("No se pudo crear la imagen para WhatsApp.");
    drawCover(context, background, canvas.width, canvas.height);
    context.drawImage(logo, 55, 45, 110, 110);
    context.fillStyle = "#432d4a"; context.textAlign = "center"; context.font = "700 52px Georgia, serif"; context.fillText("CATÁLOGO SEMANAL", 610, 105);
    context.font = "500 27px Arial, sans-serif"; context.fillText(config.validity, 610, 150);
    if (group.length) {
      context.drawImage(pinkBrush, 150, 165, 780, 165); context.fillStyle = "#d9368d"; context.font = "700 36px Arial, sans-serif"; context.fillText("PROMOCIONES SEMANALES", 540, 260);
      const promoImages = await Promise.all(group.map((promotion) => promotion.imageData ? loadImage(promotion.imageData) : null));
      const width = 310; const gap = 30; const total = width * group.length + gap * (group.length - 1); const start = (1080 - total) / 2;
      group.forEach((promotion, index) => {
        const center = start + index * (width + gap) + width / 2; const image = promoImages[index];
        if (image) { const scale = Math.min(280 / image.width, 190 / image.height); const w = image.width * scale; const h = image.height * scale; context.drawImage(image, center - w / 2, 335 + (190 - h) / 2, w, h); }
        context.fillStyle = "#432d4a"; context.font = "700 32px Arial, sans-serif"; wrap(context, promotion.name, 300).slice(0, 2).forEach((line, lineIndex) => context.fillText(line, center, 570 + lineIndex * 38));
        if (promotion.description.trim()) { context.font = "400 23px Arial, sans-serif"; wrap(context, promotion.description.trim(), 290).slice(0, 2).forEach((line, lineIndex) => context.fillText(line, center, 650 + lineIndex * 29)); }
        if (Number.isFinite(promotion.promotionalPrice)) { context.fillStyle = "#df4096"; context.font = "700 40px Arial, sans-serif"; context.fillText(formatArs(Number(promotion.promotionalPrice)), center, 745); }
      });
    }
    context.fillStyle = "#df4096"; context.font = "700 40px Arial, sans-serif"; wrap(context, config.cta, 900).slice(0, 3).forEach((line, index) => context.fillText(line, 540, 970 + index * 50));
    context.fillStyle = "#432d4a"; context.font = "700 27px Arial, sans-serif"; context.fillText(`WhatsApp ${config.contact.whatsapp}`, 540, 1210);
    context.font = "400 24px Arial, sans-serif"; context.fillText(config.contact.address, 540, 1252);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo exportar la imagen para WhatsApp.")), "image/png", 1));
  }));
}
