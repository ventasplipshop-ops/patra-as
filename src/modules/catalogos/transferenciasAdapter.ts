export type CatalogTransferReference = {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
};

const ENDPOINT = "/api/transferencias";

function isJson(response: Response) {
  return (response.headers.get("content-type") || "").toLowerCase().includes("application/json");
}

async function responseMessage(response: Response) {
  if (isJson(response)) {
    const value = await response.json().catch(() => null) as { error?: unknown } | null;
    if (typeof value?.error === "string" && value.error.trim()) return value.error;
  } else {
    const body = await response.text().catch(() => "");
    if (/<!doctype|<html/i.test(body)) {
      return "Transferencias respondió con una página HTML. Verificá que PLIP esté conectado al servidor de archivos.";
    }
  }
  return `Transferencias no pudo completar la operación (HTTP ${response.status}).`;
}

function validReference(value: unknown): value is CatalogTransferReference {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<CatalogTransferReference>;
  return typeof file.id === "string" && /^[\da-f-]{36}$/i.test(file.id)
    && typeof file.name === "string" && typeof file.type === "string" && typeof file.uploadedAt === "string";
}

export async function uploadCatalogImage(file: File) {
  const body = new FormData(); body.append("file", file, file.name);
  const response = await fetch(ENDPOINT, { method:"POST", body });
  if (!response.ok) throw new Error(await responseMessage(response));
  if (!isJson(response)) throw new Error(await responseMessage(response));
  const result = await response.json().catch(() => null);
  if (!validReference(result)) throw new Error("Transferencias guardó la imagen, pero devolvió una referencia inválida.");
  return result;
}

export async function downloadCatalogImage(reference: Pick<CatalogTransferReference, "id" | "name">) {
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(reference.id)}/download`, { cache:"no-store" });
  if (!response.ok) throw new Error(`${await responseMessage(response)} Imagen: “${reference.name}”.`);
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) throw new Error(`Transferencias devolvió HTML al recuperar “${reference.name}”.`);
  return await response.blob();
}

export const catalogImageViewUrl = (id: string) => `${ENDPOINT}/${encodeURIComponent(id)}/view`;
