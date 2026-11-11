import type { CatalogPromotion } from "../../components/print/priceListTypes";
import { downloadCatalogImage, uploadCatalogImage, type CatalogTransferReference } from "./transferenciasAdapter";

export const PROMOTION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 8 * 1024 * 1024;

export function validatePromotionImage(file: File) {
  if (!PROMOTION_IMAGE_TYPES.includes(file.type as typeof PROMOTION_IMAGE_TYPES[number])) throw new Error("La imagen debe ser JPG, PNG o WebP.");
  if (file.size > MAX_BYTES) throw new Error("La imagen no puede superar 8 MB.");
}

export async function uploadPromotionImage(file: File): Promise<CatalogTransferReference> {
  validatePromotionImage(file);
  return await uploadCatalogImage(file);
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("No se pudo leer la imagen promocional.")); reader.readAsDataURL(blob);
});

const imageSize = (src: string) => new Promise<{ width:number; height:number }>((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve({ width:image.naturalWidth, height:image.naturalHeight }); image.onerror = () => reject(new Error("La imagen promocional no es válida.")); image.src = src;
});

export async function hydratePromotionImages(promotions: CatalogPromotion[]) {
  return await Promise.all(promotions.map(async (promotion) => {
    if (!promotion.imageTransferId) return promotion;
    const imageData = await blobToDataUrl(await downloadCatalogImage({ id:promotion.imageTransferId, name:promotion.imageName || promotion.name }));
    const size = await imageSize(imageData);
    return { ...promotion, imageData, imageWidth:size.width, imageHeight:size.height };
  }));
}
